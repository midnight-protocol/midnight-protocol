import { supabase } from "@/integrations/supabase/client";
import { AdminAPIService } from "./admin-api.service";
import { InternalAPIService } from "./internal-api.service";
import { OmniscientService } from "./omniscient.service";
import { TestProfile, generateTestUserData } from "@/data/e2e-test-profiles";

export interface TestUser {
  id: string;
  email: string;
  handle: string;
  databaseId: string;
  authToken?: string;
  agentProfileId?: string;
  conversationId?: string;
  status: string;
}

export interface TestOutput {
  timestamp: string;
  phase: string;
  action: string;
  request?: any;
  response?: any;
  error?: string;
  duration?: number;
  success: boolean;
}

export interface TestState {
  adminUser?: TestUser;
  testUsers: TestUser[];
  currentPhase: number;
  outputs: TestOutput[];
  createdRecords: {
    users: string[];
    agentProfiles: string[];
    conversations: string[];
    matches: string[];
    reports: string[];
  };
}

class E2ETestService {
  private adminAPI: AdminAPIService;
  private internalAPI: InternalAPIService;
  private omniscientService: OmniscientService;
  private state: TestState;

  constructor() {
    this.adminAPI = new AdminAPIService();
    this.internalAPI = new InternalAPIService();
    this.omniscientService = new OmniscientService();
    this.state = {
      testUsers: [],
      currentPhase: 0,
      outputs: [],
      createdRecords: {
        users: [],
        agentProfiles: [],
        conversations: [],
        matches: [],
        reports: []
      }
    };
  }

  private addOutput(output: Partial<TestOutput>) {
    const fullOutput: TestOutput = {
      timestamp: new Date().toISOString(),
      phase: `Phase ${this.state.currentPhase}`,
      action: "",
      success: true,
      ...output
    };
    this.state.outputs.push(fullOutput);
    return fullOutput;
  }

  private async executeWithTracking<T>(
    action: string,
    fn: () => Promise<T>
  ): Promise<{ data?: T; output: TestOutput }> {
    const startTime = Date.now();
    let output: TestOutput;

    try {
      const data = await fn();
      output = this.addOutput({
        action,
        response: data,
        duration: Date.now() - startTime,
        success: true
      });
      return { data, output };
    } catch (error) {
      output = this.addOutput({
        action,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }

  // Phase 1: User Signup & Authentication
  async createTestUser(
    email: string,
    password: string,
    handle: string
  ): Promise<{ user: TestUser; output: TestOutput }> {
    this.state.currentPhase = 1;

    const result = await this.executeWithTracking(
      "Create Test User",
      async () => {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { handle }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create auth user");

        // Get the database user record
        const { data: dbUser, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_user_id", authData.user.id)
          .single();

        if (dbError) throw dbError;

        const testUser: TestUser = {
          id: authData.user.id,
          email: authData.user.email!,
          handle: dbUser.handle,
          databaseId: dbUser.id,
          authToken: authData.session?.access_token,
          status: dbUser.status
        };

        this.state.testUsers.push(testUser);
        this.state.createdRecords.users.push(authData.user.id);

        return testUser;
      }
    );

    return { user: result.data!, output: result.output };
  }

  // Phase 2: Onboarding Process
  async saveAgentPersonalization(
    userId: string,
    agentName: string,
    communicationStyle: string
  ): Promise<TestOutput> {
    this.state.currentPhase = 2;

    const user = this.state.testUsers.find(u => u.databaseId === userId);
    if (!user) throw new Error("Test user not found");

    const result = await this.executeWithTracking(
      "Save Agent Personalization",
      async () => {
        const response = await this.internalAPI.saveAgentPersonalization({
          agentName,
          communicationStyle
        });

        // Get agent profile ID
        const { data: agentProfile } = await supabase
          .from("agent_profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (agentProfile) {
          user.agentProfileId = agentProfile.id;
          this.state.createdRecords.agentProfiles.push(agentProfile.id);
        }

        return response;
      }
    );

    return result.output;
  }

  async initializeOnboardingChat(
    userId: string,
    agentName: string,
    communicationStyle: string
  ): Promise<{ conversationId: string; messages: any[]; output: TestOutput }> {
    this.state.currentPhase = 2;

    const user = this.state.testUsers.find(u => u.databaseId === userId);
    if (!user) throw new Error("Test user not found");

    const result = await this.executeWithTracking(
      "Initialize Onboarding Chat",
      async () => {
        const response = await this.internalAPI.initializeOnboardingChat({
          agentName,
          communicationStyle
        });

        const chatData = response.data || response;
        user.conversationId = chatData.conversationId;
        this.state.createdRecords.conversations.push(chatData.conversationId);

        return {
          conversationId: chatData.conversationId,
          messages: chatData.messages
        };
      }
    );

    return { ...result.data!, output: result.output };
  }

  async sendOnboardingMessage(
    userId: string,
    conversationId: string,
    message: string,
    agentName: string,
    communicationStyle: string,
    currentMessages: any[],
    turnCount: number
  ): Promise<{ agentMessage: any; output: TestOutput }> {
    this.state.currentPhase = 2;

    const result = await this.executeWithTracking(
      `Send Onboarding Message (Turn ${turnCount})`,
      async () => {
        const response = await this.internalAPI.sendOnboardingMessage({
          conversationId,
          message,
          agentName,
          communicationStyle,
          currentMessages,
          turnCount
        });

        const msgData = response.data || response;
        return msgData;
      }
    );

    return { agentMessage: result.data!, output: result.output };
  }

  async completeOnboarding(
    userId: string,
    conversationId: string
  ): Promise<TestOutput> {
    this.state.currentPhase = 2;

    const result = await this.executeWithTracking(
      "Complete Onboarding",
      async () => {
        return await this.internalAPI.completeOnboarding({ conversationId });
      }
    );

    return result.output;
  }

  // Phase 3: Admin Approval
  async searchPendingUsers(): Promise<{ users: any[]; output: TestOutput }> {
    this.state.currentPhase = 3;

    const result = await this.executeWithTracking(
      "Search Pending Users",
      async () => {
        const response = await this.adminAPI.searchUsers({
          status: "PENDING",
          limit: 50
        });
        
        // Handle nested response structure
        if (response.data?.users) {
          return response.data.users;
        } else if (response.users) {
          return response.users;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      }
    );

    return { users: result.data || [], output: result.output };
  }

  async approveUser(userId: string): Promise<TestOutput> {
    this.state.currentPhase = 3;

    const result = await this.executeWithTracking(
      "Approve User",
      async () => {
        await this.adminAPI.updateUserStatus(userId, "APPROVED");
        
        // Update local state
        const user = this.state.testUsers.find(u => u.databaseId === userId);
        if (user) {
          user.status = "APPROVED";
        }
        
        return { success: true };
      }
    );

    return result.output;
  }

  // Phase 4: Matchmaking
  async createManualMatch(
    userIdA: string,
    userIdB: string
  ): Promise<{ match: any; analysis: any; output: TestOutput }> {
    this.state.currentPhase = 4;

    const result = await this.executeWithTracking(
      "Create Manual Match",
      async () => {
        const response = await this.omniscientService.manualMatch(userIdA, userIdB);
        
        if (response.data?.match) {
          this.state.createdRecords.matches.push(response.data.match.id);
        }
        
        return response.data;
      }
    );

    return { ...result.data!, output: result.output };
  }

  async executeConversation(matchId: string): Promise<TestOutput> {
    this.state.currentPhase = 4;

    const result = await this.executeWithTracking(
      "Execute Agent Conversation",
      async () => {
        return await this.omniscientService.executeConversation(matchId);
      }
    );

    return result.output;
  }

  async analyzeOutcome(conversationId: string): Promise<TestOutput> {
    this.state.currentPhase = 4;

    const result = await this.executeWithTracking(
      "Analyze Conversation Outcome",
      async () => {
        return await this.omniscientService.analyzeOutcome(conversationId);
      }
    );

    return result.output;
  }

  // Cleanup
  async cleanupTestData(): Promise<TestOutput> {
    const result = await this.executeWithTracking(
      "Cleanup Test Data",
      async () => {
        const results = {
          deletedUsers: 0,
          deletedProfiles: 0,
          deletedConversations: 0,
          deletedMatches: 0
        };

        // Delete test users (this should cascade to related records)
        if (this.state.createdRecords.users.length > 0) {
          for (const userId of this.state.createdRecords.users) {
            try {
              // Delete from auth
              const { error } = await supabase.auth.admin.deleteUser(userId);
              if (!error) results.deletedUsers++;
            } catch (error) {
              console.error(`Failed to delete user ${userId}:`, error);
            }
          }
        }

        // Reset state
        this.state = {
          testUsers: [],
          currentPhase: 0,
          outputs: [],
          createdRecords: {
            users: [],
            agentProfiles: [],
            conversations: [],
            matches: [],
            reports: []
          }
        };

        return results;
      }
    );

    return result.output;
  }

  // Getters
  getState(): TestState {
    return this.state;
  }

  getOutputs(): TestOutput[] {
    return this.state.outputs;
  }

  getTestUsers(): TestUser[] {
    return this.state.testUsers;
  }

  clearOutputs(): void {
    this.state.outputs = [];
  }
}

export const e2eTestService = new E2ETestService();