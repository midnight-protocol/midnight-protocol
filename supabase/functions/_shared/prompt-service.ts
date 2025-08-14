import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { llmService, ChatMessage } from "./llm-service.ts";
import { PromptTemplate, RunPromptRequest } from "./types.ts";

/**
 * Template interpolation utilities
 */

/**
 * Interpolates variables in a template string
 * Replaces {{variableName}} with the provided value
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  // Replace each variable in the template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value || "");
  }

  return result;
}

/**
 * Validates that all required variables are provided
 */
export function validateVariables(
  template: PromptTemplate,
  providedVariables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check each required variable
  for (const requiredVar of template.variables) {
    if (!providedVariables[requiredVar]) {
      missing.push(requiredVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Extracts variables from a template string
 * Returns array of variable names found in {{variableName}} format
 */
export function extractVariables(template: string): string[] {
  const regex = /{{(\w+)}}/g;
  const variables = new Set<string>();

  let match;
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Shared prompt execution service
 * Provides core functionality for running LLM prompts from templates
 */
export class PromptService {
  constructor(private supabaseService: SupabaseClient) {}

  /**
   * Fetches a prompt template with its current version
   */
  async fetchPromptTemplate(
    templateName?: string,
    templateId?: string
  ): Promise<PromptTemplate> {
    if (!templateName && !templateId) {
      throw new Error("Either templateName or templateId is required");
    }

    let query = this.supabaseService
      .from("prompt_templates")
      .select(
        `
        id,
        name,
        description,
        created_at,
        updated_at,
        prompt_template_versions!inner (
          id,
          version,
          template_text,
          variables,
          is_json_response,
          json_schema,
          llm_model,
          default_temperature,
          created_at
        )
      `
      )
      .eq("prompt_template_versions.is_current", true);

    if (templateId) {
      query = query.eq("id", templateId);
    } else if (templateName) {
      query = query.eq("name", templateName);
    }

    const { data: templateData, error: templateError } = await query.single();

    if (templateError || !templateData) {
      throw new Error(
        `Prompt template not found: ${templateId || templateName}`
      );
    }

    // Flatten the structure for backward compatibility
    const version = templateData.prompt_template_versions[0];
    return {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      template_text: version.template_text,
      variables: version.variables,
      version: version.version,
      is_json_response: version.is_json_response,
      json_schema: version.json_schema,
      llm_model: version.llm_model,
      default_temperature: version.default_temperature,
    } as PromptTemplate;
  }

  /**
   * Executes a prompt template with the given parameters
   */
  async executePromptTemplate(
    request: RunPromptRequest,
    trackingOptions?: {
      requestId?: string;
      edgeFunction?: string;
      userId?: string;
    }
  ): Promise<{
    response: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    templateUsed: string;
    templateVersion: number;
    model: string;
  }> {
    const {
      templateName,
      templateId,
      variables = {},
      model,
      temperature,
      maxTokens = 10000,
      responseFormat,
      additionalMessages = [],
    } = request;

    // Fetch the template
    const template = await this.fetchPromptTemplate(templateName, templateId);

    const finalTemperature =
      temperature || template.default_temperature || 0.21;

    // Validate variables
    const validation = validateVariables(template, variables);
    if (!validation.valid) {
      throw new Error(
        `Missing required variables: ${validation.missing.join(", ")}`
      );
    }

    // Interpolate template
    const interpolatedPrompt = interpolateTemplate(
      template.template_text,
      variables
    );

    // Build messages array
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: interpolatedPrompt,
      },
      ...additionalMessages,
    ];

    // Get model to use - prioritize request model, then template model, then fallback
    const modelToUse =
      model || template.llm_model || "anthropic/claude-3-5-sonnet-20241022";

    // Determine response format - prioritize request format, then template format
    let finalResponseFormat = responseFormat;
    if (
      !finalResponseFormat &&
      template.is_json_response &&
      template.json_schema
    ) {
      finalResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: JSON.parse(template.json_schema),
        },
      };
    }

    // Call LLM service
    const llmResponse = await llmService.chatCompletion(
      {
        model: modelToUse,
        messages,
        temperature: finalTemperature,
        max_tokens: maxTokens,
        response_format: finalResponseFormat,
      },
      trackingOptions
    );

    // Extract response
    const responseContent = llmResponse.choices[0]?.message?.content || "";

    return {
      response: responseContent,
      usage: llmResponse.usage,
      templateUsed: template.name,
      templateVersion: template.version,
      model: modelToUse,
    };
  }
}
