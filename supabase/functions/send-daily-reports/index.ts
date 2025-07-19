import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import {
  handleCorsPreflightRequest,
  corsSuccessResponse,
  corsErrorResponse,
} from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const { report_date, user_id }: SendReportsRequest = await req.json();
    const targetDate = report_date || new Date().toISOString().split("T")[0];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let emailsSent = 0;
    const errors: string[] = [];

    // Get reports to send
    let query = supabase
      .from("morning_reports")
      .select(
        `
        *,
        user:users!morning_reports_user_id_fkey(
          id, email, username, full_name, timezone,
          email_subscriptions(morning_reports_enabled),
          agent_profiles(name, communication_style)
        )
      `
      )
      .eq("report_date", targetDate)
      .eq("status", "generated");

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) throw reportsError;

    for (const report of reports || []) {
      try {
        // Skip if user has unsubscribed from morning reports
        if (
          report.user?.email_subscriptions?.[0]?.morning_reports_enabled ===
          false
        ) {
          console.log(
            `Skipping report for ${report.user.username} - unsubscribed`
          );
          continue;
        }

        const discoveries = report.discoveries || [];
        const hasDiscoveries = discoveries.length > 0;
        const appUrl =
          Deno.env.get("VITE_APP_URL") || "https://midnightprotocol.com";

        // Build the HTML email
        const emailHtml = generateMorningReportHTML(
          report,
          hasDiscoveries,
          appUrl
        );
        const emailText = generateMorningReportText(
          report,
          hasDiscoveries,
          appUrl
        );

        // Send the email
        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
              )}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: report.user?.email,
              subject: `☀️ Your Morning Report - ${
                hasDiscoveries
                  ? `${discoveries.length} new opportunities`
                  : "Network growing"
              }`,
              html: emailHtml,
              text: emailText,
              from:
                Deno.env.get("MORNING_REPORT_FROM_EMAIL") ||
                "reports@midnightprotocol.com",
            }),
          }
        );

        if (emailResponse.ok) {
          // Update report status
          await supabase
            .from("morning_reports")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", report.id);

          emailsSent++;
          console.log(`✅ Sent morning report to ${report.user?.username}`);
        } else {
          const error = await emailResponse.text();
          console.error(
            `Failed to send report to ${report.user?.username}:`,
            error
          );

          await supabase
            .from("morning_reports")
            .update({
              status: "failed",
              error: error,
            })
            .eq("id", report.id);
        }
      } catch (error: any) {
        console.error(
          `Error sending report for user ${report.user_id}:`,
          error
        );
        errors.push(`User ${report.user_id}: ${error.message}`);
      }
    }

    return corsSuccessResponse(req, {
      success: true,
      emails_sent: emailsSent,
      report_date: targetDate,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error in send-daily-reports function:", error);
    return corsErrorResponse(req, error.message || "Internal server error");
  }
};

function generateMorningReportHTML(
  report: any,
  hasDiscoveries: boolean,
  appUrl: string
): string {
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌙 MIDNIGHT PROTOCOL</h1>
      <div class="tagline">Your AI agent worked while you slept</div>
    </div>
    
    <div class="content">
      <div class="greeting">
        Good morning${
          report.user?.full_name ? ` ${report.user.full_name}` : ""
        }! ☀️
      </div>
      
      ${
        hasDiscoveries
          ? `
        <div class="summary-box">
          <div class="summary-stat">
            <div class="summary-number">${
              report.activity_summary?.total_conversations || 0
            }</div>
            <div class="summary-label">Conversations</div>
          </div>
          ${
            report.activity_summary?.strong_matches > 0
              ? `
            <div class="summary-stat">
              <div class="summary-number">${report.activity_summary.strong_matches}</div>
              <div class="summary-label">Strong Matches</div>
            </div>
          `
              : ""
          }
          <div class="summary-stat">
            <div class="summary-number">${report.discoveries?.length || 0}</div>
            <div class="summary-label">Opportunities</div>
          </div>
        </div>

        <h2 style="margin-bottom: 20px;">🎯 Today's Discoveries</h2>
        
        ${report.discoveries
          .slice(0, 5)
          .map(
            (discovery: any) => `
          <div class="discovery">
            <div class="discovery-header">
              <div class="discovery-user">${
                discovery.other_user?.full_name ||
                discovery.other_user?.username ||
                "Someone interesting"
              }</div>
              <div class="discovery-type type-${discovery.match_type}">${
              discovery.match_type
            } match</div>
            </div>
            
            <div class="discovery-summary">
              ${discovery.opportunity_summary}
            </div>
            
            ${
              discovery.synergies?.length > 0
                ? `
              <div class="synergies">
                <strong>Potential synergies:</strong>
                ${discovery.synergies
                  .slice(0, 3)
                  .map(
                    (synergy: string) =>
                      `<div class="synergy-item">💡 ${synergy}</div>`
                  )
                  .join("")}
              </div>
            `
                : ""
            }
            
            ${
              discovery.conversation_snippet?.length > 0
                ? `
              <div class="conversation-snippet">
                <strong>${discovery.conversation_snippet[0].speaker}:</strong> ${discovery.conversation_snippet[0].content}
              </div>
            `
                : ""
            }
            
            <a href="${appUrl}/introduction?user=${
              discovery.other_user?.id
            }&conversation=${discovery.conversation_id}" 
               class="intro-cta">
              Request Introduction →
            </a>
          </div>
        `
          )
          .join("")}

        ${
          report.agent_insights &&
          (report.agent_insights.patterns_observed?.length > 0 ||
            report.agent_insights.top_opportunities?.length > 0 ||
            report.agent_insights.recommended_actions?.length > 0)
            ? `
          <div class="insights">
            <h3>🤖 ${
              report.activity_summary?.agent_name || "Your Agent"
            }'s Insights</h3>
            
            ${
              report.agent_insights.patterns_observed?.length > 0
                ? `
              <div class="insight-section">
                <strong>Patterns I noticed:</strong>
                <div class="insight-list">
                  ${report.agent_insights.patterns_observed
                    .map(
                      (pattern: string) =>
                        `<div class="insight-item">${pattern}</div>`
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              report.agent_insights.top_opportunities?.length > 0
                ? `
              <div class="insight-section" style="margin-top: 15px;">
                <strong>Top opportunities:</strong>
                <div class="insight-list">
                  ${report.agent_insights.top_opportunities
                    .map(
                      (opp: string) => `<div class="insight-item">${opp}</div>`
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              report.agent_insights.recommended_actions?.length > 0
                ? `
              <div class="insight-section" style="margin-top: 15px;">
                <strong>Recommended next steps:</strong>
                <div class="insight-list">
                  ${report.agent_insights.recommended_actions
                    .map(
                      (action: string) =>
                        `<div class="insight-item">${action}</div>`
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        
      `
          : `
        <div class="no-discoveries">
          <div class="emoji">🌱</div>
          <h2>Building Your Network</h2>
          <p>Your agent didn't have any conversations last night, but don't worry! As more people join Midnight Protocol, you'll see more opportunities appear here.</p>
          <p style="margin-top: 20px;">
            <a href="${appUrl}/dashboard" class="intro-cta">Update Your Story →</a>
          </p>
        </div>
      `
      }
    </div>
    
    <div class="footer">
      <p>
        <a href="${appUrl}/dashboard">View Full Report</a> • 
        <a href="${appUrl}/settings">Update Preferences</a> • 
        <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(
    report.user?.email || ""
  )}&type=morning_reports">Unsubscribe</a>
      </p>
      <p style="margin-top: 15px;">
        © ${new Date().getFullYear()} Midnight Protocol. Your AI agent works while you sleep.
      </p>
    </div>
  </div>
</body>
</html>`;
  return emailHtml;
}

function generateMorningReportText(
  report: any,
  hasDiscoveries: boolean,
  appUrl: string
): string {
  const targetDate =
    report.report_date || new Date().toISOString().split("T")[0];
  const discoveries = report.discoveries || [];

  const emailText = `Good morning${
    report.user?.full_name ? ` ${report.user.full_name}` : ""
  }!

Your Midnight Protocol Morning Report - ${targetDate}

${
  hasDiscoveries
    ? `Your agent had ${
        report.activity_summary?.total_conversations || 0
      } conversations last night and discovered ${
        discoveries.length
      } opportunities.

TODAY'S DISCOVERIES:
${discoveries
  .slice(0, 5)
  .map(
    (discovery: any, i: number) => `
${i + 1}. ${discovery.other_user?.full_name || discovery.other_user?.username}
   ${discovery.opportunity_summary}
   ${
     discovery.synergies?.length > 0
       ? `Synergies: ${discovery.synergies.slice(0, 2).join(", ")}`
       : ""
   }
   Request introduction: ${appUrl}/introduction?user=${
      discovery.other_user?.id
    }&conversation=${discovery.conversation_id}
`
  )
  .join("\n")}

${
  report.agent_insights?.recommended_actions?.length > 0
    ? `
RECOMMENDED ACTIONS:
${report.agent_insights.recommended_actions
  .map((action: string) => `• ${action}`)
  .join("\n")}
`
    : ""
}
`
    : `Your agent didn't have any conversations last night. As more people join Midnight Protocol, you'll see more opportunities appear here.

Update your story: ${appUrl}/dashboard`
}

View full report: ${appUrl}/dashboard
Update preferences: ${appUrl}/settings
Unsubscribe: ${appUrl}/unsubscribe?email=${encodeURIComponent(
    report.user?.email || ""
  )}&type=morning_reports

© ${new Date().getFullYear()} Midnight Protocol`;

  return emailText;
}

serve(handler);
