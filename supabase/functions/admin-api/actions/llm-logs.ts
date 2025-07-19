import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { AdminUser } from '../../_shared/types.ts'

export interface LLMLogFilters {
  model?: string;
  status?: 'started' | 'completed' | 'failed';
  methodType?: 'chat_completion' | 'stream_completion';
  edgeFunction?: string;
  userId?: string;
  dateRange?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export async function getLLMLogs(
  supabase: SupabaseClient,
  params: LLMLogFilters,
  user?: AdminUser
) {
  const { 
    limit = 50, 
    offset = 0, 
    model,
    status,
    methodType,
    edgeFunction,
    userId,
    dateRange,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params

  let query = supabase
    .from('llm_call_logs')
    .select(`
      id,
      request_id,
      model,
      method_type,
      status,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      cost_usd,
      response_time_ms,
      edge_function,
      user_id,
      error_message,
      http_status_code,
      created_at,
      started_at,
      completed_at,
      users!llm_call_logs_user_id_fkey(handle)
    `, { count: 'exact' })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (model) {
    query = query.eq('model', model)
  }
  
  if (status) {
    query = query.eq('status', status)
  }
  
  if (methodType) {
    query = query.eq('method_type', methodType)
  }
  
  if (edgeFunction) {
    query = query.eq('edge_function', edgeFunction)
  }
  
  if (userId) {
    query = query.eq('user_id', userId)
  }
  
  if (dateRange) {
    const [start, end] = dateRange.split(',')
    if (start) query = query.gte('created_at', start)
    if (end) query = query.lte('created_at', end)
  }
  
  if (search) {
    query = query.or(`model.ilike.%${search}%,edge_function.ilike.%${search}%,error_message.ilike.%${search}%`)
  }

  // Apply sorting
  const ascending = sortOrder === 'asc'
  query = query.order(sortBy, { ascending })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to get LLM logs: ${error.message}`)
  }

  return {
    logs: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit
  }
}

export async function getLLMLogDetails(
  supabase: SupabaseClient,
  params: { logId: string },
  user?: AdminUser
) {
  const { logId } = params

  const { data, error } = await supabase
    .from('llm_call_logs')
    .select(`
      *,
      users!llm_call_logs_user_id_fkey(handle, id)
    `)
    .eq('id', logId)
    .single()

  if (error) {
    throw new Error(`Failed to get LLM log details: ${error.message}`)
  }

  return data
}

export async function getLLMLogStats(
  supabase: SupabaseClient,
  params: { dateRange?: string } = {},
  user?: AdminUser
) {
  const { dateRange } = params

  let query = supabase
    .from('llm_call_logs')
    .select('*')

  if (dateRange) {
    const [start, end] = dateRange.split(',')
    if (start) query = query.gte('created_at', start)
    if (end) query = query.lte('created_at', end)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get LLM log stats: ${error.message}`)
  }

  const logs = data || []
  
  // Calculate statistics
  const totalCalls = logs.length
  const completedCalls = logs.filter(log => log.status === 'completed')
  const failedCalls = logs.filter(log => log.status === 'failed')
  
  const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0)
  const totalTokens = logs.reduce((sum, log) => sum + (log.total_tokens || 0), 0)
  
  const responseTimes = completedCalls
    .map(log => log.response_time_ms)
    .filter(time => time !== null && time !== undefined)
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0
  
  const successRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0

  // Model breakdown
  const modelBreakdown: Record<string, number> = {}
  logs.forEach(log => {
    modelBreakdown[log.model] = (modelBreakdown[log.model] || 0) + 1
  })

  // Cost breakdown by model
  const costBreakdown: Record<string, number> = {}
  logs.forEach(log => {
    if (log.cost_usd) {
      costBreakdown[log.model] = (costBreakdown[log.model] || 0) + log.cost_usd
    }
  })

  return {
    totalCalls,
    completedCalls: completedCalls.length,
    failedCalls: failedCalls.length,
    totalCost: Number(totalCost.toFixed(4)),
    totalTokens,
    avgResponseTime: Math.round(avgResponseTime),
    successRate: Number(successRate.toFixed(2)),
    modelBreakdown,
    costBreakdown
  }
}

export async function exportLLMLogs(
  supabase: SupabaseClient,
  params: LLMLogFilters & { format?: 'csv' | 'json' },
  user?: AdminUser
) {
  const { format = 'json', ...filters } = params

  // Get all logs matching the filters (no pagination for export)
  const { logs } = await getLLMLogs(supabase, { ...filters, limit: 10000, offset: 0 }, user)

  if (format === 'csv') {
    // Convert to CSV format
    if (logs.length === 0) {
      return { data: 'No data to export', filename: 'llm_logs_empty.csv' }
    }

    const headers = [
      'ID', 'Request ID', 'Model', 'Method Type', 'Status', 
      'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 
      'Cost USD', 'Response Time MS', 'Edge Function', 
      'User Handle', 'Error Message', 'Created At'
    ].join(',')

    const rows = logs.map(log => [
      log.id,
      log.request_id || '',
      log.model,
      log.method_type,
      log.status,
      log.prompt_tokens || 0,
      log.completion_tokens || 0,
      log.total_tokens || 0,
      log.cost_usd || 0,
      log.response_time_ms || 0,
      log.edge_function || '',
      log.users?.handle || '',
      (log.error_message || '').replace(/"/g, '""'),
      log.created_at
    ].map(field => `"${field}"`).join(','))

    const csv = [headers, ...rows].join('\n')
    
    return {
      data: csv,
      filename: `llm_logs_${new Date().toISOString().split('T')[0]}.csv`
    }
  }

  // JSON format
  return {
    data: JSON.stringify(logs, null, 2),
    filename: `llm_logs_${new Date().toISOString().split('T')[0]}.json`
  }
}