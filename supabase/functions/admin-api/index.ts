/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase-client.ts";
import { AdminRequest, AdminResponse } from "../_shared/types.ts";

// Import actions
import { verifyAdmin } from "../_shared/auth.ts";
import {
  getSystemHealth,
  updateAlertThreshold,
  getAlertThresholds,
  resolveAlert,
} from "./actions/health.ts";
import {
  getUserStats,
  searchUsers,
  getUserDetails,
  updateUserStatus,
  bulkUserOperation,
  createTestUsers,
  deleteAllTestUsers,
  getTestUsers,
  getUserMatches,
  getMatchInsights,
  getUserConversations,
  getConversationTurns,
} from "./actions/users.ts";
import {
  getConversations,
  exportConversations,
  getConversationDetails,
} from "./actions/conversations.ts";
import {
  getSystemConfigs,
  updateSystemConfig,
  getConfigHistory,
} from "./actions/config.ts";
import {
  getActivityLogs,
  exportActivityLogs,
  logActivity,
} from "./actions/activity.ts";
import {
  getNetworkMetrics,
  getMetrics,
  refreshMetricsCache,
  exportMetrics,
} from "./actions/metrics.ts";
import {
  getPromptTemplates,
  getPromptTemplate,
  createPromptTemplate,
  updatePromptTemplate,
  getPromptVersions,
  restorePromptVersion,
  exportPromptTemplates,
  importPromptTemplates,
  runPrompt,
} from "./actions/prompts.ts";
import { getAvailableModels } from "./actions/llm.ts";
import {
  getLLMLogs,
  getLLMLogDetails,
  getLLMLogStats,
  exportLLMLogs,
} from "./actions/llm-logs.ts";
import {
  getEmailInterests,
  getEmailInterestStats,
  exportEmailInterests,
  deleteEmailInterest,
} from "./actions/email-interests.ts";
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  getEmailVersions,
  restoreEmailVersion,
  exportEmailTemplates,
  importEmailTemplates,
  sendTestEmail,
  getEmailCategories,
} from "./actions/email-templates.ts";

const actions: Record<string, Function> = {
  // Authentication
  verifyAdmin,

  // System Health
  getSystemHealth,
  updateAlertThreshold,
  getAlertThresholds,
  resolveAlert,

  // User Management
  getUserStats,
  searchUsers,
  getUserDetails,
  updateUserStatus,
  bulkUserOperation,
  getUserMatches,
  getMatchInsights,
  getUserConversations,
  getConversationTurns,
  
  // Test User Management
  createTestUsers,
  deleteAllTestUsers,
  getTestUsers,

  // Conversations
  getConversations,
  exportConversations,
  getConversationDetails,

  // Configuration
  getSystemConfigs,
  updateSystemConfig,
  getConfigHistory,

  // Activity
  getActivityLogs,
  exportActivityLogs,

  // Metrics
  getNetworkMetrics,
  getMetrics,
  refreshMetricsCache,
  exportMetrics,

  // Prompt Templates
  getPromptTemplates,
  getPromptTemplate,
  createPromptTemplate,
  updatePromptTemplate,
  getPromptVersions,
  restorePromptVersion,
  exportPromptTemplates,
  importPromptTemplates,
  runPrompt,
  
  // LLM
  getAvailableModels,
  
  // LLM Logs
  getLLMLogs,
  getLLMLogDetails,
  getLLMLogStats,
  exportLLMLogs,

  // Email Interests
  getEmailInterests,
  getEmailInterestStats,
  exportEmailInterests,
  deleteEmailInterest,

  // Email Templates
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  getEmailVersions,
  restoreEmailVersion,
  exportEmailTemplates,
  importEmailTemplates,
  sendTestEmail,
  getEmailCategories,
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { action, params } = (await req.json()) as AdminRequest;

    if (!action) {
      throw new Error("No action specified");
    }

    // Initialize Supabase with service role
    const supabaseAdmin = createServiceRoleClient();

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

    // Execute action
    if (!actions[action]) {
      throw new Error(`Unknown action: ${action}`);
    }

    const result = await actions[action](supabaseAdmin, params, user);

    // Log activity (except for read operations)
    const readOnlyActions = ["get", "search", "verify", "export"];
    const isReadOnly = readOnlyActions.some((prefix) =>
      action.startsWith(prefix)
    );

    if (!isReadOnly) {
      await logActivity(supabaseAdmin, {
        admin_user_id: user.id,
        action,
        target_type: params?.target_type || "system",
        target_id: params?.target_id,
        details: params,
        ip_address:
          req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
      });
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      } as AdminResponse),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Admin API error:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      } as AdminResponse),
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
