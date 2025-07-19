import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { internalAPIService } from "@/services/internal-api.service";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AgentPersonalization } from "@/components/AgentPersonalization";
import { OnboardingChat } from "@/components/OnboardingChat";
import { PersonalStoryDisplay } from "@/components/PersonalStoryDisplay";

type OnboardingStep = "personalization" | "interview" | "complete";

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>("personalization");
  const [agentName, setAgentName] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState(
    "warm_conversational"
  );
  const [userRecord, setUserRecord] = useState<any>(null);
  const [essenceRefreshTrigger, setEssenceRefreshTrigger] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchOnboardingData = async () => {
    if (!user) return;

    try {
      const response = await internalAPIService.getOnboardingData();
      
      setUserRecord(response.userRecord);

      if (response.hasExistingProfile && response.agentProfile) {
        setAgentName(response.agentProfile.agent_name);
        setCommunicationStyle(response.agentProfile.communication_style);
        setStep("interview");
      }
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOnboardingData();
    }
  }, [user]);

  const handlePersonalizationComplete = async (
    name: string,
    style: string,
    timezone: string
  ) => {
    if (!userRecord) return;

    try {
      setAgentName(name);
      setCommunicationStyle(style);

      // Save agent profile via internal API
      await internalAPIService.saveAgentPersonalization({
        agentName: name,
        communicationStyle: style,
      });

      setStep("interview");
    } catch (error) {
      console.error("Error saving agent personalization:", error);
    }
  };

  const handleInterviewComplete = () => {
    setStep("complete");
  };

  const handleEssenceUpdate = () => {
    setEssenceRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-[90vh] bg-terminal-bg relative overflow-hidden">
      <ParticleBackground />

      {step === "personalization" && (
        <div className="relative z-10 h-full">
          <AgentPersonalization
            onComplete={handlePersonalizationComplete}
            initialName={agentName}
            initialStyle={communicationStyle}
          />
        </div>
      )}

      {step === "interview" && (
        <div className="relative z-10 h-full flex flex-col lg:flex-row">
          {/* Main chat area - improved proportions */}
          <div className="flex-1 flex flex-col min-w-0 h-full lg:h-auto">
            <OnboardingChat
              agentName={agentName}
              communicationStyle={communicationStyle}
              userRecord={userRecord}
              onComplete={handleInterviewComplete}
              onEssenceUpdate={handleEssenceUpdate}
            />
          </div>

          {/* Sidebar - responsive width with better spacing */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-terminal-cyan/20 flex flex-col h-64 lg:h-full bg-terminal-bg/30">
            <div className="p-4 flex-1 overflow-y-auto">
              <PersonalStoryDisplay
                userRecord={userRecord}
                refreshTrigger={essenceRefreshTrigger}
              />
            </div>
          </div>
        </div>
      )}

      {step === "complete" && (
        <div className="relative z-10 flex-1 flex items-center justify-center h-full">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold text-terminal-green mb-6 font-mono">
              ONBOARDING COMPLETE
            </h1>
            <p className="text-terminal-text mb-8">
              Your agent {agentName} is ready! Proceed to your dashboard to
              await approval.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-terminal-green text-terminal-bg px-8 py-3 font-mono hover:bg-terminal-cyan transition-colors"
            >
              ENTER DASHBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
