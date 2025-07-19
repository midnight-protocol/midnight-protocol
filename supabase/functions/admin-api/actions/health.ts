import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SystemHealth, SystemAlert, AdminUser } from "../../_shared/types.ts";

export async function getSystemHealth(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
): Promise<SystemHealth> {
  const health: SystemHealth = {
    database: {
      status: "healthy",
      latency: 0,
    },
    aiService: {
      status: "healthy",
      provider: "OpenRouter",
      latency: 0,
    },
    emailService: {
      status: "healthy",
      deliveryRate: 0,
      failedCount: 0,
    },
    metrics: {
      apiResponseTime: 0,
      batchCompletionRate: 0,
      activeUsersRatio: 0,
      conversationSuccessRate: 0,
    },
    alerts: [],
  };

  // Test database health
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("users").select("count").limit(1);
    health.database.latency = Date.now() - dbStart;
    if (error) {
      health.database.status = "down";
      health.database.message = error.message;
    }
  } catch (error) {
    health.database.status = "down";
    health.database.message = error.message;
  }

  // Get metrics from cache or calculate
  const { data: cachedMetrics } = await supabase
    .from("admin_metrics_cache")
    .select("*")
    .eq("metric_key", "system_health")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (cachedMetrics) {
    Object.assign(health, cachedMetrics.metric_value);
  } else {
    // Calculate metrics
    const [
      totalUsers,
      activeUsers,
      totalConversations,
      successfulConversations,
    ] = await Promise.all([
      supabase.from("users").select("count"),
      supabase.from("users").select("count").eq("status", "APPROVED"),
      supabase.from("agent_conversations").select("count"),
      supabase
        .from("agent_conversations")
        .select("count")
        .eq("status", "completed"),
    ]);

    // Calculate metrics
    const totalUsersCount = totalUsers.data?.[0]?.count || 0;
    const activeUsersCount = activeUsers.data?.[0]?.count || 0;
    const totalConvsCount = totalConversations.data?.[0]?.count || 0;
    const successfulConvsCount = successfulConversations.data?.[0]?.count || 0;

    health.metrics.activeUsersRatio =
      totalUsersCount > 0 ? (activeUsersCount / totalUsersCount) * 100 : 0;
    health.metrics.conversationSuccessRate =
      totalConvsCount > 0 ? (successfulConvsCount / totalConvsCount) * 100 : 0;

    // Cache the metrics
    await supabase.from("admin_metrics_cache").upsert({
      metric_key: "system_health",
      metric_value: health,
      calculated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      calculation_time_ms: Date.now() - dbStart,
    });
  }

  // Get alert thresholds and generate alerts
  const thresholds = await getAlertThresholds(supabase);

  // Check API response time
  if (health.database.latency > (thresholds.api_response_time || 1000)) {
    health.alerts.push({
      id: "db-latency",
      type: "warning",
      message: `Database latency is high: ${health.database.latency}ms`,
      timestamp: new Date().toISOString(),
      metric: "api_response_time",
      value: health.database.latency,
      threshold: thresholds.api_response_time,
    });
  }

  // Check batch completion rate
  if (
    health.metrics.batchCompletionRate <
    (thresholds.batch_completion_rate || 80)
  ) {
    health.alerts.push({
      id: "batch-completion",
      type: "error",
      message: `Batch completion rate is low: ${health.metrics.batchCompletionRate.toFixed(
        1
      )}%`,
      timestamp: new Date().toISOString(),
      metric: "batch_completion_rate",
      value: health.metrics.batchCompletionRate,
      threshold: thresholds.batch_completion_rate,
    });
  }

  // Check active users ratio
  if (health.metrics.activeUsersRatio < (thresholds.active_users_ratio || 50)) {
    health.alerts.push({
      id: "active-users",
      type: "warning",
      message: `Active users ratio is low: ${health.metrics.activeUsersRatio.toFixed(
        1
      )}%`,
      timestamp: new Date().toISOString(),
      metric: "active_users_ratio",
      value: health.metrics.activeUsersRatio,
      threshold: thresholds.active_users_ratio,
    });
  }

  // Check conversation success rate
  if (
    health.metrics.conversationSuccessRate <
    (thresholds.conversation_success_rate || 70)
  ) {
    health.alerts.push({
      id: "conversation-success",
      type: "warning",
      message: `Conversation success rate is low: ${health.metrics.conversationSuccessRate.toFixed(
        1
      )}%`,
      timestamp: new Date().toISOString(),
      metric: "conversation_success_rate",
      value: health.metrics.conversationSuccessRate,
      threshold: thresholds.conversation_success_rate,
    });
  }

  return health;
}

export async function getAlertThresholds(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("key, value")
    .eq("category", "alerts");

  if (error) {
    console.error("Error fetching alert thresholds:", error);
    return {};
  }

  const thresholds: Record<string, number> = {};
  data?.forEach((config) => {
    thresholds[config.key] = Number(config.value);
  });

  return thresholds;
}

export async function updateAlertThreshold(
  supabase: SupabaseClient,
  params: { key: string; value: number },
  user?: AdminUser
): Promise<{ key: string; value: number }> {
  const { key, value } = params;

  // Validate inputs
  if (!key || typeof value !== "number" || value < 0) {
    throw new Error(
      "Invalid parameters: key must be provided and value must be a positive number"
    );
  }

  // Update in admin_config
  const { error } = await supabase.from("admin_config").upsert(
    {
      category: "alerts",
      key,
      value,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "category,key",
    }
  );

  if (error) {
    throw new Error(`Failed to update alert threshold: ${error.message}`);
  }

  // Clear metrics cache to force recalculation
  await supabase
    .from("admin_metrics_cache")
    .delete()
    .eq("metric_key", "system_health");

  return { key, value };
}

export async function resolveAlert(
  supabase: SupabaseClient,
  params: { alertId: string },
  user?: AdminUser
): Promise<void> {
  const { alertId } = params;

  console.log("resolveAlert", alertId, user);

  // todo

  // // Update alert in database
  // const { error } = await supabase
  //   .from("system_alerts")
  //   .update({
  //     resolved: true,
  //     resolved_by: user?.id,
  //     resolved_at: new Date().toISOString(),
  //   })
  //   .eq("id", alertId);

  // if (error) throw error;

  // // Log the resolution to admin activity
  // const { data: alert } = await supabase
  //   .from("system_alerts")
  //   .select("*")
  //   .eq("id", alertId)
  //   .single();

  // if (alert) {
  //   await supabase.from("admin_activity_logs").insert({
  //     admin_user_id: user?.id,
  //     action: "RESOLVE_ALERT",
  //     target_id: alertId,
  //     details: {
  //       alert_type: alert.type,
  //       message: alert.message,
  //       metric: alert.metric,
  //     },
  //   });
  // }
}
