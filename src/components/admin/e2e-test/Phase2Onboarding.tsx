import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { e2eTestService, TestUser } from "@/services/e2e-test.service";
import { TestProfile, generateTestUserData } from "@/data/e2e-test-profiles";
import { toast } from "sonner";
import { MessageSquare, Bot, Send, CheckCircle } from "lucide-react";

interface Phase2OnboardingProps {
  selectedProfile?: TestProfile;
  testUser?: TestUser;
}

export const Phase2Onboarding = ({ selectedProfile, testUser }: Phase2OnboardingProps) => {
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [turnCount, setTurnCount] = useState(1);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const fillFromProfile = () => {
    if (selectedProfile) {
      const data = generateTestUserData(selectedProfile);
      setAgentName(data.agentName);
      setCommunicationStyle(data.communicationStyle);
    }
  };

  const handleSavePersonalization = async () => {
    if (!testUser) {
      toast.error("Please create a test user first");
      return;
    }

    if (!agentName || !communicationStyle) {
      toast.error("Please fill in agent details");
      return;
    }

    setLoading(true);
    try {
      await e2eTestService.saveAgentPersonalization(
        testUser.databaseId,
        agentName,
        communicationStyle
      );
      toast.success("Agent personalization saved");
    } catch (error) {
      toast.error(`Failed to save personalization: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeChat = async () => {
    if (!testUser) {
      toast.error("Please create a test user first");
      return;
    }

    if (!agentName || !communicationStyle) {
      toast.error("Please save agent personalization first");
      return;
    }

    setLoading(true);
    try {
      const result = await e2eTestService.initializeOnboardingChat(
        testUser.databaseId,
        agentName,
        communicationStyle
      );
      setConversationId(result.conversationId);
      setMessages(result.messages);
      toast.success("Onboarding chat initialized");
    } catch (error) {
      toast.error(`Failed to initialize chat: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!testUser || !conversationId || !currentMessage.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await e2eTestService.sendOnboardingMessage(
        testUser.databaseId,
        conversationId,
        currentMessage,
        agentName,
        communicationStyle,
        messages,
        turnCount
      );

      // Add user message
      const userMsg = {
        role: "user",
        content: currentMessage,
        timestamp: new Date().toISOString()
      };

      // Update messages with user message and agent response
      setMessages([...messages, userMsg, result.agentMessage]);
      setTurnCount(turnCount + 1);
      setCurrentMessage("");
      
      toast.success(`Message sent (Turn ${turnCount})`);
    } catch (error) {
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!testUser || !conversationId) {
      toast.error("Please complete the chat first");
      return;
    }

    setLoading(true);
    try {
      await e2eTestService.completeOnboarding(testUser.databaseId, conversationId);
      setOnboardingComplete(true);
      toast.success("Onboarding completed successfully");
    } catch (error) {
      toast.error(`Failed to complete onboarding: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetMessage = (index: number) => {
    if (selectedProfile && selectedProfile.onboarding.messages[index]) {
      setCurrentMessage(selectedProfile.onboarding.messages[index]);
    }
  };

  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <MessageSquare className="w-5 h-5" />
          Phase 2: Onboarding Process
        </CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Agent personalization and onboarding chat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!testUser ? (
          <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              Please complete Phase 1 first to create a test user.
            </p>
          </div>
        ) : (
          <>
            {/* Agent Personalization */}
            <div className="space-y-4 p-4 bg-terminal-bg rounded-lg border border-terminal-cyan/20">
              <h4 className="text-terminal-cyan font-mono text-sm flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Agent Personalization
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName" className="text-terminal-text-muted">Agent Name</Label>
                  <Input
                    id="agentName"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Nova-123456"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style" className="text-terminal-text-muted">Communication Style</Label>
                  <Select value={communicationStyle} onValueChange={setCommunicationStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANALYTICAL">Analytical</SelectItem>
                      <SelectItem value="ENTHUSIASTIC">Enthusiastic</SelectItem>
                      <SelectItem value="CREATIVE">Creative</SelectItem>
                      <SelectItem value="SUPPORTIVE">Supportive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={fillFromProfile}
                  disabled={!selectedProfile}
                  variant="outline"
                  size="sm"
                  className="border-terminal-purple text-terminal-purple"
                >
                  Fill from Profile
                </Button>
                <Button
                  onClick={handleSavePersonalization}
                  disabled={loading || !agentName || !communicationStyle}
                  size="sm"
                  className="bg-terminal-cyan text-terminal-bg"
                >
                  Save Personalization
                </Button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="space-y-4 p-4 bg-terminal-bg rounded-lg border border-terminal-green/20">
              <div className="flex items-center justify-between">
                <h4 className="text-terminal-green font-mono text-sm">Onboarding Chat</h4>
                {!conversationId && (
                  <Button
                    onClick={handleInitializeChat}
                    disabled={loading || !agentName}
                    size="sm"
                    className="bg-terminal-green text-terminal-bg"
                  >
                    Initialize Chat
                  </Button>
                )}
              </div>

              {conversationId && (
                <>
                  <div className="text-xs text-terminal-text-muted font-mono">
                    Conversation ID: {conversationId}
                  </div>

                  {/* Messages Display */}
                  <div className="h-[300px] overflow-y-auto bg-terminal-bg/50 rounded p-3 space-y-2">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded ${
                          msg.role === "agent" 
                            ? "bg-terminal-cyan/10 border-l-2 border-terminal-cyan" 
                            : "bg-terminal-purple/10 border-l-2 border-terminal-purple ml-8"
                        }`}
                      >
                        <div className="text-xs text-terminal-text-muted mb-1">
                          {msg.role === "agent" ? `${agentName} (Agent)` : "User"}
                        </div>
                        <div className="text-sm text-terminal-text">{msg.content}</div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="font-mono min-h-[80px]"
                      disabled={onboardingComplete}
                    />
                    
                    {/* Preset Messages */}
                    {selectedProfile && (
                      <div className="flex gap-1 flex-wrap">
                        {selectedProfile.onboarding.messages.slice(0, 3).map((_, idx) => (
                          <Button
                            key={idx}
                            onClick={() => loadPresetMessage(idx)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={onboardingComplete}
                          >
                            Preset {idx + 1}
                          </Button>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-terminal-text-muted">
                        Turn {turnCount} / Messages: {messages.length}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSendMessage}
                          disabled={loading || !currentMessage.trim() || onboardingComplete}
                          size="sm"
                          className="bg-terminal-purple text-terminal-bg"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send Message
                        </Button>
                        
                        {messages.length >= 6 && !onboardingComplete && (
                          <Button
                            onClick={handleCompleteOnboarding}
                            disabled={loading}
                            size="sm"
                            className="bg-terminal-green text-terminal-bg"
                          >
                            Complete Onboarding
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {onboardingComplete && (
                    <div className="flex items-center gap-2 text-terminal-green p-2 bg-terminal-green/10 rounded">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Onboarding completed successfully</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};