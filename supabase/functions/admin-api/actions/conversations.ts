import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ConversationFilters, AdminUser } from '../../_shared/types.ts'

export async function getConversations(
  supabase: SupabaseClient,
  params: ConversationFilters,
  user?: AdminUser
) {
  const { 
    userId,
    status,
    dateRange,
    limit = 50,
    offset = 0
  } = params

  let query = supabase
    .from('agent_conversations')
    .select(`
      *,
      user1:users!agent_conversations_user1_id_fkey(id, handle, email),
      user2:users!agent_conversations_user2_id_fkey(id, handle, email)
    `)

  // Apply filters
  if (userId) {
    query = query.or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (dateRange) {
    const now = new Date()
    let startDate: Date
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        startDate = new Date(0)
    }
    
    query = query.gte('created_at', startDate.toISOString())
  }

  // Order by created_at descending
  query = query.order('created_at', { ascending: false })

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to get conversations: ${error.message}`)
  }

  return {
    conversations: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit
  }
}

export async function getConversationDetails(
  supabase: SupabaseClient,
  params: { conversationId: string },
  user?: AdminUser
) {
  const { conversationId } = params

  // Get conversation with turns
  const { data: conversation, error: convError } = await supabase
    .from('agent_conversations')
    .select(`
      *,
      user1:users!agent_conversations_user1_id_fkey(id, handle, email),
      user2:users!agent_conversations_user2_id_fkey(id, handle, email),
      conversation_turns(
        id,
        user_id,
        message,
        created_at
      )
    `)
    .eq('id', conversationId)
    .single()

  if (convError) {
    throw new Error(`Failed to get conversation details: ${convError.message}`)
  }

  // Get introduction request if exists
  const { data: introRequest } = await supabase
    .from('introduction_requests')
    .select('*')
    .eq('conversation_id', conversationId)
    .single()

  return {
    ...conversation,
    introduction_request: introRequest
  }
}

export async function exportConversations(
  supabase: SupabaseClient,
  params: ConversationFilters & { format: 'csv' | 'json' },
  user?: AdminUser
) {
  const { format, ...filters } = params

  // Get all conversations without pagination for export
  const conversationsData = await getConversations(supabase, {
    ...filters,
    limit: 10000,
    offset: 0
  }, user)

  if (format === 'json') {
    return conversationsData.conversations
  }

  // Convert to CSV
  if (conversationsData.conversations.length === 0) {
    return 'No conversations found'
  }

  const headers = [
    'ID',
    'User 1',
    'User 2',
    'Status',
    'Scheduled For',
    'Started At',
    'Completed At',
    'Created At'
  ].join(',')

  const rows = conversationsData.conversations.map(conv => [
    conv.id,
    `${conv.user1.handle} (${conv.user1.email})`,
    `${conv.user2.handle} (${conv.user2.email})`,
    conv.status,
    conv.scheduled_for || '',
    conv.started_at || '',
    conv.completed_at || '',
    conv.created_at
  ].map(val => `"${val}"`).join(','))

  return [headers, ...rows].join('\n')
}