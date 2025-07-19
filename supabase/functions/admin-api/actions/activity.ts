import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ActivityLog, AdminUser } from '../../_shared/types.ts'

export async function logActivity(
  supabase: SupabaseClient,
  log: ActivityLog
): Promise<void> {
  const { error } = await supabase
    .from('admin_activity_logs')
    .insert(log)

  if (error) {
    console.error('Failed to log admin activity:', error)
  }
}

export async function getActivityLogs(
  supabase: SupabaseClient,
  params: { limit?: number; offset?: number; adminId?: string },
  user?: AdminUser
) {
  const { limit = 50, offset = 0, adminId } = params

  let query = supabase
    .from('admin_activity_logs')
    .select(`
      *,
      admin_user:users!admin_activity_logs_admin_user_id_fkey(handle)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (adminId) {
    query = query.eq('admin_user_id', adminId)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to get activity logs: ${error.message}`)
  }

  return {
    logs: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit
  }
}

export async function exportActivityLogs(
  supabase: SupabaseClient,
  params: { dateRange?: { start: Date; end: Date } },
  user?: AdminUser
) {
  let query = supabase
    .from('admin_activity_logs')
    .select(`
      *,
      admin_user:users!admin_activity_logs_admin_user_id_fkey(handle)
    `)
    .order('created_at', { ascending: false })
    .limit(10000)

  if (params?.dateRange) {
    query = query
      .gte('created_at', params.dateRange.start.toISOString())
      .lte('created_at', params.dateRange.end.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to export activity logs: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return 'No activity logs found'
  }

  // Convert to CSV
  const headers = [
    'Timestamp',
    'Admin',
    'Action',
    'Target Type',
    'Target ID',
    'Details',
    'IP Address',
    'User Agent'
  ].join(',')

  const rows = data.map(log => [
    log.created_at,
    log.admin_user.handle,
    log.action,
    log.target_type,
    log.target_id || '',
    JSON.stringify(log.details || {}),
    log.ip_address || '',
    log.user_agent || ''
  ].map(val => `"${val}"`).join(','))

  return [headers, ...rows].join('\n')
}