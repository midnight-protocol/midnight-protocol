import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  handleCorsPreflightRequest,
  corsSuccessResponse,
  corsErrorResponse,
} from "../_shared/cors.ts";

interface OmniscientRequest {
  userIdA: string;
  userIdB: string;
  customPrompt?: string;
  debugModel?: string;
}

interface OmniscientAnalysis {
  opportunityScore: number;
  outcome: "STRONG_MATCH" | "EXPLORATORY" | "FUTURE_POTENTIAL" | "NO_MATCH";
  primaryOpportunities: Array<{
    title: string;
    description: string;
    valueProposition: string;
    feasibility: number;
    timeline: string;
  }>;
  synergies: Array<{
    type: string;
    description: string;
    potential: string;
  }>;
  nextSteps: string[];
  riskFactors: Array<{
    risk: string;
    mitigation: string;
  }>;
  hiddenAssets: Array<{
    asset: string;
    application: string;
  }>;
  networkEffects: Array<{
    connection: string;
    value: string;
  }>;
  notificationAssessment?: {
    shouldNotify: boolean;
    notificationScore: number;
    reasoning: string;
  };
  introductionRationale?: {
    forUserA: string;
    forUserB: string;
  };
  agentSummaries?: {
    agentAToHumanA: string;
    agentBToHumanB: string;
  };
  reasoning: string;
  debugMetadata?: any;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openRouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { userIdA, userIdB, customPrompt, debugModel } =
      (await req.json()) as OmniscientRequest;

    console.log("Starting omniscient analysis:", {
      userIdA,
      userIdB,
      hasCustomPrompt: !!customPrompt,
      debugModel,
    });

    // Fetch user data
    const [userAResult, userBResult] = await Promise.all([
      supabase
        .from("users")
        .select(
          `
          id,
          handle,
          personal_stories!inner(
            narrative,
            current_focus,
            seeking_connections,
            offering_expertise
          ),
          agent_profiles!inner(
            agent_name
          )
        `
        )
        .eq("id", userIdA)
        .single(),
      supabase
        .from("users")
        .select(
          `
          id,
          handle,
          personal_stories!inner(
            narrative,
            current_focus,
            seeking_connections,
            offering_expertise
          ),
          agent_profiles!inner(
            agent_name
          )
        `
        )
        .eq("id", userIdB)
        .single(),
    ]);

    if (userAResult.error || userBResult.error) {
      throw new Error("Failed to fetch user data");
    }

    const userA = userAResult.data;
    const userB = userBResult.data;

    if (
      !userA.personal_stories ||
      !userB.personal_stories ||
      !userA.agent_profiles ||
      !userB.agent_profiles
    ) {
      throw new Error("Users must have complete profiles");
    }

    // Get prompt template
    let promptTemplate = customPrompt;

    if (!promptTemplate) {
      const { data: promptData, error: promptError } = await supabase
        .from("prompt_templates")
        .select(
          `
          prompt_template_versions!inner (
            template_text
          )
        `
        )
        .eq("name", "omniscient_opportunity_analysis_v2")
        .eq("prompt_template_versions.is_current", true)
        .single();

      if (promptError || !promptData) {
        throw new Error("Failed to fetch prompt template");
      }

      promptTemplate = promptData.prompt_template_versions[0].template_text;
    }

    // Prepare user data for prompt
    const storyA = userA.personal_stories;
    const storyB = userB.personal_stories;
    const agentA = userA.agent_profiles[0];
    const agentB = userB.agent_profiles[0];

    // Replace variables in prompt
    const filledPrompt = promptTemplate
      .replace(/{{handle_a}}/g, userA.handle)
      .replace(/{{narrative_a}}/g, storyA.narrative || "")
      .replace(/{{current_focus_a}}/g, storyA.current_focus || "")
      .replace(/{{seeking_connections_a}}/g, storyA.seeking_connections || "")
      .replace(/{{offering_expertise_a}}/g, storyA.offering_expertise || "")
      .replace(/{{handle_b}}/g, userB.handle)
      .replace(/{{narrative_b}}/g, storyB.narrative || "")
      .replace(/{{current_focus_b}}/g, storyB.current_focus || "")
      .replace(/{{seeking_connections_b}}/g, storyB.seeking_connections || "")
      .replace(/{{offering_expertise_b}}/g, storyB.offering_expertise || "");

    // Determine model to use
    let modelToUse = debugModel;

    if (!modelToUse) {
      const { data: configData } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "ai_model_conversation")
        .single();

      if (configData) {
        modelToUse = configData.config_value;
        // Handle JSON-encoded values
        if (typeof modelToUse === "string" && modelToUse.startsWith('"')) {
          try {
            modelToUse = JSON.parse(modelToUse);
          } catch {
            // Keep as is
          }
        }
      } else {
        modelToUse = "google/gemini-2.5-flash";
      }
    }

    // Add anthropic prefix if needed
    if (modelToUse && !modelToUse.includes("/")) {
      modelToUse = `anthropic/${modelToUse}`;
    }

    console.log("Using model:", modelToUse);

    // Track timing
    const apiStartTime = Date.now();

    // Call OpenRouter API with usage tracking
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://midnightprotocol.com",
          "X-Title": "Midnight Protocol Omniscient Analysis",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content:
                "You are an expert at analyzing professional collaboration opportunities. Respond ONLY with valid JSON, no explanation or markdown.",
            },
            {
              role: "user",
              content: filledPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          usage: {
            include: true, // Enable cost tracking
          },
        }),
      }
    );

    const apiEndTime = Date.now();

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
    }

    const aiResponse = await openRouterResponse.json();
    console.log("OpenRouter response received");

    if (
      !aiResponse.choices ||
      !aiResponse.choices[0] ||
      !aiResponse.choices[0].message
    ) {
      throw new Error("Invalid response from OpenRouter");
    }

    // Parse the AI response
    let analysis: OmniscientAnalysis;

    try {
      const content = aiResponse.choices[0].message.content;
      // Remove any markdown code blocks if present
      const jsonContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(
        "Failed to parse AI response:",
        aiResponse.choices[0].message.content
      );
      throw new Error("Failed to parse AI analysis response");
    }

    // Validate the analysis structure
    if (
      !analysis.opportunityScore ||
      !analysis.outcome ||
      !analysis.primaryOpportunities
    ) {
      throw new Error("Invalid analysis structure returned by AI");
    }

    // Build debug metadata with usage tracking
    const debugMetadata = {
      model: modelToUse,
      temperature: 0.7,
      maxTokens: 4000,
      responseTimeMs: apiEndTime - apiStartTime,
      usage: aiResponse.usage
        ? {
            promptTokens: aiResponse.usage.prompt_tokens || 0,
            completionTokens: aiResponse.usage.completion_tokens || 0,
            totalTokens: aiResponse.usage.total_tokens || 0,
            cost: aiResponse.usage.cost || 0,
            costUSD: aiResponse.usage.cost || 0, // Already in USD
          }
        : null,
      timestamp: new Date().toISOString(),
    };

    // Add debug metadata to analysis
    analysis.debugMetadata = debugMetadata;

    // Return the analysis with metadata
    return corsSuccessResponse(req, {
      success: true,
      analysis,
      metadata: {
        userA: {
          id: userA.id,
          handle: userA.handle,
          agentName: agentA.agent_name,
        },
        userB: {
          id: userB.id,
          handle: userB.handle,
          agentName: agentB.agent_name,
        },
        modelUsed: modelToUse,
        timestamp: new Date().toISOString(),
      },
      usage: aiResponse.usage,
      debugMetadata,
    });
  } catch (error) {
    console.error("Error in omniscient-analysis:", error);
    console.error("Error stack:", error.stack);

    // More detailed error response for debugging
    const errorMessage = error.message || "Internal server error";
    const errorDetails = {
      success: false,
      error: errorMessage,
      details: {
        type: error.constructor.name,
        message: errorMessage,
        // Include more context for common errors
        hint: errorMessage.includes("OPENROUTER_API_KEY")
          ? "Check if OPENROUTER_API_KEY is set in edge function secrets"
          : errorMessage.includes("Failed to fetch user")
          ? "Check if users have complete profiles"
          : errorMessage.includes("Failed to parse")
          ? "AI returned invalid JSON format"
          : "Check edge function logs for details",
      },
    };

    return corsErrorResponse(req, JSON.stringify(errorDetails), 500);
  }
});
