import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { e2eTestService, TestUser } from "@/services/e2e-test.service";
import { testProfiles, generateTestUserData } from "@/data/e2e-test-profiles";
import { toast } from "sonner";
import { Users2, Sparkles, MessageCircle, TrendingUp } from "lucide-react";

interface Phase4MatchmakingProps {
  testUser?: TestUser;
  allTestUsers: TestUser[];
}

export const Phase4Matchmaking = ({ testUser, allTestUsers }: Phase4MatchmakingProps) => {
  const [loading, setLoading] = useState(false);
  const [secondUserId, setSecondUserId] = useState<string>("");
  const [creatingSecondUser, setCreatingSecondUser] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<any>(null);

  const handleCreateSecondUser = async () => {
    setCreatingSecondUser(true);
    try {
      // Use a different profile for the second user
      const profile = testProfiles.journeyUsers[1];
      const userData = generateTestUserData(profile);
      
      // Create and quickly onboard the second user
      const { user: secondUser } = await e2eTestService.createTestUser(
        userData.email,
        userData.password,
        userData.handle
      );

      // Save agent personalization
      await e2eTestService.saveAgentPersonalization(
        secondUser.databaseId,
        userData.agentName,
        userData.communicationStyle
      );

      // Initialize chat
      const { conversationId, messages } = await e2eTestService.initializeOnboardingChat(
        secondUser.databaseId,
        userData.agentName,
        userData.communicationStyle
      );

      // Send a few quick messages
      let currentMessages = messages;
      let turnCount = 1;

      for (let i = 0; i < 3; i++) {
        const message = profile.onboarding.messages[i] || `Test message ${i + 1}`;
        const result = await e2eTestService.sendOnboardingMessage(
          secondUser.databaseId,
          conversationId,
          message,
          userData.agentName,
          userData.communicationStyle,
          currentMessages,
          turnCount
        );
        
        currentMessages.push({ role: "user", content: message });
        currentMessages.push(result.agentMessage);
        turnCount++;
      }

      // Complete onboarding
      await e2eTestService.completeOnboarding(secondUser.databaseId, conversationId);

      // Approve the user
      await e2eTestService.approveUser(secondUser.databaseId);

      setSecondUserId(secondUser.databaseId);
      toast.success("Second test user created and onboarded");
    } catch (error) {
      toast.error(`Failed to create second user: ${error.message}`);
    } finally {
      setCreatingSecondUser(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!testUser || !secondUserId) {
      toast.error("Please select two users to match");
      return;
    }

    setLoading(true);
    try {
      const result = await e2eTestService.createManualMatch(
        testUser.databaseId,
        secondUserId
      );
      
      setMatch(result.match);
      setMatchAnalysis(result.analysis);
      toast.success("Match created successfully");
    } catch (error) {
      toast.error(`Failed to create match: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteConversation = async () => {
    if (!match) {
      toast.error("Please create a match first");
      return;
    }

    setLoading(true);
    try {
      await e2eTestService.executeConversation(match.id);
      toast.success("Agent conversation executed");
    } catch (error) {
      toast.error(`Failed to execute conversation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeOutcome = async () => {
    if (!match) {
      toast.error("Please execute conversation first");
      return;
    }

    setLoading(true);
    try {
      // Assuming the conversation ID is stored in the match or we need to fetch it
      await e2eTestService.analyzeOutcome(match.id);
      toast.success("Outcome analysis completed");
    } catch (error) {
      toast.error(`Failed to analyze outcome: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter approved users for selection
  const approvedUsers = allTestUsers.filter(u => u.status === "APPROVED");

  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <Users2 className="w-5 h-5" />
          Phase 4: Matchmaking
        </CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Create matches between test users and simulate agent conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!testUser ? (
          <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              Please complete Phase 3 first to have an approved test user.
            </p>
          </div>
        ) : testUser.status !== "APPROVED" ? (
          <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              Test user must be approved before matchmaking. Complete Phase 3 first.
            </p>
          </div>
        ) : (
          <>
            {/* User Selection */}
            <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-cyan/20 space-y-4">
              <h4 className="text-terminal-cyan font-mono text-sm">Select Users for Matching</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-terminal-text-muted">User A (Primary Test User)</label>
                  <div className="p-2 bg-terminal-bg/50 rounded border border-terminal-green/30">
                    <span className="text-sm font-mono text-terminal-text">
                      {testUser.handle} ({testUser.databaseId.substring(0, 8)}...)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-terminal-text-muted">User B</label>
                  {approvedUsers.length > 1 ? (
                    <Select value={secondUserId} onValueChange={setSecondUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select second user" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedUsers
                          .filter(u => u.databaseId !== testUser.databaseId)
                          .map(u => (
                            <SelectItem key={u.databaseId} value={u.databaseId}>
                              {u.handle} ({u.databaseId.substring(0, 8)}...)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      onClick={handleCreateSecondUser}
                      disabled={creatingSecondUser}
                      variant="outline"
                      className="w-full border-terminal-purple text-terminal-purple"
                    >
                      {creatingSecondUser ? "Creating..." : "Create Second Test User"}
                    </Button>
                  )}
                </div>
              </div>

              {secondUserId && (
                <Button
                  onClick={handleCreateMatch}
                  disabled={loading || !secondUserId}
                  className="w-full bg-terminal-green text-terminal-bg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Manual Match
                </Button>
              )}
            </div>

            {/* Match Details */}
            {match && (
              <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-green/20 space-y-4">
                <h4 className="text-terminal-green font-mono text-sm">Match Created</h4>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-terminal-text-muted">Opportunity Score</span>
                    <div className="text-lg font-mono text-terminal-cyan">
                      {match.opportunity_score?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-terminal-text-muted">Synergy Score</span>
                    <div className="text-lg font-mono text-terminal-purple">
                      {match.synergy_score?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-terminal-text-muted">Feasibility Score</span>
                    <div className="text-lg font-mono text-terminal-green">
                      {match.feasibility_score?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                </div>

                {matchAnalysis && (
                  <div className="space-y-2">
                    <h5 className="text-terminal-cyan text-xs font-mono">Analysis Insights</h5>
                    <div className="p-2 bg-terminal-bg/50 rounded text-xs text-terminal-text">
                      {matchAnalysis.insights?.map((insight: any, idx: number) => (
                        <div key={idx} className="mb-1">
                          • {insight.title}: {insight.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleExecuteConversation}
                    disabled={loading}
                    size="sm"
                    className="bg-terminal-purple text-terminal-bg"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Execute Conversation
                  </Button>
                  
                  <Button
                    onClick={handleAnalyzeOutcome}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="border-terminal-cyan text-terminal-cyan"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Analyze Outcome
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};