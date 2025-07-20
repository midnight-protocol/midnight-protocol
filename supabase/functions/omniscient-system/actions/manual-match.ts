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
  const analysis = await performOmniscientAnalysis(userA, userB, supabase);

  // Create or update match using upsert
  const { data: match } = await supabase
    .from("omniscient_matches")
    .upsert({
      user_a_id: userIdA,
      user_b_id: userIdB,
      opportunity_score: analysis.opportunityScore,
      predicted_outcome: analysis.outcome,
      analysis_summary: analysis.reasoning,
      match_reasoning: `Opportunity Score: ${analysis.opportunityScore.toFixed(
        2
      )}. ${analysis.reasoning}`,
      should_notify: analysis.notificationAssessment.shouldNotify,
      notification_score: analysis.notificationAssessment.notificationScore,
      notification_reasoning: analysis.notificationAssessment.reasoning,
      introduction_rationale_for_user_a:
        analysis.introductionRationale.forUserA,
      introduction_rationale_for_user_b:
        analysis.introductionRationale.forUserB,
      agent_summaries_agent_a_to_human_a:
        analysis.agentSummaries.agentAToHumanA,
      agent_summaries_agent_b_to_human_b:
        analysis.agentSummaries.agentBToHumanB,
      status: "analyzed",
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_a_id,user_b_id'
    })
    .select()
    .single();

  // Clean up old insights and store new ones
  if (match) {
    // Delete existing match insights
    await supabase
      .from("omniscient_match_insights")
      .delete()
      .eq("match_id", match.id);
    
    // Store new insights
    await storeInsights(supabase, match.id, analysis);
  }

  return {
    success: true,
    data: { match, analysis },
  };
}
