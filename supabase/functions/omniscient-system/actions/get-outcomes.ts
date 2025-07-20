import { ActionContext, ActionResponse } from "../types.ts";

export default async function getOutcomes(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { 
    conversationId,
    followUpRecommended,
    limit = 50
  } = params;

  console.log(`🎯 Fetching outcomes with filters:`, {
    conversationId,
    followUpRecommended,
    limit
  });

  let query = supabase
    .from("omniscient_outcomes")
    .select(`
      *,
      conversation:omniscient_conversations(*),
      match:omniscient_matches(*)
    `)
    .order("created_at", { ascending: false });

  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }
  if (followUpRecommended !== undefined) {
    query = query.eq("follow_up_recommended", followUpRecommended);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data: outcomes, error } = await query;

  if (error) {
    console.error("Error fetching outcomes:", error);
    throw new Error(`Failed to fetch outcomes: ${error.message}`);
  }

  console.log(`✅ Successfully fetched ${outcomes?.length || 0} outcomes`);

  // Calculate summary statistics
  const summary = {
    totalRecords: outcomes?.length || 0,
    filters: {
      conversationId,
      followUpRecommended,
      limit
    }
  };

  if (outcomes && outcomes.length > 0) {
    const followUpRecommendedCount = outcomes.filter(o => o.follow_up_recommended).length;
    const collaborationReadinessScores = outcomes
      .map(o => o.collaboration_readiness_score)
      .filter(score => score !== null && score !== undefined);
    
    const averageCollaborationScore = collaborationReadinessScores.length > 0
      ? collaborationReadinessScores.reduce((sum, score) => sum + score, 0) / collaborationReadinessScores.length
      : 0;

    const followUpTimeframes = outcomes
      .filter(o => o.follow_up_timeframe)
      .reduce((acc, outcome) => {
        acc[outcome.follow_up_timeframe] = (acc[outcome.follow_up_timeframe] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    summary.statistics = {
      followUpRecommendedCount,
      followUpRecommendedRate: Math.round((followUpRecommendedCount / outcomes.length) * 100),
      averageCollaborationReadinessScore: Math.round(averageCollaborationScore * 100) / 100,
      followUpTimeframeDistribution: followUpTimeframes,
      actualCollaborationTracked: outcomes.filter(o => o.actual_collaboration_tracked).length,
      dateRange: {
        earliest: outcomes[outcomes.length - 1]?.created_at,
        latest: outcomes[0]?.created_at
      }
    };
  }

  return {
    success: true,
    data: outcomes || [],
    summary
  };
}