/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase-client.ts";
import { InternalRequest, InternalResponse } from "../_shared/types.ts";

// Import actions
import { verifyUser } from "../_shared/auth.ts";
import { getUserData } from "./actions/users.ts";
import { 
  initializeOnboardingChat, 
  sendOnboardingMessage, 
  completeOnboarding,
  getOnboardingData,
  saveAgentPersonalization,
  getPersonalStory,
  updateUserTimezone
} from "./actions/onboarding.ts";
import { submitEmailInterest } from "./actions/email-interest.ts";

const actions: Record<string, Function> = {
  // User actions
  getUserData,
  
  // Onboarding actions
  initializeOnboardingChat,
  sendOnboardingMessage,
  completeOnboarding,
  getOnboardingData,
  saveAgentPersonalization,
  getPersonalStory,
  updateUserTimezone,
  
  // Email interest actions (no auth required)
  submitEmailInterest,
};

// Actions that don't require authentication
const unauthenticatedActions = new Set(['submitEmailInterest']);

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { action, params } = (await req.json()) as InternalRequest;

    if (!action) {
      throw new Error("No action specified");
    }

    // Initialize Supabase with service role key (bypasses RLS like admin-api)
    const supabase = createServiceRoleClient();

    let user = null;
    let databaseUser = null;

    // Check if action requires authentication
    if (!unauthenticatedActions.has(action)) {
      // Get auth token from request
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header");
      }

      // Verify user authentication
      const authResult = await verifyUser(supabase, authHeader);
      if (!authResult.isAuthenticated) {
        throw new Error("Authentication required");
      }
      user = authResult.user;
      databaseUser = authResult.databaseUser;
    }

    // Execute action
    if (!actions[action]) {
      throw new Error(`Unknown action: ${action}`);
    }

    const result = await actions[action](supabase, params, user, databaseUser);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      } as InternalResponse),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Internal API error:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      } as InternalResponse),
      {
        status: error.message?.includes("Authentication") ? 401 : 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});