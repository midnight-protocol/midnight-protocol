import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";
import { OmniscientRequest, ActionContext } from "./types.ts";
import { logAction, logActivity } from "./utils.ts";

// Import auth action
import { verifyAdmin } from "./actions/auth.ts";

// Import all action handlers
import analyzeMatches from "./actions/analyze-matches.ts";
import executeConversation from "./actions/execute-conversation.ts";
import getMatchInsights from "./actions/get-match-insights.ts";
import processUserMidnight from "./actions/process-user-midnight.ts";
import getAnalytics from "./actions/get-analytics.ts";
import getSystemHealth from "./actions/get-system-health.ts";
import manualMatch from "./actions/manual-match.ts";
import getConversationDetails from "./actions/get-conversation-details.ts";
import analyzeOutcome from "./actions/analyze-outcome.ts";
import generateReport from "./actions/generate-report.ts";
import generateMorningReports from "./actions/generate-morning-reports.ts";
import sendMorningReportEmails from "./actions/send-morning-report-emails.ts";
import getMorningReports from "./actions/get-morning-reports.ts";
import getMatches from "./actions/get-matches.ts";
import getConversations from "./actions/get-conversations.ts";
import getMatch from "./actions/get-match.ts";
import getConversation from "./actions/get-conversation.ts";
import getUserMorningReport from "./actions/get-user-morning-report.ts";
import getMorningReportEmailStatus from "./actions/get-morning-report-email-status.ts";
import getProcessingLogs from "./actions/get-processing-logs.ts";
import getOutcomes from "./actions/get-outcomes.ts";

// Action registry
const actionHandlers = {
  // Authentication
  verifyAdmin,

  // Core actions
  analyzeMatches,
  executeConversation,
  getMatchInsights,
  processUserMidnight,
  getAnalytics,
  getSystemHealth,
  manualMatch,
  getConversationDetails,
  analyzeOutcome,
  generateReport,
  generateMorningReports,
  sendMorningReportEmails,
  getMorningReports,
  getMatches,
  getConversations,
  getMatch,
  getConversation,
  getUserMorningReport,
  getMorningReportEmailStatus,
  getProcessingLogs,
  getOutcomes,
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { action, params } = (await req.json()) as OmniscientRequest;

    if (!action) {
      throw new Error("No action specified");
    }

    // Initialize Supabase with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY")!;
    if (!openRouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify admin status
    const { user, isAdmin } = await verifyAdmin(supabaseAdmin, authHeader);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    console.log(
      `Omniscient system called with action: ${action} by ${user.handle}`
    );

    // Execute action
    if (!actionHandlers[action]) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Log action start
    await logAction(supabaseAdmin, action, "started", { params });

    // Create action context
    const context: ActionContext = {
      supabase: supabaseAdmin,
      openRouterApiKey,
      params: params || {},
      user,
    };

    const startTime = Date.now();
    const result = await actionHandlers[action](context);
    const processingTime = Date.now() - startTime;

    // Log activity (except for read operations)
    const readOnlyActions = ["get", "verify"];
    const isReadOnly = readOnlyActions.some((prefix) =>
      action.startsWith(prefix)
    );

    if (!isReadOnly) {
      await logActivity(supabaseAdmin, {
        admin_user_id: user.id,
        action,
        target_type: params?.target_type || "omniscient_system",
        target_id: params?.target_id,
        details: params,
        ip_address:
          req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
      });
    }

    // Log completion
    await logAction(supabaseAdmin, action, "completed", {
      params,
      processingTime,
      resultSummary: result?.summary || "completed",
    });

    // Return success response
    const rtn = new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        summary: result.summary,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
    return rtn;
  } catch (error) {
    console.error("Omniscient system error:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: error.message?.includes("access") ? 403 : 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
