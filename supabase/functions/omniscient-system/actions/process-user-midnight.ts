import { ActionContext, ActionResponse } from '../types.ts';

export default async function processUserMidnight(context: ActionContext): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { userId } = params;

  let query = supabase
    .from('omniscient_matches')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString());

  if (userId) {
    query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  }

  const { data: scheduledMatches, error } = await query;

  if (error) throw new Error(`Failed to fetch scheduled matches: ${error.message}`);

  const activatedMatches = [];
  for (const match of scheduledMatches) {
    try {
      // Update match to active
      await supabase
        .from('omniscient_matches')
        .update({ status: 'active' })
        .eq('id', match.id);

      // Trigger conversation execution (in real implementation, this might be queued)
      console.log(`Activating conversation for match ${match.id}`);
      activatedMatches.push(match);
    } catch (error) {
      console.error(`Error activating match ${match.id}:`, error);
    }
  }

  return {
    success: true,
    summary: {
      scheduledMatches: scheduledMatches.length,
      activatedMatches: activatedMatches.length
    },
    data: activatedMatches
  };
}