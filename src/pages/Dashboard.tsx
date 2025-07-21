import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FullStoryModal } from "@/components/FullStoryModal";
import { AgentNameModal } from "@/components/AgentNameModal";
import { SimpleShareButton } from "@/components/SimpleShareButton";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AgentStatusCard } from "@/components/dashboard/AgentStatusCard";
import { PersonalStoryCard } from "@/components/dashboard/PersonalStoryCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { DashboardLoadingSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { FadeIn } from "@/components/ui/fade-in";
import { internalAPIService } from "@/services/internal-api.service";

const Dashboard = () => {
  const [userRecord, setUserRecord] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [story, setStory] = useState<any>(null);
  const [storySummary, setStorySummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showFullStory, setShowFullStory] = useState(false);
  const [showAgentNameModal, setShowAgentNameModal] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Single API call to get all dashboard data
      const dashboardData = await internalAPIService.getDashboardData();

      setUserRecord(dashboardData.user);
      setAgentProfile(dashboardData.agentProfile);
      setStory(dashboardData.personalStory);
      setOnboardingComplete(dashboardData.onboardingComplete);

      // Use story summary if available, otherwise truncated narrative
      if (dashboardData.personalStory?.summary) {
        setStorySummary(dashboardData.personalStory.summary);
      } else if (dashboardData.personalStory?.narrative) {
        setStorySummary(
          dashboardData.personalStory.narrative.substring(0, 150) + "..."
        );
      } else {
        setStorySummary("Your personal story is being processed...");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user, fetchUserData]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Error logging out");
      // Force navigation even on error
      navigate("/");
    }
  }, [signOut, navigate]);

  const handleRefreshData = useCallback(() => {
    fetchUserData();
    toast.success("Data refreshed");
  }, [fetchUserData]);

  const handleAgentNameUpdated = useCallback((newName: string) => {
    setAgentProfile((prev) => ({ ...prev, agent_name: newName }));
  }, []);

  // Show loading while auth is loading
  if (authLoading) {
    return <DashboardLoadingSkeleton />;
  }

  // If not authenticated, redirect
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  // Check if user needs to complete onboarding
  if (userRecord && (!agentProfile || onboardingComplete === false)) {
    return (
      <div className="min-h-screen bg-terminal-bg relative overflow-hidden flex items-center justify-center">
        <ParticleBackground />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-terminal-cyan mb-6 font-mono">
            COMPLETE YOUR SETUP
          </h1>
          <p className="text-terminal-text mb-8">
            You need to complete the onboarding process to activate your agent.
          </p>
          <Button
            onClick={() => navigate("/onboarding")}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono"
          >
            CONTINUE ONBOARDING
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10">
        <DashboardHeader
          userHandle={userRecord?.handle || ""}
          agentName={agentProfile?.agent_name || ""}
          onRefresh={handleRefreshData}
          onSignOut={handleSignOut}
          onAgentNameClick={() => setShowAgentNameModal(true)}
        >
          <SimpleShareButton />
        </DashboardHeader>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-0 md:grid md:grid-cols-1 lg:grid-cols-2 md:gap-6">
          <FadeIn delay={0} className="md:col-span-1">
            <AgentStatusCard
              userStatus={userRecord?.status || ""}
              agentName={agentProfile?.agent_name || ""}
              userId={userRecord?.id}
            />
          </FadeIn>

          <FadeIn delay={100} className="md:col-span-1">
            <PersonalStoryCard
              story={story}
              storySummary={storySummary}
              summaryLoading={false}
              onViewFullStory={() => setShowFullStory(true)}
            />
          </FadeIn>

          <FadeIn delay={200} className="md:col-span-1 lg:col-span-2">
            <RecentActivityCard
              userStatus={userRecord?.status || ""}
              agentName={agentProfile?.agent_name || ""}
              userId={userRecord?.id}
              className=""
            />
          </FadeIn>
        </div>
      </div>

      {/* Modals */}
      <FullStoryModal
        isOpen={showFullStory}
        onClose={() => setShowFullStory(false)}
        story={story}
      />

      {agentProfile && (
        <AgentNameModal
          isOpen={showAgentNameModal}
          onClose={() => setShowAgentNameModal(false)}
          currentName={agentProfile.agent_name}
          agentProfileId={agentProfile.id}
          onNameUpdated={handleAgentNameUpdated}
          userId={userRecord?.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
