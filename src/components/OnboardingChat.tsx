import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/VoiceInput";
import { AgentNameModal } from "@/components/AgentNameModal";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { internalAPIService, Message } from "@/services/internal-api.service";
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Bug,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


interface OnboardingChatProps {
  agentName: string;
  communicationStyle: string;
  userRecord: any;
  onComplete: () => void;
  onEssenceUpdate?: () => void;
}

export const OnboardingChat: React.FC<OnboardingChatProps> = ({
  agentName: initialAgentName,
  communicationStyle,
  userRecord,
  onComplete,
  onEssenceUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [essenceData, setEssenceData] = useState<any>(null);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [agentName, setAgentName] = useState(initialAgentName);
  const [showNameModal, setShowNameModal] = useState(false);
  const [agentProfileId, setAgentProfileId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const initializeChat = useCallback(async () => {
    if (!userRecord) return;

    try {
      const response = await internalAPIService.initializeOnboardingChat({
        agentName,
        communicationStyle,
      });

      setMessages(response.messages);
      setConversationId(response.conversationId);
      setTurnCount(response.turnCount);
      setShowCompleteButton(response.showCompleteButton || false);
      
      if (response.essenceData) {
        setEssenceData(response.essenceData);
        onEssenceUpdate?.();
      }

      // Set a placeholder agent profile ID for the modal
      setAgentProfileId("placeholder-id");
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast.error("Failed to initialize chat. Please try again.");
    }
  }, [userRecord, agentName, communicationStyle, onEssenceUpdate]);

  // useEffect hooks after all callbacks are defined
  useEffect(() => {
    if (userRecord) {
      initializeChat();
    }
  }, [userRecord, initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() || !conversationId || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    const messageToSend = currentMessage;
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const response = await internalAPIService.sendOnboardingMessage({
        conversationId,
        message: messageToSend,
        agentName,
        communicationStyle,
        currentMessages: messages,
        turnCount,
      });

      setMessages((prev) => [...prev, response.agentMessage]);

      // Update essence if available
      if (response.essenceData) {
        setEssenceData(response.essenceData);
        onEssenceUpdate?.();
      }

      // Enable complete button after a few exchanges when story is building
      if (response.showCompleteButton) {
        setShowCompleteButton(true);
      }

      // Auto-suggest completion after substantial conversation
      if (newTurnCount >= 15 && response.essenceData) {
        toast.success(
          "Your personal story is looking comprehensive! Feel free to continue or complete when ready."
        );
      }

      // Focus the message input after response
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("rate limit")
            ? "Too many messages. Please wait a moment before continuing."
            : error.message.includes("network") ||
              error.message.includes("fetch")
            ? "Network error. Please check your connection and try again."
            : "Failed to send message. Please try again."
          : "An unexpected error occurred. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentMessage,
    conversationId,
    isLoading,
    messages,
    turnCount,
    agentName,
    communicationStyle,
    onEssenceUpdate,
  ]);

  const handleComplete = useCallback(async () => {
    if (!conversationId) return;

    try {
      await internalAPIService.completeOnboarding({
        conversationId,
      });

      toast.success("Onboarding completed! Your profile is pending approval.");
      onComplete();
    } catch (error) {
      console.error("Onboarding completion error:", error);
      const errorMessage =
        error instanceof Error
          ? `Unable to complete onboarding: ${error.message}`
          : "Failed to complete onboarding. Please try again.";
      toast.error(errorMessage);
    }
  }, [conversationId, onComplete]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleVoiceInput = useCallback((transcript: string) => {
    setCurrentMessage(transcript);
  }, []);

  const handleAgentNameUpdate = useCallback((newName: string) => {
    setAgentName(newName);
  }, []);

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      {/* Header - improved spacing and alignment */}
      <div className="terminal-border-bottom p-6 flex-shrink-0 bg-terminal-bg/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-terminal-cyan/20 flex items-center justify-center border border-terminal-cyan/30">
              <Bot className="w-6 h-6 text-terminal-cyan" />
            </div>
            <div className="flex-1">
              <h2 className="text-terminal-cyan font-mono font-bold text-lg mb-1">
                Agent Interview:
                <button
                  onClick={() => setShowNameModal(true)}
                  className="ml-2 text-terminal-green hover:text-terminal-yellow transition-colors underline cursor-pointer"
                >
                  {agentName}
                </button>
                <span className="text-terminal-text-muted text-sm">
                  {" "}
                  (Agent)
                </span>
              </h2>
              <p className="text-terminal-text-muted text-sm">
                Building your personal story • Turn {turnCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className="text-terminal-text-muted hover:text-terminal-red border border-terminal-text-muted/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            {import.meta.env.DEV && (
              <Button
                onClick={() => setShowDebug(!showDebug)}
                variant="ghost"
                size="sm"
                className="text-terminal-text-muted hover:text-terminal-green border border-terminal-cyan/30"
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug
                {showDebug ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
            )}
            {showCompleteButton && (
              <Button
                onClick={handleComplete}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono px-6 py-2"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete When Ready
              </Button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-4">
          <EnhancedProgress
            value={Math.min(turnCount * 5, 100)}
            label="Interview Progress"
            sublabel={
              turnCount < 5
                ? "Getting to know you..."
                : turnCount < 10
                ? "Building your story..."
                : turnCount < 15
                ? "Discovering synergies..."
                : "Finalizing your profile..."
            }
            showPercentage={true}
            variant={turnCount >= 15 ? "success" : "default"}
            steps={{
              current: Math.min(Math.floor(turnCount / 5) + 1, 4),
              total: 4,
            }}
          />
        </div>
      </div>

      {/* Messages - improved spacing and layout */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                message.role === "user"
                  ? "bg-terminal-green/20 border-terminal-green/30"
                  : "bg-terminal-cyan/20 border-terminal-cyan/30"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-5 h-5 text-terminal-green" />
              ) : (
                <Bot className="w-5 h-5 text-terminal-cyan" />
              )}
            </div>
            <div
              className={`max-w-2xl flex-1 ${
                message.role === "user" ? "text-right" : ""
              }`}
            >
              <div
                className={`inline-block p-4 rounded-lg border ${
                  message.role === "user"
                    ? "bg-terminal-green/10 text-terminal-green border-terminal-green/30"
                    : "bg-terminal-bg/80 text-terminal-text border-terminal-cyan/30"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
              </div>
              <div className="text-terminal-text-muted text-xs mt-2 px-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-terminal-cyan/20 border border-terminal-cyan/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-terminal-cyan animate-pulse" />
            </div>
            <div className="bg-terminal-bg/80 border border-terminal-cyan/30 p-4 rounded-lg">
              <Sparkles className="w-5 h-5 text-terminal-cyan animate-pulse" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - improved spacing and alignment */}
      <div className="terminal-border-top p-6 flex-shrink-0 bg-terminal-bg/50">
        <div className="flex gap-3 items-end">
          <Input
            ref={messageInputRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-terminal-bg/80 border-terminal-cyan/30 text-terminal-text font-mono focus:border-terminal-green min-h-[44px] px-4 py-3"
            disabled={isLoading || !conversationId}
          />
          <VoiceInput onTranscription={handleVoiceInput} />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !currentMessage.trim() || !conversationId}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono px-6 py-3 h-[44px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {showCompleteButton && (
          <p className="text-terminal-text-muted text-xs mt-3 px-1">
            Ready to finish? Click the "Complete When Ready" button above, or
            continue chatting to build your personal story further.
          </p>
        )}
        {turnCount >= 5 && !showCompleteButton && (
          <p className="text-terminal-text-muted text-xs mt-3 px-1">
            The "Complete When Ready" button will appear once your personal
            story starts building.
          </p>
        )}
      </div>

      {/* Debug panel - improved styling */}
      {import.meta.env.DEV && showDebug && (
        <div className="terminal-border-top p-4 max-h-32 overflow-y-auto flex-shrink-0 bg-terminal-bg/30">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-terminal-green font-semibold">
                User ID:
              </span>
              <span className="text-terminal-text">{userRecord?.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-terminal-green font-semibold">Agent:</span>
              <span className="text-terminal-text">
                {agentName} ({communicationStyle})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-terminal-green font-semibold">Turns:</span>
              <span className="text-terminal-text">{turnCount}</span>
            </div>
            {essenceData && (
              <div className="flex items-center gap-2">
                <span className="text-terminal-green font-semibold">
                  Story Generated:
                </span>
                <span className="text-terminal-cyan">Yes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Name Modal */}
      {agentProfileId && (
        <AgentNameModal
          isOpen={showNameModal}
          onClose={() => setShowNameModal(false)}
          currentName={agentName}
          agentProfileId={agentProfileId}
          onNameUpdated={handleAgentNameUpdate}
          userId={userRecord?.id}
        />
      )}
    </div>
  );
};
