import { ActionContext, ActionResponse } from "../types.ts";
import {
  createEmailService,
  EmailService,
} from "../../_shared/email-service.ts";

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
    reportId,
  } = params;

  const reportDate = date ? new Date(date) : new Date();
  const targetDate = reportDate.toISOString().split("T")[0];

  try {
    const reportsToEmail = [];

    // Handle single report mode
    if (reportId) {
      // make sure emailOverride is set
      if (!emailOverride) {
        return {
          success: false,
          summary: {
            message:
              "Email override is required in single report mode. Please set the emailOverride parameter.",
            date: targetDate,
            emailsSent: 0,
            emailsFailed: 0,
            isForceResend: forceResend,
            isDryRun: dryRun,
          },
        };
      }

      console.log(`🔍 Fetching specific report by ID: ${reportId}`);

      // Fetch specific report by ID
      const { data, error } = await supabase
        .from("omniscient_morning_reports")
        .select(
          `
        *,
        user:users!user_id(id, handle, auth_user_id)
      `
        )
        .eq("id", reportId)
        .gt("notification_count", 0);

      if (error) {
        throw new Error(
          `Failed to fetch morning report ${reportId}: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          summary: {
            message: "Report not found or has no notifications",
            date: targetDate,
            emailsSent: 0,
            emailsFailed: 0,
            isForceResend: forceResend,
            isDryRun: dryRun,
          },
        };
      }

      reportsToEmail.push(data[0]);
    } else {
      console.log(`🔍 Fetching morning reports for ${targetDate}`);
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

      const { data, error } = await query;

      console.log(`🔍 Morning reports fetched: ${data.length}`);

      if (error) {
        throw new Error(
          `Failed to fetch morning reports for email: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
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

      reportsToEmail.push(...data);
    }

    // Bulk mode (existing functionality)
    console.log(
      `📧 ${
        dryRun ? "Dry run for sending" : "Sending"
      } morning report emails for ${targetDate}${
        emailOverride ? ` (Override: ${emailOverride})` : ""
      }`
    );

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
        console.error(
          "Auth error details:",
          JSON.stringify(authError, null, 2)
        );
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
    console.log(
      `⏱️ Rate limiting: 500ms delay between emails to respect 2/second limit`
    );

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

            if (emailResponse.status === "sent") {
              break; // Success, exit retry loop
            }

            // Check if it's a rate limit error
            if (
              emailResponse.error?.includes("Too many requests") ||
              emailResponse.error?.includes("rate limit")
            ) {
              retryCount++;
              if (retryCount <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
                console.log(
                  `⏳ Rate limited, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
            }

            // Non-rate-limit error or max retries reached
            break;
          } catch (error) {
            console.error(`❌ Email service error:`, error);
            emailResponse = {
              email: recipientEmail,
              status: "failed" as const,
              error: error.message || "Unknown error",
              timestamp: new Date().toISOString(),
            };
            break;
          }
        }

        if (emailResponse.status === "failed") {
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
          } (${report.notification_count} notifications) - Message ID: ${
            emailResponse.messageId
          }`
        );

        // Rate limiting: Wait between emails (except for the last one)
        if (i < reportsToEmail.length - 1) {
          console.log(`⏱️ Waiting 500ms before next email...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
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
  const hasNotifications = report.notification_count > 0;
  const appUrl = Deno.env.get("VITE_APP_URL") || "https://midnightprotocol.com";
  const matchNotifications = report.match_notifications || [];

  // Calculate strong matches count from notifications (assuming high opportunity scores are "strong")
  const strongMatches = matchNotifications.filter(match => 
    match.opportunity_score && match.opportunity_score > 7.0
  ).length;

  const subject = `🌅 Your Morning Report - ${
    hasNotifications
      ? `${report.notification_count} new opportunities`
      : "Network growing"
  }`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Midnight Protocol Morning Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #0a0a0a; color: #22ef5e; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header .tagline { margin-top: 10px; opacity: 0.8; font-size: 14px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .summary-stat { display: inline-block; margin-right: 30px; }
    .summary-number { font-size: 24px; font-weight: bold; color: #22ef5e; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .discovery { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .discovery-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
    .discovery-user { font-weight: 600; font-size: 16px; }
    .discovery-type { font-size: 12px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
    .type-strong { background: #22ef5e; color: #0a0a0a; }
    .type-exploratory { background: #40c4ff; color: white; }
    .type-future { background: #ff9800; color: white; }
    .discovery-summary { margin-bottom: 15px; color: #555; }
    .synergies { margin-bottom: 15px; }
    .synergy-item { background: #f0f8ff; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; font-size: 14px; }
    .conversation-snippet { background: #f8f9fa; border-left: 3px solid #22ef5e; padding: 10px 15px; margin: 15px 0; font-size: 14px; }
    .intro-cta { display: inline-block; background: #22ef5e; color: #0a0a0a; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; margin-top: 10px; }
    .intro-cta:hover { background: #1dd54d; }
    .insights { background: #fafafa; border-radius: 8px; padding: 20px; margin-top: 30px; }
    .insights h3 { margin-top: 0; color: #333; }
    .insight-list { margin: 10px 0; }
    .insight-item { margin-bottom: 8px; padding-left: 20px; position: relative; }
    .insight-item:before { content: "→"; position: absolute; left: 0; color: #22ef5e; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 12px; color: #666; }
    .footer a { color: #22ef5e; text-decoration: none; }
    .no-discoveries { text-align: center; padding: 40px; color: #666; }
    .no-discoveries .emoji { font-size: 48px; margin-bottom: 20px; }
    .testing-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 5px; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    ${emailOverride ? '<div class="testing-notice"><strong>🧪 Testing Mode:</strong> This email was sent to an override address for testing purposes.</div>' : ''}
    
    <div class="header">
      <h1>🌙 MIDNIGHT PROTOCOL</h1>
      <div class="tagline">Your AI agent worked while you slept</div>
    </div>
    
    <div class="content">
      <div class="greeting">
        Good morning${user.full_name ? ` ${user.full_name}` : ''}! ☀️
      </div>
      
      ${hasNotifications ? `
        <div class="summary-box">
          <div class="summary-stat">
            <div class="summary-number">${report.notification_count}</div>
            <div class="summary-label">Notifications</div>
          </div>
          ${strongMatches > 0 ? `
            <div class="summary-stat">
              <div class="summary-number">${strongMatches}</div>
              <div class="summary-label">Strong Matches</div>
            </div>
          ` : ''}
          <div class="summary-stat">
            <div class="summary-number">${matchNotifications.length}</div>
            <div class="summary-label">Opportunities</div>
          </div>
        </div>

        <h2 style="margin-bottom: 20px;">🎯 Today's Discoveries</h2>
        
        ${matchNotifications.slice(0, 5).map(match => `
          <div class="discovery">
            <div class="discovery-header">
              <div class="discovery-user">${
                match.other_user?.full_name || 
                match.other_user?.handle || 
                'Someone interesting'
              }</div>
              <div class="discovery-type type-${match.opportunity_score > 7.0 ? 'strong' : match.opportunity_score > 5.0 ? 'exploratory' : 'future'}">${
                match.opportunity_score > 7.0 ? 'strong' : 
                match.opportunity_score > 5.0 ? 'exploratory' : 'future'
              } match</div>
            </div>
            
            <div class="discovery-summary">
              ${match.notification_reasoning}
            </div>
            
            ${match.introduction_rationale ? `
              <div class="synergies">
                <strong>Introduction rationale:</strong>
                <div class="synergy-item">💡 ${match.introduction_rationale}</div>
              </div>
            ` : ''}
            
            <a href="${appUrl}/dashboard" class="intro-cta">
              View in Dashboard →
            </a>
          </div>
        `).join('')}

        ${report.agent_insights && (
          report.agent_insights.patterns_observed?.length > 0 ||
          report.agent_insights.top_opportunities?.length > 0 ||
          report.agent_insights.recommended_actions?.length > 0
        ) ? `
          <div class="insights">
            <h3>🤖 Your Agent's Insights</h3>
            
            ${report.agent_insights.patterns_observed?.length > 0 ? `
              <div class="insight-section">
                <strong>Patterns I noticed:</strong>
                <div class="insight-list">
                  ${report.agent_insights.patterns_observed.map(pattern => 
                    `<div class="insight-item">${pattern}</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            ${report.agent_insights.top_opportunities?.length > 0 ? `
              <div class="insight-section" style="margin-top: 15px;">
                <strong>Top opportunities:</strong>
                <div class="insight-list">
                  ${report.agent_insights.top_opportunities.map(opp => 
                    `<div class="insight-item">${opp}</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            ${report.agent_insights.recommended_actions?.length > 0 ? `
              <div class="insight-section" style="margin-top: 15px;">
                <strong>Recommended next steps:</strong>
                <div class="insight-list">
                  ${report.agent_insights.recommended_actions.map(action => 
                    `<div class="insight-item">${action}</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      ` : `
        <div class="no-discoveries">
          <div class="emoji">🌱</div>
          <h2>Building Your Network</h2>
          <p>Your agent didn't find any new opportunities last night, but don't worry! As more people join Midnight Protocol, you'll see more opportunities appear here.</p>
          <p style="margin-top: 20px;">
            <a href="${appUrl}/dashboard" class="intro-cta">Update Your Story →</a>
          </p>
        </div>
      `}
    </div>
    
    <div class="footer">
      <p>
        <a href="${appUrl}/dashboard">View Full Report</a> • 
        <a href="${appUrl}/settings">Update Preferences</a> • 
        <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(user.email || '')}&type=morning_reports">Unsubscribe</a>
      </p>
      <p style="margin-top: 15px;">
        © ${new Date().getFullYear()} Midnight Protocol. Your AI agent works while you sleep.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, body: emailHtml };
}
