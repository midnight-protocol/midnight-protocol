/**
 * Shared type definitions for all edge functions
 *
 * This file contains common types used across multiple edge functions
 * to ensure consistency and reduce duplication.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// API Request/Response interfaces
export interface InternalRequest {
  action: string;
  params?: any;
}

export interface InternalResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface AdminRequest {
  action: string;
  params?: any;
}

export interface AdminResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// User data interfaces
export interface UserData {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: "user" | "admin";
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  role: string;
  handle: string;
  email?: string;
}

// Additional user status and role types for type safety
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";
export type UserRole = "user" | "admin" | "moderator" | "test";

// Activity logging
export interface ActivityLog {
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

// System health monitoring
export interface SystemHealthStatus {
  status: "healthy" | "degraded" | "down";
  latency?: number;
  message?: string;
}

export interface SystemHealth {
  database: SystemHealthStatus & { latency: number };
  aiService: SystemHealthStatus & { provider: string; latency: number };
  emailService: SystemHealthStatus & {
    deliveryRate: number;
    failedCount: number;
  };
  metrics: {
    apiResponseTime: number;
    batchCompletionRate: number;
    activeUsersRatio: number;
    conversationSuccessRate: number;
  };
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  timestamp: string;
  metric?: string;
  value?: number;
  threshold?: number;
  resolved?: boolean;
}

// Filter interfaces
export interface UserFilters {
  search?: string;
  status?: string;
  dateRange?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ConversationFilters {
  userId?: string;
  status?: string;
  dateRange?: string;
  limit?: number;
  offset?: number;
}

export interface MetricsTimeRange {
  timeRange: "7d" | "30d" | "90d";
}

// Function type definitions
export type AdminAction = (
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) => Promise<any>;

// Run Prompt interfaces
export interface RunPromptRequest {
  // Either template name or ID (one required)
  templateName?: string;
  templateId?: string;

  // Variables to interpolate in the template
  variables: Record<string, string>;

  // Optional LLM parameters
  model?: string; // defaults to prompt default if not provided
  temperature?: number;
  maxTokens?: number;
  responseFormat?: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
    };
  };

  // Optional messages to append after the system prompt
  additionalMessages?: any[]; // ChatMessage[] from llm-service
}

export interface RunPromptResponse {
  success: boolean;
  data?: {
    response: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    templateUsed: string;
    templateVersion: number;
    model: string;
  };
  error?: string;
  timestamp: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  template_text: string;
  variables: string[];
  version: number;
  is_json_response: boolean;
  json_schema?: any; // JSON schema object
  default_temperature?: number;
  llm_model?: string;
}
