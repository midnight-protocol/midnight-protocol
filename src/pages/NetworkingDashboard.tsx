import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { internalAPIService } from "@/services/internal-api.service";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bot,
  Calendar,
  BarChart3,
  Network,
  Activity,
  Clock,
  ArrowLeft,
  Sun,
  FileText,
} from "lucide-react";
import { NetworkingDashboardSkeleton } from "@/components/skeletons/ComponentSkeletons";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { useChunkedData } from "@/hooks/useChunkedData";
import { MorningReportView } from "@/components/dashboard/MorningReportView";

const NetworkingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userInternalId, setUserInternalId] = useState<string | null>(null);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [stats, setStats] = useState({
    totalCycles: 0,
    completedCycles: 0,
    totalConversations: 0,
    userConversations: 0,
    lastCycleDate: null as string | null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserInternalId();
    }
  }, [user]);

  const fetchUserInternalId = async () => {
    if (!user) return;

    try {
      const internalId = await internalAPIService.getUserInternalId(user.id);
      setUserInternalId(internalId);
      // Fetch stats once we have the internal ID
      await fetchNetworkingStats(internalId);
      await fetchConversations(0, 10);
    } catch (err) {
      console.error("Error fetching user internal ID:", err);
      setStatsError("Failed to load user data");
      setStatsLoading(false);
    }
  };

  const fetchNetworkingStats = async (userId?: string) => {
    const targetUserId = userId || userInternalId;
    if (!targetUserId) return;

    setStatsLoading(true);
    setStatsError(null);

    try {
      const networkingStats = await internalAPIService.getNetworkingStats(
        targetUserId
      );
      setStats({
        totalCycles: 0, // No longer available - mock or remove
        completedCycles: 0, // No longer available - mock or remove
        totalConversations: networkingStats.totalConversations,
        userConversations: networkingStats.userConversations,
        lastCycleDate: networkingStats.lastMatchDate,
      });
    } catch (error) {
      console.error("Error fetching networking stats:", error);
      setStatsError("Failed to load networking statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchConversations = async (offset: number, limit: number) => {
    console.log("fetchConversations", userInternalId);
    if (!userInternalId) return [];

    try {
      return await internalAPIService.getUserConversations(userInternalId, {
        offset,
        limit,
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  };

  const {
    data: conversations,
    loading: loadingConversations,
    hasMore,
    loadMore,
    refresh: refreshConversations,
  } = useChunkedData({
    fetchFunction: fetchConversations,
    chunkSize: 10,
    onError: (error) => {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    },
  });

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case "targeted":
        return <Badge className="bg-terminal-green">Targeted</Badge>;
      case "exploratory":
        return <Badge className="bg-terminal-cyan">Exploratory</Badge>;
      case "serendipitous":
        return <Badge className="bg-terminal-text">Serendipitous</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "strong_match":
        return <Badge className="bg-terminal-green">Strong Match</Badge>;
      case "exploratory_value":
        return <Badge className="bg-terminal-cyan">Exploratory Value</Badge>;
      case "future_potential":
        return <Badge className="bg-terminal-text">Future Potential</Badge>;
      case "no_match":
        return <Badge variant="outline">No Match</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (statsLoading || loadingConversations) {
    return (
      <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
        <ParticleBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-terminal-text-muted hover:text-terminal-text mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-mono text-terminal-cyan">
              Networking Dashboard
            </h1>
          </div>
          <NetworkingDashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-terminal-text-muted hover:text-terminal-text mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-mono text-terminal-cyan">
            Networking Dashboard
          </h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-terminal-bg border border-terminal-green/20">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-terminal-green/20"
            >
              <Network className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-terminal-green/20"
            >
              <Sun className="h-4 w-4 mr-2" />
              Morning Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-terminal-cyan font-mono text-lg">
                    Network Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-terminal-text-muted">
                        Total Cycles
                      </span>
                      <span className="text-terminal-text font-mono">
                        {stats.totalCycles}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text-muted">
                        Completed Cycles
                      </span>
                      <span className="text-terminal-text font-mono">
                        {stats.completedCycles}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text-muted">
                        Total Conversations
                      </span>
                      <span className="text-terminal-text font-mono">
                        {stats.totalConversations}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text-muted">
                        Your Conversations
                      </span>
                      <span className="text-terminal-text font-mono">
                        {stats.userConversations}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text-muted">
                        Last Cycle
                      </span>
                      <span className="text-terminal-text font-mono">
                        {stats.lastCycleDate
                          ? new Date(stats.lastCycleDate).toLocaleDateString()
                          : "None"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 bg-terminal-bg/30 border-terminal-cyan/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-terminal-cyan font-mono text-lg">
                    Your Agent's Networking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversations.length > 0 ? (
                    <div className="space-y-4">
                      {!showAllConversations ? (
                        <>
                          {conversations.slice(0, 3).map((conv) => {
                            const isAgentA =
                              conv.agent_a?.id === userInternalId;
                            const otherAgent = isAgentA
                              ? conv.agent_b
                              : conv.agent_a;
                            const agentName = isAgentA
                              ? conv.agent_a?.agent_profiles?.[0]?.agent_name
                              : conv.agent_b?.agent_profiles?.[0]?.agent_name;
                            const otherAgentName = isAgentA
                              ? conv.agent_b?.agent_profiles?.[0]?.agent_name
                              : conv.agent_a?.agent_profiles?.[0]?.agent_name;

                            return (
                              <div
                                key={conv.id}
                                className="p-3 bg-terminal-bg/50 rounded border border-terminal-cyan/20"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-terminal-cyan" />
                                    <span className="text-terminal-text">
                                      {agentName} ↔ {otherAgentName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getMatchTypeBadge(conv.match_type)}
                                    {getOutcomeBadge(conv.outcome)}
                                  </div>
                                </div>
                                <p className="text-sm text-terminal-text-muted mb-1 line-clamp-2">
                                  {conv.conversation_summary ||
                                    "No summary available"}
                                </p>
                                <div className="flex justify-between items-center mt-2 text-xs">
                                  <div className="text-terminal-text-muted">
                                    {formatDate(conv.created_at)}
                                  </div>
                                  <div className="flex items-center">
                                    <span className="text-terminal-text-muted mr-1">
                                      Quality:
                                    </span>
                                    <span className="text-terminal-green">
                                      {(conv.quality_score * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {conversations.length > 3 && (
                            <div className="text-center">
                              <Button
                                variant="link"
                                className="text-terminal-cyan"
                                onClick={() => setShowAllConversations(true)}
                              >
                                View All Conversations
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <InfiniteScroll
                          onLoadMore={loadMore}
                          hasMore={hasMore}
                          loading={loadingConversations}
                        >
                          {conversations.map((conv) => {
                            const isAgentA =
                              conv.agent_a?.id === userInternalId;
                            const otherAgent = isAgentA
                              ? conv.agent_b
                              : conv.agent_a;
                            const agentName = isAgentA
                              ? conv.agent_a?.agent_profiles?.[0]?.agent_name
                              : conv.agent_b?.agent_profiles?.[0]?.agent_name;
                            const otherAgentName = isAgentA
                              ? conv.agent_b?.agent_profiles?.[0]?.agent_name
                              : conv.agent_a?.agent_profiles?.[0]?.agent_name;

                            return (
                              <div
                                key={conv.id}
                                className="p-3 bg-terminal-bg/50 rounded border border-terminal-cyan/20 mb-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-terminal-cyan" />
                                    <span className="text-terminal-text">
                                      {agentName} ↔ {otherAgentName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getMatchTypeBadge(conv.match_type)}
                                    {getOutcomeBadge(conv.outcome)}
                                  </div>
                                </div>
                                <p className="text-sm text-terminal-text-muted mb-1 line-clamp-2">
                                  {conv.conversation_summary ||
                                    "No summary available"}
                                </p>
                                <div className="flex justify-between items-center mt-2 text-xs">
                                  <div className="text-terminal-text-muted">
                                    {formatDate(conv.created_at)}
                                  </div>
                                  <div className="flex items-center">
                                    <span className="text-terminal-text-muted mr-1">
                                      Quality:
                                    </span>
                                    <span className="text-terminal-green">
                                      {(conv.quality_score * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </InfiniteScroll>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Network className="h-16 w-16 text-terminal-text-muted mx-auto mb-4 opacity-50" />
                      <p className="text-terminal-text-muted">
                        No agent conversations yet. Your agent will start
                        networking in the next cycle.
                      </p>
                    </div>
                  )}
                </CardContent>
                {/* <CardFooter>
                  <Button
                    onClick={() => navigate("/proving-ground-2")}
                    className="w-full border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                    variant="outline"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    View Live Demonstration
                  </Button>
                </CardFooter> */}
              </Card>
            </div>

            <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
              <CardHeader>
                <CardTitle className="text-terminal-cyan font-mono">
                  Networking System Status
                </CardTitle>
                <CardDescription className="text-terminal-text-muted">
                  Technical overview of the networking engine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-terminal-green font-mono">
                      Agent Pairing
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-green">✓</div>
                        <div className="text-terminal-text">
                          Professional Essence analysis
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-green">✓</div>
                        <div className="text-terminal-text">
                          Compatibility scoring algorithm
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-green">✓</div>
                        <div className="text-terminal-text">
                          Three-phase matching strategy
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-terminal-cyan font-mono">
                      Agent Conversations
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-cyan">✓</div>
                        <div className="text-terminal-text">
                          6-turn conversation limit
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-cyan">✓</div>
                        <div className="text-terminal-text">
                          Four outcome categories
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-cyan">✓</div>
                        <div className="text-terminal-text">
                          Privacy-aware information sharing
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-terminal-text font-mono">
                      Batch Processing
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-text">✓</div>
                        <div className="text-terminal-text">
                          Nightly execution (2AM-8AM)
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-text">✓</div>
                        <div className="text-terminal-text">
                          Controlled concurrency processing
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-4 text-terminal-text">✓</div>
                        <div className="text-terminal-text">
                          Comprehensive logging & recovery
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6 bg-terminal-text/20" />

                <div className="text-sm text-terminal-text-muted">
                  <p className="mb-4">
                    The Praxis Network implements a nightly batch processing
                    system that runs conversations between AI agents, each
                    representing a user's Professional Essence. The system
                    includes three main components:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 mb-4">
                    <li>
                      A pairing algorithm that identifies potential connections
                    </li>
                    <li>
                      A conversation orchestrator that runs 6-turn dialogues
                      between agents
                    </li>
                    <li>
                      An outcome evaluation system that categorizes discoveries
                    </li>
                  </ol>
                  <p>
                    These components work together to identify valuable
                    collaboration opportunities that users might never discover
                    through traditional networking methods.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <MorningReportView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NetworkingDashboard;
