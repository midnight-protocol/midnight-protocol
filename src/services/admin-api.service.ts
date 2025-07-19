import { supabase } from "@/integrations/supabase/client";

export interface AdminAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface UserFilters {
  search?: string;
  status?: string;
  dateRange?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SystemHealth {
  database: {
    status: "healthy" | "degraded" | "down";
    latency: number;
    message?: string;
  };
  aiService: {
    status: "healthy" | "degraded" | "down";
    latency: number;
    provider: string;
    message?: string;
  };
  emailService: {
    status: "healthy" | "degraded" | "down";
    deliveryRate: number;
    failedCount: number;
    message?: string;
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

export interface AlertThresholds {
  api_response_time: number;
  batch_completion_rate: number;
  email_delivery_rate: number;
  active_users_ratio: number;
}

export interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  status: "healthy" | "warning" | "critical";
  lastChecked: Date;
}

export interface UserStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  activeToday: number;
  newThisWeek: number;
}

export interface UserSearchResult {
  users: any[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConversationFilters {
  userId?: string;
  status?: string;
  dateRange?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityLogFilters {
  limit?: number;
  offset?: number;
  adminId?: string;
}

export interface MetricsTimeRange {
  timeRange: "7d" | "30d" | "90d";
}

export interface RunPromptOptions {
  // Either template name or ID (one required)
  templateName?: string;
  templateId?: string;
  
  // Variables to interpolate in the template
  variables: Record<string, string>;
  
  // Optional LLM parameters
  model?: string;
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
  additionalMessages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

export interface PromptResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  templateUsed: string;
  templateVersion: number;
  model: string;
}

export interface LLMLogFilters {
  model?: string;
  status?: 'started' | 'completed' | 'failed';
  methodType?: 'chat_completion' | 'stream_completion';
  edgeFunction?: string;
  userId?: string;
  dateRange?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface LLMLog {
  id: string;
  request_id?: string;
  model: string;
  method_type: 'chat_completion' | 'stream_completion';
  status: 'started' | 'completed' | 'failed';
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  response_time_ms?: number;
  edge_function?: string;
  user_id?: string;
  error_message?: string;
  http_status_code?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  users?: { handle: string };
}

export interface LLMLogSearchResult {
  logs: LLMLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LLMLogStats {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  successRate: number;
  modelBreakdown: Record<string, number>;
  costBreakdown: Record<string, number>;
}

export interface EmailInterestFilters {
  search?: string;
  dateRange?: string;
  updatesConsent?: boolean;
  relatedInitiativesConsent?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface EmailInterest {
  id: string;
  name: string;
  email: string;
  updates_consent: boolean;
  related_initiatives_consent: boolean;
  created_at: string;
}

export interface EmailInterestSearchResult {
  interests: EmailInterest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmailInterestStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  consent: {
    updates: number;
    relatedInitiatives: number;
    both: number;
  };
  recentActivity: Record<string, number>;
}

class AdminAPIService {
  private async callAdminAPI<T = any>(
    action: string,
    params?: any
  ): Promise<T> {
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action, params },
    });

    if (error) {
      throw new Error(error.message || "Admin API error");
    }

    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    return data.data;
  }

  // System Health
  async getSystemHealth(): Promise<SystemHealth> {
    return this.callAdminAPI("getSystemHealth");
  }

  async updateAlertThreshold(key: string, value: number): Promise<void> {
    return this.callAdminAPI("updateAlertThreshold", { key, value });
  }

  async getAlertThresholds(): Promise<AlertThresholds> {
    return this.callAdminAPI("getAlertThresholds");
  }

  async resolveAlert(alertId: string): Promise<void> {
    return this.callAdminAPI("resolveAlert", { alertId });
  }

  async getHealthMetrics(): Promise<HealthMetric[]> {
    const [health, thresholds] = await Promise.all([
      this.getSystemHealth(),
      this.getAlertThresholds(),
    ]);

    return [
      {
        name: "API Response Time",
        value: health.metrics.apiResponseTime,
        threshold: thresholds.api_response_time,
        unit: "ms",
        status: this.getMetricStatus(
          health.metrics.apiResponseTime,
          thresholds.api_response_time,
          "lower"
        ),
        lastChecked: new Date(),
      },
      {
        name: "Batch Completion Rate",
        value: health.metrics.batchCompletionRate,
        threshold: thresholds.batch_completion_rate,
        unit: "%",
        status: this.getMetricStatus(
          health.metrics.batchCompletionRate,
          thresholds.batch_completion_rate,
          "higher"
        ),
        lastChecked: new Date(),
      },
      {
        name: "Email Delivery Rate",
        value: health.emailService.deliveryRate,
        threshold: thresholds.email_delivery_rate,
        unit: "%",
        status: this.getMetricStatus(
          health.emailService.deliveryRate,
          thresholds.email_delivery_rate,
          "higher"
        ),
        lastChecked: new Date(),
      },
      {
        name: "Active Users Ratio",
        value: health.metrics.activeUsersRatio,
        threshold: thresholds.active_users_ratio,
        unit: "%",
        status: this.getMetricStatus(
          health.metrics.activeUsersRatio,
          thresholds.active_users_ratio,
          "higher"
        ),
        lastChecked: new Date(),
      },
    ];
  }

  private getMetricStatus(
    value: number,
    threshold: number,
    comparison: "higher" | "lower"
  ): "healthy" | "warning" | "critical" {
    if (comparison === "higher") {
      if (value >= threshold) return "healthy";
      if (value >= threshold * 0.8) return "warning";
      return "critical";
    } else {
      if (value <= threshold) return "healthy";
      if (value <= threshold * 1.2) return "warning";
      return "critical";
    }
  }

  // User Management
  async getUserStats(): Promise<UserStats> {
    return this.callAdminAPI("getUserStats");
  }

  async searchUsers(filters: UserFilters): Promise<UserSearchResult> {
    return this.callAdminAPI("searchUsers", filters);
  }

  async getUserDetails(userId: string): Promise<any> {
    return this.callAdminAPI("getUserDetails", { userId });
  }

  async updateUserStatus(
    userId: string,
    status: "PENDING" | "APPROVED" | "REJECTED"
  ): Promise<any> {
    return this.callAdminAPI("updateUserStatus", {
      userId,
      status,
      target_type: "user",
      target_id: userId,
    });
  }

  async bulkUserOperation(
    userIds: string[],
    operation: "approve" | "reject"
  ): Promise<any> {
    return this.callAdminAPI("bulkUserOperation", {
      userIds,
      operation,
      target_type: "user",
    });
  }

  async sendBulkEmails(
    userIds: string[],
    subject: string,
    template: string
  ): Promise<any> {
    return this.callAdminAPI("sendBulkEmails", {
      userIds,
      subject,
      template,
      target_type: "user",
    });
  }

  // Test User Management
  async createTestUsers(count: number = 10): Promise<{
    created: number;
    users: any[];
  }> {
    return this.callAdminAPI("createTestUsers", { count });
  }

  async deleteAllTestUsers(): Promise<{
    deleted: number;
    message: string;
  }> {
    return this.callAdminAPI("deleteAllTestUsers");
  }

  async getTestUsers(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    users: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.callAdminAPI("getTestUsers", params || {});
  }

  async getUserMatches(userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    matches: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.callAdminAPI("getUserMatches", { userId, ...(params || {}) });
  }

  async getMatchInsights(matchId: string): Promise<{
    insights: any[];
  }> {
    return this.callAdminAPI("getMatchInsights", { matchId });
  }

  async getUserConversations(userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    conversations: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.callAdminAPI("getUserConversations", { userId, ...(params || {}) });
  }

  async getConversationTurns(conversationId: string): Promise<{
    turns: any[];
  }> {
    return this.callAdminAPI("getConversationTurns", { conversationId });
  }

  // Conversations
  async getConversations(filters: ConversationFilters): Promise<any> {
    return this.callAdminAPI("getConversations", filters);
  }

  async getConversationDetails(conversationId: string): Promise<any> {
    return this.callAdminAPI("getConversationDetails", { conversationId });
  }

  async exportConversations(
    filters: ConversationFilters,
    format: "csv" | "json"
  ): Promise<any> {
    return this.callAdminAPI("exportConversations", { ...filters, format });
  }

  // Configuration
  async getSystemConfigs(category?: string): Promise<any> {
    return this.callAdminAPI("getSystemConfigs", { category });
  }

  async updateSystemConfig(configId: string, value: any): Promise<any> {
    return this.callAdminAPI("updateSystemConfig", {
      configId,
      value,
      target_type: "config",
      target_id: configId,
    });
  }

  async getConfigHistory(configKey?: string, limit?: number): Promise<any> {
    return this.callAdminAPI("getConfigHistory", { configKey, limit });
  }

  // Activity Logs
  async getActivityLogs(filters?: ActivityLogFilters): Promise<any> {
    return this.callAdminAPI("getActivityLogs", filters || {});
  }

  async exportActivityLogs(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<any> {
    return this.callAdminAPI("exportActivityLogs", { dateRange });
  }

  // Metrics
  async getNetworkMetrics(): Promise<any> {
    return this.callAdminAPI("getNetworkMetrics");
  }

  async getMetrics(timeRange: "7d" | "30d" | "90d"): Promise<any> {
    return this.callAdminAPI("getMetrics", { timeRange });
  }

  async refreshMetricsCache(): Promise<any> {
    return this.callAdminAPI("refreshMetricsCache");
  }

  async exportMetrics(
    timeRange: "7d" | "30d" | "90d",
    format?: "csv" | "json"
  ): Promise<any> {
    return this.callAdminAPI("exportMetrics", { timeRange, format });
  }

  // Prompt Templates
  async getPromptTemplates(): Promise<any[]> {
    return this.callAdminAPI("getPromptTemplates");
  }

  async getPromptTemplate(templateId: string): Promise<{
    template: any;
    versions: any[];
  }> {
    return this.callAdminAPI("getPromptTemplate", { templateId });
  }

  async createPromptTemplate(data: {
    name: string;
    description?: string;
    template_text: string;
    is_json_response?: boolean;
    json_schema?: any;
    llm_model?: string;
  }): Promise<any> {
    return this.callAdminAPI("createPromptTemplate", {
      ...data,
      target_type: "prompt_template",
      target_id: "new",
    });
  }

  async updatePromptTemplate(
    templateId: string,
    data: {
      template_text: string;
      description?: string;
      changeNotes?: string;
      is_json_response?: boolean;
      json_schema?: any;
      llm_model?: string;
    }
  ): Promise<any> {
    return this.callAdminAPI("updatePromptTemplate", {
      templateId,
      ...data,
      target_type: "prompt_template",
      target_id: templateId,
    });
  }

  async getPromptVersions(templateId: string): Promise<any[]> {
    return this.callAdminAPI("getPromptVersions", { templateId });
  }

  async restorePromptVersion(
    templateId: string,
    versionId: string
  ): Promise<any> {
    return this.callAdminAPI("restorePromptVersion", {
      templateId,
      versionId,
      target_type: "prompt_template",
      target_id: templateId,
    });
  }

  async getAvailableModels(): Promise<
    Array<{
      id: string;
      name: string;
      contextLength?: number;
      pricing?: any;
    }>
  > {
    return this.callAdminAPI("getAvailableModels");
  }

  async exportPromptTemplates(templateIds?: string[]): Promise<any> {
    return this.callAdminAPI("exportPromptTemplates", { templateIds });
  }

  async importPromptTemplates(
    importData: any,
    conflictStrategy?: 'skip' | 'overwrite' | 'rename'
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
    templates: any[];
  }> {
    return this.callAdminAPI("importPromptTemplates", {
      importData,
      conflictStrategy,
      target_type: "prompt_template",
      target_id: "import",
    });
  }

  // Prompt Execution
  async runPrompt(options: RunPromptOptions): Promise<PromptResponse> {
    return this.callAdminAPI("runPrompt", options);
  }

  /**
   * Helper method for running prompts that return JSON
   */
  async runJsonPrompt<T = any>(
    options: RunPromptOptions
  ): Promise<{ data: T; metadata: Omit<PromptResponse, "response"> }> {
    const response = await this.runPrompt(options);
    
    try {
      const parsedData = JSON.parse(response.response);
      return {
        data: parsedData as T,
        metadata: {
          usage: response.usage,
          templateUsed: response.templateUsed,
          templateVersion: response.templateVersion,
          model: response.model,
        },
      };
    } catch (error) {
      throw new Error("Failed to parse JSON response from prompt");
    }
  }

  // LLM Logs
  async getLLMLogs(filters: LLMLogFilters): Promise<LLMLogSearchResult> {
    return this.callAdminAPI("getLLMLogs", filters);
  }

  async getLLMLogDetails(logId: string): Promise<LLMLog & { 
    input_messages: any; 
    input_params: any; 
    output_response: any; 
    completion_text?: string;
  }> {
    return this.callAdminAPI("getLLMLogDetails", { logId });
  }

  async getLLMLogStats(dateRange?: string): Promise<LLMLogStats> {
    return this.callAdminAPI("getLLMLogStats", { dateRange });
  }

  async exportLLMLogs(
    filters: LLMLogFilters,
    format: "csv" | "json" = "json"
  ): Promise<{ data: string; filename: string }> {
    return this.callAdminAPI("exportLLMLogs", { ...filters, format });
  }

  // Email Interests
  async getEmailInterests(filters: EmailInterestFilters): Promise<EmailInterestSearchResult> {
    return this.callAdminAPI("getEmailInterests", filters);
  }

  async getEmailInterestStats(): Promise<EmailInterestStats> {
    return this.callAdminAPI("getEmailInterestStats");
  }

  async exportEmailInterests(
    filters: EmailInterestFilters,
    format: "csv" | "json" = "csv"
  ): Promise<{ data: string; filename: string; contentType: string }> {
    return this.callAdminAPI("exportEmailInterests", { ...filters, format });
  }

  async deleteEmailInterest(interestId: string): Promise<{ success: boolean }> {
    return this.callAdminAPI("deleteEmailInterest", {
      interestId,
      target_type: "email_interest",
      target_id: interestId,
    });
  }
}

export const adminAPIService = new AdminAPIService();
