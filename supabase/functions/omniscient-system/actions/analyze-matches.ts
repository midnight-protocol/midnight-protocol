import { ActionContext, ActionResponse } from "../types.ts";
import { calculateNextMidnight, logAction } from "../utils.ts";
import {
  performOmniscientAnalysis,
  storeInsights,
} from "../omniscientAnalysis.ts";

export default async function analyzeMatches(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, openRouterApiKey, params } = context;
  const { batchSize = 50 } = params;

  console.log("Starting omniscient match analysis");

  // 1. Fetch all approved users with complete profiles
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(
      `
      id,
      handle,
      timezone,
      personal_stories!inner(
        narrative,
        current_focus,
        seeking_connections,
        offering_expertise
      ),
      agent_profiles!inner(
        agent_name
      )
    `
    )
    .eq("status", "APPROVED");

  if (usersError)
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  if (!users || users.length < 2) {
    return {
      success: true,
      summary: {
        message: "Insufficient users for matching",
        totalUsers: users?.length || 0,
      },
    };
  }

  console.log(`Found ${users.length} approved users`);

  // 2. Generate intelligent pairs (avoid duplicates)
  const pairs = [];
  const processedPairs = new Set();

  for (let i = 0; i < users.length && pairs.length < batchSize; i++) {
    for (let j = i + 1; j < users.length && pairs.length < batchSize; j++) {
      const userA = users[i];
      const userB = users[j];
      const [id1, id2] = [userA.id, userB.id].sort();
      const pairKey = `${id1}_${id2}`;

      if (!processedPairs.has(pairKey)) {
        // Check if match already exists
        const { data: existingMatch } = await supabase
          .from("omniscient_matches")
          .select("id")
          .or(
            `and(user_a_id.eq.${userA.id},user_b_id.eq.${userB.id}),and(user_a_id.eq.${userB.id},user_b_id.eq.${userA.id})`
          )
          .single();

        if (!existingMatch) {
          pairs.push({ userA, userB });
          processedPairs.add(pairKey);
        }
      }
    }
  }

  console.log(`Generated ${pairs.length} unique pairs for analysis`);

  // 3. Analyze each pair
  const matches = [];
  let analysisCount = 0;

  for (const pair of pairs) {
    try {
      analysisCount++;
      console.log(
        `Analyzing pair ${analysisCount}/${pairs.length}: ${pair.userA.handle} × ${pair.userB.handle}`
      );

      const analysis = await performOmniscientAnalysis(
        pair.userA,
        pair.userB,
        supabase
      );

      // 4. Store match
      const { data: match, error: matchError } = await supabase
        .from("omniscient_matches")
        .insert({
          user_a_id: pair.userA.id,
          user_b_id: pair.userB.id,
          opportunity_score: analysis.opportunityScore,
          predicted_outcome: analysis.outcome,
          analysis_summary: analysis.reasoning,
          match_reasoning: `Opportunity Score: ${analysis.opportunityScore.toFixed(
            2
          )}. ${analysis.reasoning}`,
          status: "analyzed",
          analyzed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (matchError) {
        console.error("Error storing match:", matchError);
        continue;
      }

      // 5. Store insights
      await storeInsights(supabase, match.id, analysis);
      matches.push(match);

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(
        `Error analyzing pair ${pair.userA.handle} × ${pair.userB.handle}:`,
        error
      );
      continue;
    }
  }

  // 6. Schedule high-value conversations (score >= 0.7)
  const highValueMatches = matches.filter((m) => m.opportunity_score >= 0.7);
  let scheduledCount = 0;

  for (const match of highValueMatches) {
    try {
      const scheduledTime = await calculateNextMidnight(
        supabase,
        match.user_a_id,
        match.user_b_id
      );

      await supabase
        .from("omniscient_matches")
        .update({
          status: "scheduled",
          scheduled_for: scheduledTime,
        })
        .eq("id", match.id);

      scheduledCount++;
    } catch (error) {
      console.error(`Error scheduling match ${match.id}:`, error);
    }
  }

  return {
    success: true,
    summary: {
      totalUsers: users.length,
      pairsGenerated: pairs.length,
      matchesAnalyzed: matches.length,
      highValueMatches: highValueMatches.length,
      scheduled: scheduledCount,
      averageOpportunityScore:
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.opportunity_score, 0) /
            matches.length
          : 0,
    },
    data: matches.slice(0, 10), // Return first 10 for preview
  };
}
