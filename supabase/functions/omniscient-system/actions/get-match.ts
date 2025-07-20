import { ActionContext, ActionResponse } from "../types.ts";

export default async function getMatch(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { matchId } = params;

  if (!matchId) {
    throw new Error("matchId is required");
  }

  console.log(`🎯 Fetching single match: ${matchId}`);

  const { data: match, error } = await supabase
    .from("omniscient_matches")
    .select(`
      *,
      user_a:users!user_a_id(id, handle),
      user_b:users!user_b_id(id, handle),
      insights:omniscient_match_insights(
        id,
        relevance_score,
        insight:omniscient_insights(*)
      )
    `)
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("Error fetching match:", error);
    throw new Error(`Failed to fetch match: ${error.message}`);
  }

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  console.log(`✅ Successfully fetched match ${matchId}`);

  return {
    success: true,
    data: match,
    summary: {
      matchId,
      status: match.status,
      opportunityScore: match.opportunity_score,
      predictedOutcome: match.predicted_outcome,
      insightCount: match.insights?.length || 0
    }
  };
}