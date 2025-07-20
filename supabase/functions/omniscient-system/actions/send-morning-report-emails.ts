import { ActionContext, ActionResponse } from "../types.ts";
import { createEmailService, EmailService } from "../../_shared/email-service.ts";

export default async function sendMorningReportEmails(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const {
    date,
    userIds,
    templateOverride,
    forceResend = false,
    dryRun = false,
    emailOverride,
  } = params;

  const reportDate = date ? new Date(date) : new Date();
  const targetDate = reportDate.toISOString().split("T")[0];

  try {
    console.log(
      `📧 ${
        dryRun ? "Dry run for sending" : "Sending"
      } morning report emails for ${targetDate}${
        emailOverride ? ` (Override: ${emailOverride})` : ""
      }`
    );

    // Build query for morning reports
    let query = supabase
      .from("omniscient_morning_reports")
      .select(
        `
      *,
      user:users!user_id(id, handle, auth_user_id)
    `
      )
      .eq("report_date", targetDate)
      .gt("notification_count", 0); // Only send emails for reports with actual notifications

    // Filter by email status unless force resend
    if (!forceResend) {
      query = query.eq("email_sent", false);
    }

    // Filter by specific user IDs if provided
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: reportsToEmail, error } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch morning reports for email: ${error.message}`
      );
    }

    if (!reportsToEmail || reportsToEmail.length === 0) {
      return {
        success: true,
        summary: {
          message: forceResend
            ? "No morning reports found for the specified criteria"
            : "No morning reports with unsent emails found",
          date: targetDate,
          emailsSent: 0,
          emailsFailed: 0,
          isForceResend: forceResend,
          isDryRun: dryRun,
        },
      };
    }

    console.log(`Found ${reportsToEmail.length} reports to email`);

    // Get emails for all users - if auth_user_id is missing from reports, query users table directly
    let userAuthIds = reportsToEmail
      .map((report) => {
        return report.user?.auth_user_id;
      })
      .filter(Boolean);

    // Fetch emails from auth.users table only if we have auth_user_ids
    let authUsers = [];
    if (userAuthIds.length > 0) {
      const { data, error: authError } = await supabase
        .from("auth.users")
        .select("id, email")
        .in("id", Array.from(userAuthIds));

      if (authError) {
        console.error("Failed to fetch user emails:", authError);
        console.error("Auth error details:", JSON.stringify(authError, null, 2));
        throw new Error(`Failed to fetch user emails: ${authError.message}`);
      }
      
      authUsers = data || [];
    } else {
      console.log("No auth_user_ids found, skipping auth.users query");
    }

    // Create a map of auth_user_id to email (simplified like generate-morning-reports)
    const userDetailsMap = new Map();
    if (authUsers) {
      for (const authUser of authUsers) {
        userDetailsMap.set(authUser.id, {
          email: authUser.email,
          full_name: null, // We'll use the handle instead
          isTestUser: false,
        });
      }
    }

    // Set all users that don't have an email to hardcode to shiftynick@gmail.com
    for (const report of reportsToEmail) {
      const authUserId = report.user?.auth_user_id;
      if (!authUserId || !userDetailsMap.get(authUserId)?.email) {
        // Use user_id as key for users without auth_user_id
        userDetailsMap.set(report.user_id, {
          email: "shiftynick@gmail.com",
          full_name: "TEST USER",
          isTestUser: true,
        });
      }
    }

    const emailResults = [];
    let emailsSent = 0;
    let emailsFailed = 0;

    console.log(`🔄 Starting to process ${reportsToEmail.length} reports...`);
    console.log(`⏱️ Rate limiting: 500ms delay between emails to respect 2/second limit`);

    // Create email service instance once
    const emailService = createEmailService();

    for (let i = 0; i < reportsToEmail.length; i++) {
      const report = reportsToEmail[i];
      try {
        const user = report.user;
        const authUserId = user?.auth_user_id;
        
        // Try to get user details by auth_user_id first, then by user_id (for test users)
        let userDetails = authUserId ? userDetailsMap.get(authUserId) : null;
        if (!userDetails) {
          userDetails = userDetailsMap.get(report.user_id);
        }

        console.log(
          `🔍 Processing user ${
            user?.handle || report.user_id
          }, auth_user_id: ${authUserId}`
        );

        if (!userDetails?.email) {
          console.warn(`⚠️ User ${user.handle} has no email address, skipping`);
          emailsFailed++;
          continue;
        }

        const userEmail = userDetails.email;
        const userFullName = user.handle; // Use handle since we simplified the query
        const recipientEmail = emailOverride || userEmail;

        console.log(
          `🔍 User email: ${userEmail}, recipient email: ${recipientEmail}`
        );

        // Generate email content (keep original user context for personalization)
        const emailContent = generateEmailContent(
          report,
          {
            ...user,
            email: userEmail,
            full_name: userFullName,
          },
          emailOverride
        );

        if (dryRun) {
          console.log(
            `📋 Dry run email for ${recipientEmail}${
              emailOverride ? ` (original: ${userEmail})` : ""
            }:`,
            {
              subject: emailContent.subject,
              previewText: emailContent.body.substring(0, 100) + "...",
              notificationCount: report.notification_count,
            }
          );
          emailsSent++;
          continue;
        }

        // Send email with rate limiting and retry logic
        let emailResponse;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            emailResponse = await emailService.sendEmail({
              to: recipientEmail,
              subject: emailContent.subject,
              html: emailContent.body,
            });

            if (emailResponse.status === 'sent') {
              break; // Success, exit retry loop
            }
            
            // Check if it's a rate limit error
            if (emailResponse.error?.includes('Too many requests') || emailResponse.error?.includes('rate limit')) {
              retryCount++;
              if (retryCount <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
                console.log(`⏳ Rate limited, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            }
            
            // Non-rate-limit error or max retries reached
            break;
            
          } catch (error) {
            console.error(`❌ Email service error:`, error);
            emailResponse = {
              email: recipientEmail,
              status: 'failed' as const,
              error: error.message || 'Unknown error',
              timestamp: new Date().toISOString(),
            };
            break;
          }
        }

        if (emailResponse.status === 'failed') {
          console.error(
            `❌ Failed to send email to ${recipientEmail}${
              emailOverride ? ` (original: ${userEmail})` : ""
            } after ${retryCount} retries:`,
            emailResponse.error
          );
          emailsFailed++;
          continue;
        }

        // Mark email as sent
        const { error: updateError } = await supabase
          .from("omniscient_morning_reports")
          .update({
            email_sent: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", report.id);

        if (updateError) {
          console.error(
            `⚠️ Failed to mark email as sent for report ${report.id}:`,
            updateError
          );
          // Don't fail the operation, email was sent successfully
        }

        emailResults.push({
          userId: user.id,
          email: recipientEmail,
          originalEmail: emailOverride ? userEmail : undefined,
          handle: user.handle,
          notificationCount: report.notification_count,
          status: "sent",
          messageId: emailResponse.messageId,
        });

        emailsSent++;
        console.log(
          `✅ Sent morning report email to ${recipientEmail}${
            emailOverride ? ` (original: ${userEmail})` : ""
          } (${report.notification_count} notifications) - Message ID: ${emailResponse.messageId}`
        );
        
        // Rate limiting: Wait between emails (except for the last one)
        if (i < reportsToEmail.length - 1) {
          console.log(`⏱️ Waiting 500ms before next email...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (userError) {
        console.error(
          `Error sending email for user ${report.user_id}:`,
          userError
        );
        emailsFailed++;

        const reportUserEmail = userDetailsMap.get(
          report.user?.auth_user_id
        )?.email;
        emailResults.push({
          userId: report.user_id,
          email: emailOverride || reportUserEmail || "unknown",
          originalEmail: emailOverride ? reportUserEmail : undefined,
          handle: report.user?.handle || "unknown",
          notificationCount: report.notification_count,
          status: "failed",
          error: userError.message,
        });
        continue;
      }
    }

    return {
      success: true,
      summary: {
        date: targetDate,
        totalReports: reportsToEmail.length,
        emailsSent,
        emailsFailed,
        successRate:
          reportsToEmail.length > 0
            ? (emailsSent / reportsToEmail.length) * 100
            : 0,
        isForceResend: forceResend,
        isDryRun: dryRun,
      },
      data: emailResults.slice(0, 10), // Return first 10 for preview
    };
  } catch (error) {
    console.error("Error sending morning report emails:", error);
    throw error;
  }
}

// Helper function to generate email content
function generateEmailContent(report: any, user: any, emailOverride?: string) {
  const topMatches = report.match_notifications
    .slice(0, 3)
    .map(
      (match) =>
        `• ${match.other_user.handle} - ${match.notification_reasoning}`
    )
    .join("\n");

  const insights = report.agent_insights.top_opportunities
    .slice(0, 2)
    .map((insight) => `• ${insight}`)
    .join("\n");

  const subject = `🌅 Your Morning Report - ${report.notification_count} New ${
    report.notification_count === 1 ? "Match" : "Matches"
  }`;

  const body = `
    ${
      emailOverride
        ? '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 5px; color: #856404;"><strong>🧪 Testing Mode:</strong> This email was sent to an override address for testing purposes.</div>'
        : ""
    }
    
    <h2>Good morning, ${user.full_name || user.handle}!</h2>
    
    <p>Your AI agents have been working overnight and found <strong>${
      report.notification_count
    } new opportunity${
    report.notification_count === 1 ? "" : "ies"
  }</strong> for you.</p>
    
    <h3>🎯 Top Matches</h3>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
      ${report.match_notifications
        .slice(0, 3)
        .map(
          (match) => `
        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #dee2e6;">
          <strong>${match.other_user.handle}</strong><br>
          <span style="color: #6c757d;">${match.notification_reasoning}</span><br>
          <em style="color: #495057;">${match.introduction_rationale}</em>
        </div>
      `
        )
        .join("")}
    </div>

    ${
      report.agent_insights.top_opportunities.length > 0
        ? `
    <h3>🧠 Agent Insights</h3>
    <ul>
      ${report.agent_insights.top_opportunities
        .map((insight) => `<li>${insight}</li>`)
        .join("")}
    </ul>
    `
        : ""
    }

    <div style="text-align: center; margin: 30px 0;">
      <a href="${
        Deno.env.get("VITE_APP_URL") || "https://app.example.com"
      }/dashboard" 
         style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Full Report
      </a>
    </div>

    <p style="color: #6c757d; font-size: 14px;">
      This report was generated by your omniscient AI system. 
      Total opportunity score: ${report.total_opportunity_score.toFixed(1)}
    </p>
  `;

  return { subject, body };
}

// Helper function to format date
function formatReportDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
