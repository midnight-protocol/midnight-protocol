import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { MetricsTimeRange, AdminUser } from "../../_shared/types.ts";

export async function getNetworkMetrics(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  try {
    // Get total active users
    const { count: totalActiveUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "APPROVED");

    // Get pending approvals
    const { count: pendingApprovals } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");

    // Get conversations today
    const today = new Date().toISOString().split("T")[0];
    const { count: conversationsToday } = await supabase
      .from("agent_conversations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    // Get introductions today
    const { count: introductionsToday } = await supabase
      .from("introduction_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    // Get reports delivered today
    const { count: reportsDeliveredToday } = await supabase
      .from("morning_reports")
      .select("*", { count: "exact", head: true })
      .eq("report_date", today)
      .eq("email_sent", true);

    // For now, set a default quality score
    const avgConversationQuality = 85;

    return {
      totalActiveUsers: totalActiveUsers || 0,
      pendingApprovals: pendingApprovals || 0,
      conversationsToday: conversationsToday || 0,
      introductionsToday: introductionsToday || 0,
      avgConversationQuality,
      reportsDeliveredToday: reportsDeliveredToday || 0,
    };
  } catch (error) {
    console.error("Failed to get network metrics:", error);
    return {
      totalActiveUsers: 0,
      pendingApprovals: 0,
      conversationsToday: 0,
      introductionsToday: 0,
      avgConversationQuality: 0,
      reportsDeliveredToday: 0,
    };
  }
}

export async function getMetrics(
  supabase: SupabaseClient,
  params: MetricsTimeRange,
  user?: AdminUser
) {
  const { timeRange } = params;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
  }

  // Check cache first
  const { data: cachedData } = await supabase
    .from("admin_metrics_cache")
    .select("*")
    .eq("metric_key", `metrics_${timeRange}`)
    .gte("expires_at", new Date().toISOString())
    .single();

  if (cachedData) {
    return cachedData.metric_value;
  }

  // Calculate metrics
  const calculationStart = Date.now();

  // Get various metrics
  const [userGrowth, conversationVolume, introductionRequests, userActivity] =
    await Promise.all([
      // User growth over time
      supabase
        .from("users")
        .select("created_at, status")
        .gte("created_at", startDate.toISOString()),

      // Conversation volume
      supabase
        .from("agent_conversations")
        .select("created_at, status")
        .gte("created_at", startDate.toISOString()),

      // Introduction requests
      supabase
        .from("introduction_requests")
        .select("created_at, email_sent")
        .gte("created_at", startDate.toISOString()),

      // User activity
      supabase
        .from("user_activities")
        .select("created_at, activity_type")
        .gte("created_at", startDate.toISOString()),
    ]);

  // Process data into time series
  const metrics = {
    userGrowth: processTimeSeries(
      userGrowth.data || [],
      "created_at",
      timeRange
    ),
    conversationVolume: processTimeSeries(
      conversationVolume.data || [],
      "created_at",
      timeRange
    ),
    introductionRequests: processTimeSeries(
      introductionRequests.data || [],
      "created_at",
      timeRange
    ),
    userActivity: processTimeSeries(
      userActivity.data || [],
      "created_at",
      timeRange
    ),

    summary: {
      totalUsers: userGrowth.data?.length || 0,
      approvedUsers:
        userGrowth.data?.filter((u) => u.status === "APPROVED").length || 0,
      totalConversations: conversationVolume.data?.length || 0,
      completedConversations:
        conversationVolume.data?.filter((c) => c.status === "completed")
          .length || 0,
      totalIntroductions: introductionRequests.data?.length || 0,
      sentIntroductions:
        introductionRequests.data?.filter((i) => i.email_sent).length || 0,
    },
  };

  // Cache the results
  await supabase.from("admin_metrics_cache").upsert({
    metric_key: `metrics_${timeRange}`,
    metric_value: metrics,
    calculated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    calculation_time_ms: Date.now() - calculationStart,
  });

  return metrics;
}

export async function refreshMetricsCache(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  // Clear all metric caches
  const { error } = await supabase
    .from("admin_metrics_cache")
    .delete()
    .like("metric_key", "metrics_%");

  if (error) {
    throw new Error(`Failed to clear metrics cache: ${error.message}`);
  }

  // Recalculate all metrics
  const results = await Promise.all([
    getMetrics(supabase, { timeRange: "7d" }, user),
    getMetrics(supabase, { timeRange: "30d" }, user),
    getMetrics(supabase, { timeRange: "90d" }, user),
  ]);

  return {
    cleared: true,
    recalculated: ["7d", "30d", "90d"],
  };
}

export async function exportMetrics(
  supabase: SupabaseClient,
  params: MetricsTimeRange & { format?: "csv" | "json" },
  user?: AdminUser
) {
  const metrics = await getMetrics(supabase, params, user);

  if (params.format === "json") {
    return metrics;
  }

  // Convert to CSV - simplified version focusing on summary
  const headers = ["Metric", "Value"].join(",");
  const rows = Object.entries(metrics.summary).map(
    ([key, value]) => `"${key}","${value}"`
  );

  return [headers, ...rows].join("\n");
}

// Helper function to process time series data
function processTimeSeries(data: any[], dateField: string, timeRange: string) {
  const bucketSize =
    timeRange === "7d" ? "day" : timeRange === "30d" ? "day" : "week";
  const buckets: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item[dateField]);
    let bucketKey: string;

    if (bucketSize === "day") {
      bucketKey = date.toISOString().split("T")[0];
    } else if (bucketSize === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      bucketKey = weekStart.toISOString().split("T")[0];
    }

    buckets[bucketKey!] = (buckets[bucketKey!] || 0) + 1;
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
