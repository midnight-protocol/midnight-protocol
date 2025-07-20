import { ActionContext, ActionResponse } from "../types.ts";

export default async function getMorningReportEmailStatus(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { date } = params;

  const targetDate = date || new Date().toISOString().split('T')[0];

  console.log(`📧 Fetching morning report email status for ${targetDate}`);

  const { data: reports, error } = await supabase
    .from("omniscient_morning_reports")
    .select("email_sent, notification_count")
    .eq("report_date", targetDate)
    .gt("notification_count", 0);

  if (error) {
    console.error("Error fetching email status:", error);
    throw new Error(`Failed to fetch email status: ${error.message}`);
  }

  const totalReports = reports?.length || 0;
  const emailsSent = reports?.filter(r => r.email_sent).length || 0;
  const emailsPending = totalReports - emailsSent;
  const successRate = totalReports > 0 ? (emailsSent / totalReports) * 100 : 0;

  const statusData = {
    date: targetDate,
    totalReports,
    emailsSent,
    emailsPending,
    successRate
  };

  console.log(`✅ Successfully calculated email status for ${targetDate}: ${emailsSent}/${totalReports} sent`);

  return {
    success: true,
    data: statusData,
    summary: {
      date: targetDate,
      emailDeliveryRate: `${emailsSent}/${totalReports}`,
      successRatePercent: Math.round(successRate * 100) / 100,
      pendingEmails: emailsPending
    }
  };
}