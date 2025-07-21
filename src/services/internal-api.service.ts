import { supabase } from "@/integrations/supabase/client";

export interface InternalAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface UserData {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  role: 'user' | 'admin';
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
}

export interface OnboardingChatResponse {
  messages: Message[];
  conversationId: string;
  turnCount: number;
  essenceData?: any;
  showCompleteButton?: boolean;
}

export interface SendMessageResponse {
  agentMessage: Message;
  essenceData?: any;
  showCompleteButton?: boolean;
}

export interface OnboardingData {
  userRecord: any;
  agentProfile?: any;
  hasExistingProfile: boolean;
}

export interface EmailInterestData {
  name: string;
  email: string;
  updatesConsent: boolean;
  relatedInitiativesConsent: boolean;
}

export interface DashboardData {
  user: any;
  agentProfile: any | null;
  personalStory: any | null;
  onboardingComplete: boolean;
  agentStats: AgentStats;
}

export interface AgentStats {
  totalMatches: number;
  completedMatches: number;
  totalConversations: number;
  userConversations: number;
  lastMatchDate: string | null;
}

export interface ConversationData {
  id: string;
  user_a_id: string;
  user_b_id: string;
  conversation_summary: string | null;
  quality_score: number | null;
  actual_outcome: string | null;
  created_at: string;
  match_type?: string;
  outcome?: string;
  agent_a?: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
  agent_b?: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
  user_a: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
  user_b: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
}

class InternalAPIService {
  private async callInternalAPI<T = any>(
    action: string,
    params?: any
  ): Promise<T> {
    const { data, error } = await supabase.functions.invoke("internal-api", {
      body: { action, params },
    });

    if (error) {
      throw new Error(error.message || "Internal API error");
    }

    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    return data.data;
  }

  // User Methods
  async getUserData(): Promise<UserData | null> {
    return this.callInternalAPI("getUserData");
  }

  // Onboarding Methods
  async initializeOnboardingChat(params: {
    agentName: string;
    communicationStyle: string;
  }): Promise<OnboardingChatResponse> {
    return this.callInternalAPI("initializeOnboardingChat", params);
  }

  async sendOnboardingMessage(params: {
    conversationId: string;
    message: string;
    agentName: string;
    communicationStyle: string;
    currentMessages: Message[];
    turnCount: number;
  }): Promise<SendMessageResponse> {
    return this.callInternalAPI("sendOnboardingMessage", params);
  }

  async completeOnboarding(params: {
    conversationId: string;
  }): Promise<{ success: boolean }> {
    return this.callInternalAPI("completeOnboarding", params);
  }

  // Onboarding Page Methods
  async getOnboardingData(): Promise<OnboardingData> {
    return this.callInternalAPI("getOnboardingData");
  }

  async saveAgentPersonalization(params: {
    agentName: string;
    communicationStyle: string;
  }): Promise<{ success: boolean }> {
    return this.callInternalAPI("saveAgentPersonalization", params);
  }

  async getPersonalStory(): Promise<any> {
    return this.callInternalAPI("getPersonalStory");
  }

  async updateUserTimezone(params: {
    timezone: string;
  }): Promise<{ success: boolean }> {
    return this.callInternalAPI("updateUserTimezone", params);
  }

  // Email Interest Methods
  async submitEmailInterest(params: EmailInterestData): Promise<{ success: boolean; message: string }> {
    return this.callInternalAPI("submitEmailInterest", params);
  }

  // Dashboard Methods
  async getDashboardData(): Promise<DashboardData> {
    return this.callInternalAPI("getDashboardData");
  }

  // Agent Operations
  async updateAgentName(agentProfileId: string, newName: string): Promise<{ success: boolean }> {
    return this.callInternalAPI("updateAgentName", { agentProfileId, newName });
  }

  // User Utilities
  async getUserInternalId(authUserId: string): Promise<string> {
    return this.callInternalAPI("getUserInternalId", { authUserId });
  }

  // Networking Data Methods
  async getNetworkingStats(userId: string): Promise<AgentStats> {
    return this.callInternalAPI("getNetworkingStats", { userId });
  }

  async getUserConversations(
    userId: string, 
    options?: { offset?: number; limit?: number }
  ): Promise<ConversationData[]> {
    return this.callInternalAPI("getUserConversations", { userId, ...options });
  }
}

export const internalAPIService = new InternalAPIService();