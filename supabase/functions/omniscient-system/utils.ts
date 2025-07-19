import { ActivityLog } from "./types.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Utility functions for omniscient system
export async function logAction(
  supabase: any,
  action: string,
  status: string,
  metadata: any = {},
  error?: string
) {
  try {
    await supabase.from("omniscient_processing_logs").insert({
      process_type: "edge_function",
      action,
      status,
      metadata,
      error_message: error,
      created_at: new Date().toISOString(),
      completed_at: status !== "started" ? new Date().toISOString() : null,
    });
  } catch (logError) {
    console.error("Failed to log action:", logError);
  }
}

export async function calculateNextMidnight(
  supabase: any,
  userAId: string,
  userBId: string
): Promise<string> {
  // Get user timezones
  const { data: users } = await supabase
    .from("users")
    .select("id, timezone")
    .in("id", [userAId, userBId]);

  // For simplicity, use the first user's timezone or default to PST
  const timezone = users?.[0]?.timezone || "America/Los_Angeles";

  // Calculate next midnight in their timezone
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tomorrow.toISOString();
}

export async function logActivity(
  supabase: SupabaseClient,
  activityData: ActivityLog
) {
  try {
    await supabase.from("user_activities").insert({
      user_id: activityData.admin_user_id,
      activity_type: "admin_action",
      activity_data: {
        action: activityData.action,
        target_type: activityData.target_type,
        target_id: activityData.target_id,
        details: activityData.details,
        ip_address: activityData.ip_address,
        user_agent: activityData.user_agent,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
