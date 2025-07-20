import { ActionContext, ActionResponse } from "../types.ts";

export default async function getProcessingLogs(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { 
    processType,
    status,
    limit = 100
  } = params;

  console.log(`📋 Fetching processing logs with filters:`, {
    processType,
    status,
    limit
  });

  let query = supabase
    .from("omniscient_processing_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (processType) {
    query = query.eq("process_type", processType);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error("Error fetching processing logs:", error);
    throw new Error(`Failed to fetch processing logs: ${error.message}`);
  }

  console.log(`✅ Successfully fetched ${logs?.length || 0} processing logs`);

  // Calculate summary statistics
  const summary = {
    totalRecords: logs?.length || 0,
    filters: {
      processType,
      status,
      limit
    }
  };

  if (logs && logs.length > 0) {
    const statusCounts = logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const processTypeCounts = logs.reduce((acc, log) => {
      acc[log.process_type] = (acc[log.process_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedLogs = logs.filter(l => l.status === 'completed' && l.processing_time_ms);
    const averageProcessingTime = completedLogs.length > 0
      ? completedLogs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / completedLogs.length
      : 0;

    const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);

    summary.statistics = {
      statusDistribution: statusCounts,
      processTypeDistribution: processTypeCounts,
      averageProcessingTimeMs: Math.round(averageProcessingTime),
      totalTokensUsed: totalTokens,
      totalCostUsd: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      errorCount: statusCounts.failed || 0,
      dateRange: {
        earliest: logs[logs.length - 1]?.created_at,
        latest: logs[0]?.created_at
      }
    };
  }

  return {
    success: true,
    data: logs || [],
    summary
  };
}