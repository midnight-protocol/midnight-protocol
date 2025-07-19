
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FullStoryModal } from '@/components/FullStoryModal';
import { AgentNameModal } from '@/components/AgentNameModal';
import { SimpleShareButton } from '@/components/SimpleShareButton';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AgentStatusCard } from '@/components/dashboard/AgentStatusCard';
import { PersonalStoryCard } from '@/components/dashboard/PersonalStoryCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { DashboardLoadingSkeleton } from '@/components/skeletons/DashboardSkeletons';
import { FadeIn } from '@/components/ui/fade-in';
import { internalAPIService } from '@/services/internal-api.service';

const Dashboard = () => {
  const [userRecord, setUserRecord] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [story, setStory] = useState<any>(null);
  const [storySummary, setStorySummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);
  const [showAgentNameModal, setShowAgentNameModal] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    console.log('Fetching data for user:', user.id);

    try {
      // Fetch user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        toast.error(`Database error: ${userError.message}`);
        return;
      }

      if (userData) {
        setUserRecord(userData);

        // Fetch agent profile
        const { data: agentData } = await supabase
          .from('agent_profiles')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        setAgentProfile(agentData);

        // Check if onboarding conversation is completed
        const { data: onboardingData } = await supabase
          .from('onboarding_conversations')
          .select('status')
          .eq('user_id', userData.id)
          .eq('status', 'completed')
          .maybeSingle();

        setOnboardingComplete(!!onboardingData);

        // Fetch personal story - use maybeSingle to avoid 406 error
        const { data: storyData } = await supabase
          .from('personal_stories')
          .select('*')
          .eq('user_id', userData.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setStory(storyData);

        // Use stored summary if available, otherwise generate one
        if (storyData) {
          if (storyData.summary) {
            setStorySummary(storyData.summary);
          } else {
            generateAndStoreStorySummary(storyData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user, fetchUserData]);

  // Test the internal API getUserData function
  useEffect(() => {
    const testInternalAPI = async () => {
      if (user) {
        try {
          console.log('Testing internal API getUserData...');
          const userData = await internalAPIService.getUserData();
          if (userData) {
            console.log('Internal API getUserData result:', userData);
          } else {
            console.log('Internal API getUserData: No user record found in database');
          }
        } catch (error) {
          console.error('Internal API test failed:', error);
        }
      }
    };

    testInternalAPI();
  }, [user]);

  const generateAndStoreStorySummary = async (storyData: any) => {
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-story-summary', {
        body: { story: storyData }
      });

      if (error) throw error;

      if (data?.summary) {
        // Store the summary in the database
        const { error: updateError } = await supabase
          .from('personal_stories')
          .update({ summary: data.summary })
          .eq('id', storyData.id);

        if (updateError) {
          console.warn('Failed to store summary in database:', updateError);
          // Continue anyway - summary is generated but not persisted
        }

        setStorySummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to generate story summary:', error);
      // Fallback to truncated narrative
      const fallbackSummary = storyData.narrative?.substring(0, 150) + '...' || 'Your personal story is being processed...';
      setStorySummary(fallbackSummary);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
      // Force navigation even on error
      navigate('/');
    }
  }, [signOut, navigate]);

  const handleRefreshData = useCallback(() => {
    fetchUserData();
    toast.success('Data refreshed');
  }, [fetchUserData]);

  const handleAgentNameUpdated = useCallback((newName: string) => {
    setAgentProfile(prev => ({ ...prev, agent_name: newName }));
  }, []);

  // Show loading while auth is loading
  if (authLoading) {
    return <DashboardLoadingSkeleton />;
  }

  // If not authenticated, redirect
  if (!user) {
    navigate('/auth');
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
            onClick={() => navigate('/onboarding')}
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
          userHandle={userRecord?.handle || ''}
          agentName={agentProfile?.agent_name || ''}
          onRefresh={handleRefreshData}
          onSignOut={handleSignOut}
          onAgentNameClick={() => setShowAgentNameModal(true)}
        />

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          <FadeIn delay={0} className="md:col-span-1">
            <AgentStatusCard
              userStatus={userRecord?.status || ''}
              agentName={agentProfile?.agent_name || ''}
              userId={userRecord?.id}
            />
          </FadeIn>

          <FadeIn delay={100} className="md:col-span-1">
            <PersonalStoryCard
              story={story}
              storySummary={storySummary}
              summaryLoading={summaryLoading}
              onViewFullStory={() => setShowFullStory(true)}
            />
          </FadeIn>

          <FadeIn delay={200} className="md:col-span-2 lg:col-span-1 flex items-start justify-center md:justify-end">
            <SimpleShareButton />
          </FadeIn>

          <FadeIn delay={300} className="md:col-span-2 lg:col-span-2">
            <RecentActivityCard
              userStatus={userRecord?.status || ''}
              agentName={agentProfile?.agent_name || ''}
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
