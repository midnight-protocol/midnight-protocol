import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { AdminUser } from "../../_shared/types.ts";
import { llmService } from "../../_shared/llm-service.ts";

export async function getAvailableModels(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  try {
    const modelsResponse = await llmService.getModels();

    // Extract and format the model list for the UI
    const models = modelsResponse.data || [];

    // Common models we want to prioritize
    const priorityModels = [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite-preview-06-17",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/o3-mini",
      "openai/gpt-4.1-mini",
    ];

    // Filter and sort models
    const formattedModels = models
      .filter((model: any) => {
        // Filter out deprecated or experimental models unless they're in our priority list
        return (
          !model.id.includes("deprecated") || priorityModels.includes(model.id)
        );
      })
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length,
        pricing: model.pricing,
      }))
      .sort((a: any, b: any) => {
        // Sort priority models to the top
        const aIndex = priorityModels.indexOf(a.id);
        const bIndex = priorityModels.indexOf(b.id);

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      });

    return formattedModels;
  } catch (error) {
    console.error("Error fetching models:", error);
    // Return a fallback list if the API fails
    return [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      {
        id: "google/gemini-2.5-flash-lite-preview-06-17",
        name: "Gemini 2.5 Flash Lite",
      },
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "openai/o3-mini", name: "O3 Mini" },
      { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini" },
    ];
  }
}
