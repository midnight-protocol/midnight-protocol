import { ActionContext, ActionResponse } from '../types.ts';

export default async function getSystemHealth(context: ActionContext): Promise<ActionResponse> {
  const { supabase } = context;

  const { data: recentLogs } = await supabase
    .from('omniscient_processing_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const totalLogs = recentLogs?.length || 0;
  const failedLogs = recentLogs?.filter(log => log.status === 'failed').length || 0;
  const errorRate = totalLogs > 0 ? failedLogs / totalLogs : 0;

  const { data: pendingMatches } = await supabase
    .from('omniscient_matches')
    .select('id')
    .eq('status', 'pending_analysis');

  const { data: activeConversations } = await supabase
    .from('omniscient_conversations')
    .select('id')
    .eq('status', 'active');

  return {
    success: true,
    data: {
      processingBacklog: pendingMatches?.length || 0,
      activeConversations: activeConversations?.length || 0,
      errorRate,
      recentErrors: recentLogs?.filter(log => log.status === 'failed').slice(0, 5) || [],
      uptime: '99.5%' // Placeholder
    }
  };
}