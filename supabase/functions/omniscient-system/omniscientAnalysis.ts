import { PromptService } from "../_shared/prompt-service.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { UserProfile, OmniscientAnalysisResult } from "./types.ts";

export async function performOmniscientAnalysis(
  userA: UserProfile,
  userB: UserProfile,
  supabase: SupabaseClient
): Promise<OmniscientAnalysisResult> {
  const storyA = userA.personal_stories;
  const storyB = userB.personal_stories;

  // Initialize PromptService
  const promptService = new PromptService(supabase);

  // Map user data to template variables
  const variables = {
    handleA: userA.handle,
    narrativeA: storyA.narrative,
    currentFocusA: storyA.current_focus?.join(", ") || "Not specified",
    seekingA: storyA.seeking_connections?.join(", ") || "Not specified",
    offeringA: storyA.offering_expertise?.join(", ") || "Not specified",
    handleB: userB.handle,
    narrativeB: storyB.narrative,
    currentFocusB: storyB.current_focus?.join(", ") || "Not specified",
    seekingB: storyB.seeking_connections?.join(", ") || "Not specified",
    offeringB: storyB.offering_expertise?.join(", ") || "Not specified",
  };

  // Execute the prompt template
  const response = await promptService.executePromptTemplate(
    {
      templateName: "omniscient_opportunity_analysis_v2",
      variables,
      maxTokens: 100000,
    },
    {
      edgeFunction: "omniscient-system/omniscientAnalysis",
      userId: userA.id,
    }
  );

  try {
    return JSON.parse(response.response);
  } catch (error) {
    console.error("Error parsing response", error, response.response);
    throw error;
  }
}

export async function storeInsights(
  supabase: SupabaseClient,
  matchId: string,
  analysis: OmniscientAnalysisResult
) {
  const insights = [
    ...analysis.primaryOpportunities.map((opp) => ({
      insight_type: "opportunity",
      title: opp.title,
      description: opp.description,
      score: opp.feasibility,
      metadata: {
        valueProposition: opp.valueProposition,
        timeline: opp.timeline,
      },
    })),
    ...analysis.synergies.map((syn) => ({
      insight_type: "synergy",
      title: syn.type,
      description: syn.description,
      score: 0.8,
      metadata: { potential: syn.potential },
    })),
    ...analysis.riskFactors.map((risk) => ({
      insight_type: "risk",
      title: risk.risk,
      description: risk.mitigation,
      score: 0.3,
      metadata: {},
    })),
    ...analysis.hiddenAssets.map((asset) => ({
      insight_type: "hidden_asset",
      title: asset.asset,
      description: asset.application,
      score: 0.7,
      metadata: {},
    })),
    ...analysis.networkEffects.map((effect) => ({
      insight_type: "network_effect",
      title: effect.connection,
      description: effect.value,
      score: 0.6,
      metadata: {},
    })),
    ...analysis.nextSteps.map((step) => ({
      insight_type: "next_step",
      title: "Next Step",
      description: step,
      score: 0.9,
      metadata: {},
    })),
  ];

  for (const insightData of insights) {
    const { data: insight } = await supabase
      .from("omniscient_insights")
      .insert(insightData)
      .select()
      .single();

    if (insight) {
      await supabase.from("omniscient_match_insights").insert({
        match_id: matchId,
        insight_id: insight.id,
        relevance_score: insightData.score,
      });
    }
  }
}
