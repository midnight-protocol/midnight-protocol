import { ActionContext, ActionResponse } from "../types.ts";

export default async function getAnalytics(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { dateRange } = params || {};

  // Basic analytics queries
  const { data: matchStats } = await supabase
    .from("omniscient_matches")
    .select("opportunity_score, predicted_outcome, status");

  const { data: conversationStats } = await supabase
    .from("omniscient_conversations")
    .select("quality_score, actual_outcome");

  const { data: insightStats } = await supabase
    .from("omniscient_insights")
    .select("insight_type");

  const totalMatches = matchStats?.length || 0;
  const averageOpportunityScore =
    totalMatches > 0
      ? matchStats.reduce((sum, m) => sum + (m.opportunity_score || 0), 0) /
        totalMatches
      : 0;

  const conversationCount = conversationStats?.length || 0;
  const conversionRate =
    totalMatches > 0 ? conversationCount / totalMatches : 0;

  const outcomeDistribution =
    conversationStats?.reduce((acc, c) => {
      acc[c.actual_outcome] = (acc[c.actual_outcome] || 0) + 1;
      return acc;
    }, {}) || {};

  const topInsightTypes =
    insightStats?.reduce((acc, i) => {
      acc[i.insight_type] = (acc[i.insight_type] || 0) + 1;
      return acc;
    }, {}) || {};

  const rtnObj = {
    success: true,
    data: {
      totalMatches,
      averageOpportunityScore,
      conversionRate,
      topInsightTypes: Object.entries(topInsightTypes).map(([type, count]) => ({
        type,
        count,
      })),
      outcomeDistribution: Object.entries(outcomeDistribution).map(
        ([outcome, count]) => ({ outcome, count })
      ),
      systemHealth: {
        processingBacklog: 0,
        averageProcessingTime: 2500,
        errorRate: 0.05,
      },
    },
  };
  return rtnObj;
}
