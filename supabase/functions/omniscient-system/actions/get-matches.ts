import { ActionContext, ActionResponse } from "../types.ts";

export default async function getMatches(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { 
    status,
    minScore,
    userId,
    limit = 50,
    offset = 0
  } = params;

  console.log(`🎯 Fetching matches with filters:`, {
    status,
    minScore,
    userId,
    limit,
    offset
  });

  // Build base query with relations
  let query = supabase
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
    .order("created_at", { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq("status", status);
  }

  if (minScore !== undefined && minScore !== null) {
    query = query.gte("opportunity_score", minScore);
  }

  if (userId) {
    query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  }

  // Apply pagination
  if (limit) {
    query = query.limit(limit);
  }

  if (offset && offset > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: matches, error } = await query;

  if (error) {
    console.error("Error fetching matches:", error);
    throw new Error(`Failed to fetch matches: ${error.message}`);
  }

  console.log(`✅ Successfully fetched ${matches?.length || 0} matches`);

  // Calculate summary statistics
  const summary = {
    totalRecords: matches?.length || 0,
    filters: {
      status,
      minScore,
      userId,
      limit,
      offset
    }
  };

  if (matches && matches.length > 0) {
    const scores = matches
      .map(m => m.opportunity_score)
      .filter(score => score !== null && score !== undefined);
    
    const statusCounts = matches.reduce((acc, match) => {
      acc[match.status] = (acc[match.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    summary.statistics = {
      averageOpportunityScore: scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0,
      highValueMatches: matches.filter(m => m.opportunity_score > 0.7).length,
      statusDistribution: statusCounts,
      dateRange: {
        earliest: matches[matches.length - 1]?.created_at,
        latest: matches[0]?.created_at
      }
    };
  }

  return {
    success: true,
    data: matches || [],
    summary
  };
}