/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

// Types
export interface OmniscientMatch {
  id: string;
  user_a_id: string;
  user_b_id: string;
  opportunity_score: number;
  predicted_outcome:
    | "STRONG_MATCH"
    | "EXPLORATORY"
    | "FUTURE_POTENTIAL"
    | "NO_MATCH";
  status:
    | "pending_analysis"
    | "analyzed"
    | "scheduled"
    | "active"
    | "completed"
    | "cancelled";
  scheduled_for?: string;
  analysis_summary?: string;
  match_reasoning?: string;
  analyzed_at?: string;
  should_notify?: boolean;
  notification_score?: number;
  notification_reasoning?: string;
  introduction_rationale_for_user_a?: string;
  introduction_rationale_for_user_b?: string;
  agent_summaries_agent_a_to_human_a?: string;
  agent_summaries_agent_b_to_human_b?: string;
  created_at: string;
  updated_at: string;
  user_a?: { id: string; handle: string };
  user_b?: { id: string; handle: string };
  insights?: OmniscientMatchInsight[];
}

export interface OmniscientInsight {
  id: string;
  insight_type:
    | "opportunity"
    | "synergy"
    | "risk"
    | "hidden_asset"
    | "network_effect"
    | "next_step";
  title: string;
  description: string;
  score?: number;
  metadata?: any;
  created_at: string;
}

export interface OmniscientMatchInsight {
  id: string;
  match_id: string;
  insight_id: string;
  relevance_score: number;
  created_at: string;
  insight: OmniscientInsight;
}

export interface OmniscientConversation {
  id: string;
  match_id: string;
  status: "scheduled" | "active" | "completed" | "failed";
  actual_outcome?:
    | "STRONG_MATCH"
    | "EXPLORATORY"
    | "FUTURE_POTENTIAL"
    | "NO_MATCH";
  outcome_match_score?: number;
  quality_score?: number;
  conversation_summary?: string;
  key_moments?: any[];
  deviation_analysis?: string;
  model_used?: string;
  total_tokens?: number;
  total_cost?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  match?: OmniscientMatch;
  turns?: OmniscientTurn[];
}

export interface OmniscientTurn {
  id: string;
  conversation_id: string;
  turn_number: number;
  speaker_user_id: string;
  speaker_role: "agent_a" | "agent_b";
  message: string;
  guided_by_insights?: string[];
  opportunity_alignment_score?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface OmniscientOutcome {
  id: string;
  conversation_id: string;
  match_id: string;
  outcome_analysis: string;
  collaboration_readiness_score: number;
  specific_next_steps: any[];
  follow_up_recommended: boolean;
  follow_up_timeframe?: string;
  actual_collaboration_tracked: boolean;
  collaboration_details?: any;
  created_at: string;
  updated_at: string;
  conversation?: OmniscientConversation;
}

export interface OmniscientAnalytics {
  totalMatches: number;
  averageOpportunityScore: number;
  conversionRate: number;
  topInsightTypes: { type: string; count: number }[];
  outcomeDistribution: { outcome: string; count: number }[];
  systemHealth: {
    processingBacklog: number;
    averageProcessingTime: number;
    errorRate: number;
  };
}

export interface OmniscientProcessingLog {
  id: string;
  process_type: string;
  action: string;
  status: "started" | "completed" | "failed";
  target_id?: string;
  target_type?: string;
  metadata?: any;
  error_message?: string;
  processing_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  created_at: string;
  completed_at?: string;
}

export interface OmniscientSystemHealth {
  processingBacklog: number;
  activeConversations: number;
  errorRate: number;
  recentErrors: OmniscientProcessingLog[];
  uptime: string;
}

export interface OmniscientDashboardData {
  analytics: OmniscientAnalytics;
  recentMatches: OmniscientMatch[];
  activeConversations: OmniscientConversation[];
  systemHealth: OmniscientSystemHealth;
}

export interface OmniscientMorningReport {
  id: string;
  user_id: string;
  report_date: string;
  match_notifications: MatchNotification[];
  match_summaries: MatchSummaries;
  agent_insights: AgentInsights;
  notification_count: number;
  total_opportunity_score: number;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    handle: string;
  };
}

export interface MatchNotification {
  match_id: string;
  other_user: {
    id: string;
    handle: string;
    email: string;
  };
  notification_score: number;
  opportunity_score: number;
  predicted_outcome: string;
  notification_reasoning: string;
  introduction_rationale: string;
  agent_summary: string;
  match_reasoning: string;
  insights: any[];
  created_at: string;
}

export interface MatchSummaries {
  total_matches: number;
  average_opportunity_score: number;
  top_outcomes: Record<string, number>;
  highest_scoring_match: number;
}

export interface AgentInsights {
  patterns_observed: string[];
  top_opportunities: string[];
  recommended_actions: string[];
}

// Service implementation
class OmniscientService {
  private async callFunction(
    action: string,
    params?: any,
    adminOverride?: boolean
  ) {
    console.log(`Calling omniscient function: ${action}`, params);

    const { data, error } = await supabase.functions.invoke(
      "omniscient-system",
      {
        body: { action, params, adminOverride },
      }
    );

    if (error) {
      console.error(`Omniscient function error (${action}):`, error);
      throw new Error(`Failed to execute ${action}: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || `Unknown error in ${action}`);
    }

    return data;
  }

  // Match Operations
  async analyzeMatches(params?: { batchSize?: number }): Promise<{
    summary: {
      totalUsers: number;
      pairsGenerated: number;
      matchesAnalyzed: number;
      highValueMatches: number;
      scheduled: number;
      averageOpportunityScore: number;
    };
    matches: OmniscientMatch[];
  }> {
    return this.callFunction("analyzeMatches", params, true);
  }

  async getMatches(filters?: {
    status?: string;
    minScore?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<OmniscientMatch[]> {
    const result = await this.callFunction("getMatches", filters);
    return result.data || [];
  }

  async getMatchInsights(matchId: string): Promise<{ match: OmniscientMatch }> {
    return this.callFunction("getMatchInsights", { matchId });
  }

  async getMatch(matchId: string): Promise<OmniscientMatch> {
    const result = await this.callFunction("getMatch", { matchId });
    return result.data;
  }

  // Conversation Operations
  async executeConversation(matchId: string): Promise<{
    conversation: OmniscientConversation;
    turns: number;
    qualityScore: number;
    outcome: string;
    totalTokens: number;
  }> {
    return this.callFunction("executeConversation", { matchId }, true);
  }

  async getConversation(
    conversationId: string
  ): Promise<OmniscientConversation> {
    const result = await this.callFunction("getConversation", { conversationId });
    return result.data;
  }

  async getConversations(filters?: {
    matchId?: string;
    status?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<OmniscientConversation[]> {
    const result = await this.callFunction("getConversations", filters);
    return result.data || [];
  }

  async monitorConversation(conversationId: string) {
    // Subscribe to real-time updates for conversation turns
    const subscription = supabase
      .channel(`omniscient-conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "omniscient_turns",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Conversation turn update:", payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "omniscient_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Conversation status update:", payload);
        }
      )
      .subscribe();

    return subscription;
  }

  // Processing Operations
  async processMidnight(userId?: string): Promise<{
    summary: {
      scheduledMatches: number;
      activatedMatches: number;
    };
    activatedMatches: OmniscientMatch[];
  }> {
    return this.callFunction("processUserMidnight", { userId }, true);
  }

  async generateReports(date?: string): Promise<any> {
    return this.callFunction("generateReport", { date }, true);
  }

  // Morning Reports Operations
  async generateMorningReports(options: {
    date?: string;
    forceRegenerate?: boolean;
    userId?: string;
  } = {}): Promise<{
    summary: {
      date: string;
      totalMatches: number;
      usersWithReports: number;
      reportsGenerated: number;
      matchesMarkedAsReported: number;
      isIncremental: boolean;
      forceRegenerate: boolean;
      averageNotificationsPerUser: number;
    };
    reports: any[];
  }> {
    return this.callFunction("generateMorningReports", options, true);
  }

  async sendMorningReportEmails(options: {
    date?: string;
    userIds?: string[];
    templateOverride?: string;
    forceResend?: boolean;
    dryRun?: boolean;
    emailOverride?: string;
  } = {}): Promise<{
    summary: {
      date: string;
      totalReports: number;
      emailsSent: number;
      emailsFailed: number;
      successRate: number;
      isForceResend: boolean;
      isDryRun: boolean;
    };
    emailResults: any[];
  }> {
    return this.callFunction("sendMorningReportEmails", options, true);
  }

  async sendSingleMorningReportEmail(options: {
    reportId: string;
    forceResend?: boolean;
    dryRun?: boolean;
    emailOverride?: string;
  }): Promise<{
    summary: {
      message: string;
      date: string;
      emailsSent: number;
      emailsFailed: number;
      isForceResend: boolean;
      isDryRun: boolean;
    };
    data?: any[];
  }> {
    return this.callFunction("sendMorningReportEmails", options, true);
  }

  async getMorningReports(filters?: {
    userId?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<OmniscientMorningReport[]> {
    const result = await this.callFunction("getMorningReports", filters);
    return result.data || [];
  }

  async getUserMorningReport(userId: string, date?: string): Promise<OmniscientMorningReport | null> {
    const result = await this.callFunction("getUserMorningReport", { userId, date });
    return result.data;
  }

  async getMorningReportEmailStatus(date?: string): Promise<{
    date: string;
    totalReports: number;
    emailsSent: number;
    emailsPending: number;
    successRate: number;
  }> {
    const result = await this.callFunction("getMorningReportEmailStatus", { date });
    return result.data;
  }

  // Analytics Operations
  async getAnalytics(dateRange?: {
    start: string;
    end: string;
  }): Promise<OmniscientAnalytics> {
    const rtnObj = await this.callFunction("getAnalytics", { dateRange });
    console.log(rtnObj);
    return rtnObj;
  }

  async getSystemHealth(): Promise<OmniscientSystemHealth> {
    return this.callFunction("getSystemHealth");
  }

  async getProcessingLogs(filters?: {
    processType?: string;
    status?: string;
    limit?: number;
  }): Promise<OmniscientProcessingLog[]> {
    const result = await this.callFunction("getProcessingLogs", filters);
    return result.data || [];
  }

  // Admin Operations
  async manualMatch(
    userIdA: string,
    userIdB: string
  ): Promise<{
    success: boolean;
    data: {
      match: OmniscientMatch;
      analysis: any;
    };
  }> {
    return this.callFunction("manualMatch", { userIdA, userIdB }, true);
  }

  async overrideInsights(
    matchId: string,
    insights: Partial<OmniscientInsight>[]
  ): Promise<any> {
    return this.callFunction("overrideInsights", { matchId, insights }, true);
  }

  async getAdminDashboard(): Promise<OmniscientDashboardData> {
    try {
      const [analytics, recentMatches, activeConversations, systemHealth] =
        await Promise.all([
          this.getAnalytics(),
          this.getMatches({ limit: 10 }),
          this.getConversations({ status: "active" }),
          this.getSystemHealth(),
        ]);

      return {
        analytics,
        recentMatches,
        activeConversations,
        systemHealth,
      };
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      throw new Error(
        `Failed to fetch dashboard data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Outcome Operations
  async getOutcomes(filters?: {
    conversationId?: string;
    followUpRecommended?: boolean;
    limit?: number;
  }): Promise<OmniscientOutcome[]> {
    const result = await this.callFunction("getOutcomes", filters);
    return result.data || [];
  }

  async analyzeOutcome(conversationId: string): Promise<any> {
    return this.callFunction("analyzeOutcome", { conversationId }, true);
  }

  // Real-time subscriptions
  subscribeToMatches(callback: (match: OmniscientMatch) => void) {
    return supabase
      .channel("omniscient-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "omniscient_matches",
        },
        (payload) => {
          console.log("Match update:", payload);
          callback(payload.new as OmniscientMatch);
        }
      )
      .subscribe();
  }

  subscribeToConversations(
    callback: (conversation: OmniscientConversation) => void
  ) {
    return supabase
      .channel("omniscient-conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "omniscient_conversations",
        },
        (payload) => {
          console.log("Conversation update:", payload);
          callback(payload.new as OmniscientConversation);
        }
      )
      .subscribe();
  }

  // Utility methods
  formatOpportunityScore(score: number): string {
    return (score * 100).toFixed(1) + "%";
  }

  getMatchStatusColor(status: string): string {
    const colors = {
      pending_analysis: "bg-yellow-500",
      analyzed: "bg-blue-500",
      scheduled: "bg-purple-500",
      active: "bg-green-500",
      completed: "bg-gray-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-400";
  }

  getOutcomeColor(outcome: string): string {
    const colors = {
      STRONG_MATCH: "text-green-600",
      EXPLORATORY: "text-blue-600",
      FUTURE_POTENTIAL: "text-yellow-600",
      NO_MATCH: "text-red-600",
    };
    return colors[outcome] || "text-gray-600";
  }

  formatInsightType(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

// Export singleton instance
export const omniscientService = new OmniscientService();
