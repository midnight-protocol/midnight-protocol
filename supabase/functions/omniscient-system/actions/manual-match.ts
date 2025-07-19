import { ActionContext, ActionResponse } from "../types.ts";
import {
  performOmniscientAnalysis,
  storeInsights,
} from "../omniscientAnalysis.ts";

export default async function manualMatch(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, openRouterApiKey, params } = context;
  const { userIdA, userIdB } = params;

  // Fetch users
  const { data: users } = await supabase
    .from("users")
    .select(
      `
      id, handle,
      personal_stories(*),
      agent_profiles(*)
    `
    )
    .in("id", [userIdA, userIdB]);

  if (!users || users.length !== 2) {
    throw new Error("Failed to fetch both users");
  }

  const [userA, userB] = users;
  const analysis = await performOmniscientAnalysis(
    userA,
    userB,
    supabase
  );

  // Create match
  const { data: match } = await supabase
    .from("omniscient_matches")
    .insert({
      user_a_id: userIdA,
      user_b_id: userIdB,
      opportunity_score: analysis.opportunityScore,
      predicted_outcome: analysis.outcome,
      analysis_summary: analysis.reasoning,
      status: "analyzed",
      analyzed_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Store insights
  if (match) {
    await storeInsights(supabase, match.id, analysis);
  }

  return {
    success: true,
    data: { match, analysis },
  };
}
