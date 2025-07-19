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
    let query = supabase
      .from("omniscient_matches")
      .select(
        `
        *,
        user_a:users!user_a_id(id, handle),
        user_b:users!user_b_id(id, handle),
        insights:omniscient_match_insights(
          id,
          relevance_score,
          insight:omniscient_insights(*)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.minScore) {
      query = query.gte("opportunity_score", filters.minScore);
    }
    if (filters?.userId) {
      query = query.or(
        `user_a_id.eq.${filters.userId},user_b_id.eq.${filters.userId}`
      );
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching matches:", error);
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    return data || [];
  }

  async getMatchInsights(matchId: string): Promise<{ match: OmniscientMatch }> {
    return this.callFunction("getMatchInsights", { matchId });
  }

  async getMatch(matchId: string): Promise<OmniscientMatch> {
    const { data, error } = await supabase
      .from("omniscient_matches")
      .select(
        `
        *,
        user_a:users!user_a_id(id, handle),
        user_b:users!user_b_id(id, handle),
        insights:omniscient_match_insights(
          id,
          relevance_score,
          insight:omniscient_insights(*)
        )
      `
      )
      .eq("id", matchId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch match: ${error.message}`);
    }

    return data;
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
    const { data, error } = await supabase
      .from("omniscient_conversations")
      .select(
        `
        *,
        match:omniscient_matches!match_id(
          *,
          user_a:users!user_a_id(id, handle),
          user_b:users!user_b_id(id, handle)
        ),
        turns:omniscient_turns(*),
        outcomes:omniscient_outcomes(*)
      `
      )
      .eq("id", conversationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data;
  }

  async getConversations(filters?: {
    matchId?: string;
    status?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<OmniscientConversation[]> {
    let query = supabase
      .from("omniscient_conversations")
      .select(
        `
        *,
        match:omniscient_matches!match_id(
          *,
          user_a:users!user_a_id(id, handle),
          user_b:users!user_b_id(id, handle)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.matchId) {
      query = query.eq("match_id", filters.matchId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.dateRange) {
      query = query.gte("created_at", filters.dateRange.start);
      query = query.lte("created_at", filters.dateRange.end);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return data || [];
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
    analy;
    processType?: string;
    status?: string;
    limit?: number;
  }): Promise<OmniscientProcessingLog[]> {
    let query = supabase
      .from("omniscient_processing_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.processType) {
      query = query.eq("process_type", filters.processType);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch processing logs: ${error.message}`);
    }

    return data || [];
  }

  // Admin Operations
  async manualMatch(
    userIdA: string,
    userIdB: string
  ): Promise<{
    match: OmniscientMatch;
    analysis: any;
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
    let query = supabase
      .from("omniscient_outcomes")
      .select(
        `
        *,
        conversation:omniscient_conversations(*),
        match:omniscient_matches(*)
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.conversationId) {
      query = query.eq("conversation_id", filters.conversationId);
    }
    if (filters?.followUpRecommended !== undefined) {
      query = query.eq("follow_up_recommended", filters.followUpRecommended);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch outcomes: ${error.message}`);
    }

    return data || [];
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
