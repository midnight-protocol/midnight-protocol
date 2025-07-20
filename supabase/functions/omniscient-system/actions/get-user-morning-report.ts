import { ActionContext, ActionResponse } from "../types.ts";

export default async function getUserMorningReport(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { userId, date } = params;

  if (!userId) {
    throw new Error("userId is required");
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  console.log(`📊 Fetching morning report for user ${userId} on ${targetDate}`);

  const { data: report, error } = await supabase
    .from("omniscient_morning_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", targetDate)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user morning report:", error);
    throw new Error(`Failed to fetch user morning report: ${error.message}`);
  }

  console.log(`✅ Successfully fetched morning report for user ${userId}`);

  return {
    success: true,
    data: report,
    summary: {
      userId,
      reportDate: targetDate,
      found: !!report,
      notificationCount: report?.notification_count || 0,
      totalOpportunityScore: report?.total_opportunity_score || 0,
      emailSent: report?.email_sent || false
    }
  };
}