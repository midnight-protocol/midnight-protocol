import { ActionContext, ActionResponse } from '../types.ts';

export default async function getMatchInsights(context: ActionContext): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { matchId } = params;

  const { data: match, error } = await supabase
    .from('omniscient_matches')
    .select(`
      *,
      user_a:users!user_a_id(id, handle),
      user_b:users!user_b_id(id, handle),
      insights:omniscient_match_insights(
        relevance_score,
        insight:omniscient_insights(*)
      )
    `)
    .eq('id', matchId)
    .single();

  if (error) throw new Error(`Failed to fetch match insights: ${error.message}`);

  return {
    success: true,
    data: { match }
  };
}