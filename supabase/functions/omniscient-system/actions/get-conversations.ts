import { ActionContext, ActionResponse } from "../types.ts";

export default async function getConversations(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { 
    matchId,
    status,
    userId,
    dateRange,
    limit = 50,
    offset = 0
  } = params;

  console.log(`💬 Fetching conversations with filters:`, {
    matchId,
    status,
    userId,
    dateRange,
    limit,
    offset
  });

  // Build base query with match relations
  let query = supabase
    .from("omniscient_conversations")
    .select(`
      *,
      match:omniscient_matches!match_id(
        *,
        user_a:users!user_a_id(id, handle),
        user_b:users!user_b_id(id, handle)
      )
    `)
    .order("created_at", { ascending: false });

  // Apply filters
  if (matchId) {
    query = query.eq("match_id", matchId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (userId) {
    // Filter conversations where user is involved in the match
    // This requires a more complex query since we need to check the match relation
    // We'll handle this by filtering after the query for now
    // TODO: Consider optimizing this with a more complex SQL query
  }

  if (dateRange) {
    if (dateRange.start) {
      query = query.gte("created_at", dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte("created_at", dateRange.end);
    }
  }

  // Apply pagination
  if (limit) {
    query = query.limit(limit);
  }

  if (offset && offset > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: conversations, error } = await query;

  if (error) {
    console.error("Error fetching conversations:", error);
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  // Apply userId filter post-query if needed
  let filteredConversations = conversations || [];
  if (userId && filteredConversations.length > 0) {
    filteredConversations = filteredConversations.filter(conv => 
      conv.match?.user_a_id === userId || conv.match?.user_b_id === userId
    );
  }

  console.log(`✅ Successfully fetched ${filteredConversations.length} conversations`);

  // Calculate summary statistics
  const summary = {
    totalRecords: filteredConversations.length,
    filters: {
      matchId,
      status,
      userId,
      dateRange,
      limit,
      offset
    }
  };

  if (filteredConversations.length > 0) {
    const statusCounts = filteredConversations.reduce((acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const qualityScores = filteredConversations
      .map(c => c.quality_score)
      .filter(score => score !== null && score !== undefined);

    summary.statistics = {
      statusDistribution: statusCounts,
      averageQualityScore: qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
        : 0,
      completedConversations: filteredConversations.filter(c => c.status === 'completed').length,
      activeConversations: filteredConversations.filter(c => c.status === 'active').length,
      dateRange: {
        earliest: filteredConversations[filteredConversations.length - 1]?.created_at,
        latest: filteredConversations[0]?.created_at
      }
    };
  }

  return {
    success: true,
    data: filteredConversations,
    summary
  };
}