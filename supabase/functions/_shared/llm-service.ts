/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared LLM service for making OpenRouter API calls
// This service can be used by any edge function without authentication issues
import { getCorsHeaders } from "./cors.ts";
import { createServiceRoleClient } from "./supabase-client.ts";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
    };
  };
}

export interface TokenCountResult {
  token_length: number;
  text_length: number;
}

export interface LLMCallLogData {
  requestId?: string;
  model: string;
  methodType: "chat_completion" | "stream_completion";
  inputMessages: ChatMessage[];
  inputParams: Omit<ChatCompletionRequest, "messages" | "model">;
  edgeFunction?: string;
  userId?: string;
}

export interface LLMCallLogResult {
  outputResponse?: any;
  completionText?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  responseTimeMs?: number;
  status: "completed" | "failed";
  errorMessage?: string;
  httpStatusCode?: number;
}

export class LLMService {
  private baseUrl = "https://openrouter.ai/api/v1";
  private apiKey: string;

  constructor() {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    if (!apiKey) {
      console.warn(
        "OPENROUTER_API_KEY environment variable not set. LLM features will not work."
      );
    }
    this.apiKey = apiKey;
  }

  private async startLog(logData: LLMCallLogData): Promise<string | null> {
    try {
      const supabase = createServiceRoleClient();
      const { inputParams, ...otherData } = logData;

      const { data, error } = await supabase
        .from("llm_call_logs")
        .insert({
          request_id: logData.requestId,
          model: logData.model,
          method_type: logData.methodType,
          input_messages: logData.inputMessages,
          input_params: inputParams,
          edge_function: logData.edgeFunction,
          user_id: logData.userId,
          status: "started",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to start LLM call log:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error starting LLM call log:", error);
      return null;
    }
  }

  private async completeLog(
    logId: string,
    result: LLMCallLogResult
  ): Promise<void> {
    if (!logId) return;

    try {
      const supabase = createServiceRoleClient();

      const { error } = await supabase
        .from("llm_call_logs")
        .update({
          output_response: result.outputResponse,
          completion_text: result.completionText,
          prompt_tokens: result.promptTokens || 0,
          completion_tokens: result.completionTokens || 0,
          total_tokens: result.totalTokens || 0,
          cost_usd: result.costUsd,
          response_time_ms: result.responseTimeMs,
          status: result.status,
          error_message: result.errorMessage,
          http_status_code: result.httpStatusCode,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (error) {
        console.error("Failed to complete LLM call log:", error);
      }
    } catch (error) {
      console.error("Error completing LLM call log:", error);
    }
  }

  private extractTokenUsage(response: any): {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } {
    try {
      const usage = response?.usage;
      if (usage) {
        return {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        };
      }
    } catch (error) {
      console.error("Error extracting token usage:", error);
    }
    return {};
  }

  private extractCompletionText(response: any): string | undefined {
    try {
      return response?.choices?.[0]?.message?.content;
    } catch (error) {
      console.error("Error extracting completion text:", error);
      return undefined;
    }
  }

  private calculateCost(tokens: number, model: string): number | undefined {
    // Basic cost estimation - could be enhanced with model-specific pricing
    // OpenRouter typically charges around $0.002-0.02 per 1K tokens
    try {
      const avgCostPer1kTokens = 0.01; // $0.01 per 1K tokens as rough estimate
      return (tokens / 1000) * avgCostPer1kTokens;
    } catch (error) {
      console.error("Error calculating cost:", error);
      return undefined;
    }
  }

  async getModels(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return await response.json();
  }

  async chatCompletion(
    request: ChatCompletionRequest,
    options?: {
      requestId?: string;
      edgeFunction?: string;
      userId?: string;
    }
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY not configured. Please set the environment variable in Supabase Edge Functions."
      );
    }

    const startTime = Date.now();

    // Start logging
    const logData: LLMCallLogData = {
      requestId: options?.requestId,
      model: request.model,
      methodType: "chat_completion",
      inputMessages: request.messages,
      inputParams: {
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stream: request.stream,
        response_format: request.response_format,
      },
      edgeFunction: options?.edgeFunction,
      userId: options?.userId,
    };

    // remove id from any messages
    request.messages = request.messages.map((message) => {
      if (message.id) {
        delete message.id;
      }
      return message;
    });

    const logId = await this.startLog(logData);

    console.log("request", request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error
          ? JSON.stringify(errorData.error)
          : "Unknown error";
        let detailedError = `OpenRouter API error: ${response.statusText} - ${errorMessage}`;

        switch (response.status) {
          case 400:
            detailedError += " - Bad Request (invalid or missing parameters)";
            break;
          case 401:
            detailedError += " - Invalid credentials or API key";
            break;
          case 402:
            detailedError +=
              " - Insufficient credits. Please add more credits to your OpenRouter account";
            break;
          case 403:
            detailedError += " - Content flagged by moderation";
            if (errorData.error?.metadata?.reasons) {
              detailedError += ` (${errorData.error.metadata.reasons.join(
                ", "
              )})`;
            }
            break;
          case 408:
            detailedError += " - Request timeout";
            break;
          case 429:
            detailedError += " - Rate limit exceeded";
            break;
          case 502:
            detailedError += " - Model is down or unavailable";
            break;
          case 503:
            detailedError +=
              " - No available model provider meets routing requirements";
            break;
          default:
            detailedError += ``;
        }

        // Log the error
        if (logId) {
          await this.completeLog(logId, {
            status: "failed",
            errorMessage: detailedError,
            httpStatusCode: response.status,
            responseTimeMs: responseTime,
          });
        }

        throw new Error(detailedError);
      }

      const responseData = await response.json();

      // Extract usage data and completion text
      const tokenUsage = this.extractTokenUsage(responseData);
      const completionText = this.extractCompletionText(responseData);
      const cost = tokenUsage.totalTokens
        ? this.calculateCost(tokenUsage.totalTokens, request.model)
        : undefined;

      // Log successful completion
      if (logId) {
        await this.completeLog(logId, {
          outputResponse: responseData,
          completionText,
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
          costUsd: cost,
          responseTimeMs: responseTime,
          status: "completed",
          httpStatusCode: response.status,
        });
      }

      return responseData;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log any other errors (network errors, JSON parsing, etc.)
      if (logId) {
        await this.completeLog(logId, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          responseTimeMs: responseTime,
        });
      }

      throw error;
    }
  }

  async streamCompletion(
    request: ChatCompletionRequest,
    options?: {
      requestId?: string;
      edgeFunction?: string;
      userId?: string;
    }
  ): Promise<Response> {
    if (!this.apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY not configured. Please set the environment variable in Supabase Edge Functions."
      );
    }

    const startTime = Date.now();

    // Start logging
    const logData: LLMCallLogData = {
      requestId: options?.requestId,
      model: request.model,
      methodType: "stream_completion",
      inputMessages: request.messages,
      inputParams: {
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stream: request.stream,
        response_format: request.response_format,
      },
      edgeFunction: options?.edgeFunction,
      userId: options?.userId,
    };

    const logId = await this.startLog(logData);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || "Unknown error";
        let detailedError = `OpenRouter API error: ${response.statusText}`;

        // Include same error handling as chatCompletion
        switch (response.status) {
          case 400:
            detailedError += " - Bad Request";
            break;
          case 401:
            detailedError += " - Invalid credentials";
            break;
          case 402:
            detailedError += " - Insufficient credits";
            break;
          case 403:
            detailedError += " - Content flagged";
            break;
          case 429:
            detailedError += " - Rate limit exceeded";
            break;
          default:
            detailedError += ` - ${errorMessage}`;
        }

        // Log the error
        if (logId) {
          await this.completeLog(logId, {
            status: "failed",
            errorMessage: detailedError,
            httpStatusCode: response.status,
            responseTimeMs: responseTime,
          });
        }

        throw new Error(detailedError);
      }

      // For streaming, we log the successful start but can't easily capture the full response
      // We'll log it as completed with basic info
      if (logId) {
        await this.completeLog(logId, {
          status: "completed",
          httpStatusCode: response.status,
          responseTimeMs: responseTime,
          completionText: "[Streaming Response - Full text not captured]",
        });
      }

      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...getCorsHeaders,
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log any other errors
      if (logId) {
        await this.completeLog(logId, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          responseTimeMs: responseTime,
        });
      }

      throw error;
    }
  }
}

// Export a singleton instance
export const llmService = new LLMService();
