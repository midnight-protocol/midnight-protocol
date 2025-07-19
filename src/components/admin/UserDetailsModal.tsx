import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  User,
  MessageSquare,
  Calendar,
  Target,
  Briefcase,
  Brain,
  Activity,
  Hash,
  Mail,
  Shield,
  Clock,
  Loader2,
  Users2,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { User as UserType } from "@/types/admin.types";
import { formatDate } from "@/utils/admin.utils";
import { UserStatusBadge } from "./shared/UserStatusBadge";
import { UserRoleBadge } from "./shared/UserRoleBadge";
import { adminAPIService } from "@/services/admin-api.service";
import { toast } from "sonner";

interface UserDetailsModalProps {
  user: UserType;
  onClose: () => void;
  onApprove?: (userId: string) => void;
  onReject?: (userId: string) => void;
}

export const UserDetailsModal = ({
  user,
  onClose,
  onApprove,
  onReject,
}: UserDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [matchInsights, setMatchInsights] = useState<Record<string, any[]>>({});
  const [loadingInsights, setLoadingInsights] = useState<
    Record<string, boolean>
  >({});
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationTurns, setConversationTurns] = useState<
    Record<string, any[]>
  >({});
  const [loadingTurns, setLoadingTurns] = useState<Record<string, boolean>>({});

  const agentProfile = user.agent_profiles?.[0];
  const personalStory = user.personal_stories;

  // Fetch matches when the matches tab is selected
  useEffect(() => {
    if (activeTab === "matches" && !matchesLoaded) {
      fetchMatches();
    } else if (activeTab === "conversations" && !conversationsLoaded) {
      fetchConversations();
    }
  }, [activeTab]);

  const fetchMatches = async () => {
    try {
      setMatchesLoading(true);
      const result = await adminAPIService.getUserMatches(user.id, {
        limit: 50,
      });
      setMatches(result.matches);
      setMatchesLoaded(true);
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      toast.error("Failed to load matches");
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchMatchInsights = async (matchId: string) => {
    try {
      setLoadingInsights((prev) => ({ ...prev, [matchId]: true }));
      const result = await adminAPIService.getMatchInsights(matchId);
      setMatchInsights((prev) => ({ ...prev, [matchId]: result.insights }));
    } catch (error) {
      console.error("Failed to fetch match insights:", error);
      toast.error("Failed to load insights");
    } finally {
      setLoadingInsights((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const fetchConversations = async () => {
    try {
      setConversationsLoading(true);
      const result = await adminAPIService.getUserConversations(user.id, {
        limit: 50,
      });
      setConversations(result.conversations);
      setConversationsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchConversationTurns = async (conversationId: string) => {
    try {
      setLoadingTurns((prev) => ({ ...prev, [conversationId]: true }));
      const result = await adminAPIService.getConversationTurns(conversationId);
      setConversationTurns((prev) => ({
        ...prev,
        [conversationId]: result.turns,
      }));
    } catch (error) {
      console.error("Failed to fetch conversation turns:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoadingTurns((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-terminal-bg border-terminal-cyan max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b border-terminal-cyan/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-terminal-cyan/20 flex items-center justify-center">
                <User className="w-6 h-6 text-terminal-cyan" />
              </div>
              <div>
                <CardTitle className="text-terminal-cyan font-mono text-xl">
                  @{user.handle}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <UserStatusBadge status={user.status} />
                  <UserRoleBadge role={user.role} />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-terminal-text-muted hover:text-terminal-text"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-4 bg-terminal-bg border-b border-terminal-cyan/30">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-terminal-cyan/10 data-[state=active]:text-terminal-cyan"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="matches"
              className="data-[state=active]:bg-terminal-cyan/10 data-[state=active]:text-terminal-cyan"
            >
              Matches
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="data-[state=active]:bg-terminal-cyan/10 data-[state=active]:text-terminal-cyan"
            >
              Conversations
            </TabsTrigger>
            <TabsTrigger
              value="actions"
              className="data-[state=active]:bg-terminal-cyan/10 data-[state=active]:text-terminal-cyan"
            >
              Actions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-terminal-text-muted">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">User ID</span>
                </div>
                <p className="font-mono text-terminal-text text-xs">
                  {user.id}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-terminal-text-muted">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Member Since</span>
                </div>
                <p className="text-terminal-text">
                  {formatDate(user.created_at)}
                </p>
              </div>

              {user.auth_user_id && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-terminal-text-muted">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Auth ID</span>
                  </div>
                  <p className="font-mono text-terminal-text text-xs">
                    {user.auth_user_id}
                  </p>
                </div>
              )}

              {user.updated_at && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-terminal-text-muted">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Updated</span>
                  </div>
                  <p className="text-terminal-text">
                    {formatDate(user.updated_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Agent Profile */}
            {agentProfile && (
              <div className="border border-terminal-green/30 rounded-lg p-4 space-y-4">
                <h3 className="text-terminal-green font-mono text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Agent Profile
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-terminal-text-muted text-sm mb-1">
                      Agent Name
                    </p>
                    <p className="text-terminal-text font-medium">
                      {agentProfile.agent_name}
                    </p>
                  </div>
                  {agentProfile.communication_style && (
                    <div>
                      <p className="text-terminal-text-muted text-sm mb-1">
                        Communication Style
                      </p>
                      <p className="text-terminal-text font-medium">
                        {agentProfile.communication_style}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personal Story */}
            {personalStory && (
              <div className="border border-terminal-purple/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-terminal-purple font-mono text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Personal Story
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-terminal-green text-terminal-green"
                  >
                    {Math.round(personalStory.completeness_score * 100)}%
                    Complete
                  </Badge>
                </div>

                <div className="space-y-4">
                  {personalStory.narrative && (
                    <div>
                      <p className="text-terminal-text-muted text-sm mb-2">
                        Narrative
                      </p>
                      <p className="text-terminal-text leading-relaxed">
                        {personalStory.narrative}
                      </p>
                    </div>
                  )}

                  {personalStory.current_focus &&
                    personalStory.current_focus.length > 0 && (
                      <div>
                        <p className="text-terminal-text-muted text-sm mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Current Focus
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {personalStory.current_focus.map((focus, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="border-terminal-cyan/50 text-terminal-cyan"
                            >
                              {focus}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {personalStory.seeking_connections &&
                    personalStory.seeking_connections.length > 0 && (
                      <div>
                        <p className="text-terminal-text-muted text-sm mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Seeking Connections
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {personalStory.seeking_connections.map(
                            (seeking, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="border-terminal-yellow/50 text-terminal-yellow"
                              >
                                {seeking}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {personalStory.offering_expertise &&
                    personalStory.offering_expertise.length > 0 && (
                      <div>
                        <p className="text-terminal-text-muted text-sm mb-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Offering Expertise
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {personalStory.offering_expertise.map(
                            (expertise, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="border-terminal-green/50 text-terminal-green"
                              >
                                {expertise}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {personalStory.summary && (
                    <div>
                      <p className="text-terminal-text-muted text-sm mb-2">
                        Summary
                      </p>
                      <p className="text-terminal-text text-sm leading-relaxed">
                        {personalStory.summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Profile/Story Messages */}
            {!agentProfile && !personalStory && (
              <div className="text-center py-8 text-terminal-text-muted">
                <p>
                  No agent profile or personal story data available for this
                  user.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="flex-1 overflow-y-auto p-6">
            {matchesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-terminal-cyan animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12 text-terminal-text-muted">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No matches found for this user.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-terminal-cyan font-mono text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Omniscient Matches ({matches.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="border border-terminal-green/30 rounded-lg p-4 hover:bg-terminal-green/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          {/* Matched User Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-terminal-cyan/20 flex items-center justify-center">
                              <User className="w-5 h-5 text-terminal-cyan" />
                            </div>
                            <div>
                              <p className="font-mono text-terminal-cyan">
                                @{match.matched_user.handle}
                              </p>
                              <p className="text-terminal-text-muted text-sm">
                                {match.matched_user.agent_profiles?.[0]
                                  ?.agent_name || "No agent"}
                              </p>
                            </div>
                          </div>

                          {/* Match Details */}
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-terminal-text-muted text-sm">
                                Opportunity Score
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-terminal-bg rounded-full h-2">
                                  <div
                                    className="bg-terminal-green h-2 rounded-full transition-all"
                                    style={{
                                      width: `${
                                        (match.opportunity_score || 0) * 100
                                      }%`,
                                    }}
                                  />
                                </div>
                                <span className="text-terminal-green font-mono text-sm">
                                  {Math.round(
                                    (match.opportunity_score || 0) * 100
                                  )}
                                  %
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="text-terminal-text-muted text-sm">
                                Status
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  match.status === "completed"
                                    ? "border-terminal-green text-terminal-green"
                                    : match.status === "active"
                                    ? "border-terminal-purple text-terminal-purple"
                                    : match.status === "scheduled"
                                    ? "border-terminal-cyan text-terminal-cyan"
                                    : match.status === "analyzed"
                                    ? "border-terminal-yellow text-terminal-yellow"
                                    : "border-terminal-text-muted text-terminal-text-muted"
                                }
                              >
                                {match.status || "pending_analysis"}
                              </Badge>
                            </div>
                          </div>

                          {/* Match Reasoning */}
                          {match.match_reasoning && (
                            <div className="mt-3">
                              <p className="text-terminal-text-muted text-sm mb-1">
                                Match Reasoning
                              </p>
                              <p className="text-terminal-text text-sm">
                                {match.match_reasoning}
                              </p>
                            </div>
                          )}

                          {/* Analysis Summary */}
                          {match.analysis_summary && (
                            <div className="mt-3">
                              <p className="text-terminal-text-muted text-sm mb-1">
                                Analysis Summary
                              </p>
                              <p className="text-terminal-text text-sm">
                                {match.analysis_summary}
                              </p>
                            </div>
                          )}

                          {/* Predicted Outcome */}
                          {match.predicted_outcome && (
                            <div className="mt-3">
                              <p className="text-terminal-text-muted text-sm mb-1">
                                Predicted Outcome
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  match.predicted_outcome === "STRONG_MATCH"
                                    ? "border-terminal-green text-terminal-green"
                                    : match.predicted_outcome === "EXPLORATORY"
                                    ? "border-terminal-yellow text-terminal-yellow"
                                    : match.predicted_outcome ===
                                      "FUTURE_POTENTIAL"
                                    ? "border-terminal-cyan text-terminal-cyan"
                                    : "border-terminal-text-muted text-terminal-text-muted"
                                }
                              >
                                {match.predicted_outcome.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="flex flex-wrap gap-3 text-terminal-text-muted text-xs mt-3">
                            <span>Created: {formatDate(match.created_at)}</span>
                            {match.analyzed_at && (
                              <span>
                                Analyzed: {formatDate(match.analyzed_at)}
                              </span>
                            )}
                            {match.scheduled_for && (
                              <span>
                                Scheduled: {formatDate(match.scheduled_for)}
                              </span>
                            )}
                          </div>

                          {/* Insights Section */}
                          <div className="mt-4 pt-3 border-t border-terminal-green/20">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (matchInsights[match.id]) {
                                  // Toggle visibility
                                  setMatchInsights((prev) => {
                                    const newInsights = { ...prev };
                                    if (newInsights[match.id]) {
                                      delete newInsights[match.id];
                                    }
                                    return newInsights;
                                  });
                                } else {
                                  fetchMatchInsights(match.id);
                                }
                              }}
                              className="w-full justify-between text-terminal-cyan hover:text-terminal-cyan hover:bg-terminal-cyan/10"
                            >
                              <span className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                {matchInsights[match.id]
                                  ? "Hide Insights"
                                  : "Show Insights"}
                              </span>
                              {loadingInsights[match.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : matchInsights[match.id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>

                            {/* Display Insights */}
                            {matchInsights[match.id] &&
                              matchInsights[match.id].length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {matchInsights[match.id].map(
                                    (matchInsight, idx) => (
                                      <div
                                        key={matchInsight.id}
                                        className="bg-terminal-bg/50 rounded p-3 border border-terminal-cyan/20"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <Badge
                                            variant="outline"
                                            className={
                                              matchInsight.insight
                                                .insight_type === "opportunity"
                                                ? "border-terminal-green text-terminal-green"
                                                : matchInsight.insight
                                                    .insight_type === "synergy"
                                                ? "border-terminal-purple text-terminal-purple"
                                                : matchInsight.insight
                                                    .insight_type === "risk"
                                                ? "border-red-400 text-red-400"
                                                : matchInsight.insight
                                                    .insight_type ===
                                                  "hidden_asset"
                                                ? "border-terminal-yellow text-terminal-yellow"
                                                : matchInsight.insight
                                                    .insight_type ===
                                                  "network_effect"
                                                ? "border-terminal-cyan text-terminal-cyan"
                                                : "border-terminal-text-muted text-terminal-text-muted"
                                            }
                                          >
                                            {matchInsight.insight.insight_type.replace(
                                              /_/g,
                                              " "
                                            )}
                                          </Badge>
                                          {matchInsight.relevance_score && (
                                            <span className="text-terminal-green text-xs">
                                              {Math.round(
                                                matchInsight.relevance_score *
                                                  100
                                              )}
                                              % relevant
                                            </span>
                                          )}
                                        </div>
                                        <h5 className="text-terminal-cyan font-medium text-sm mb-1">
                                          {matchInsight.insight.title}
                                        </h5>
                                        <p className="text-terminal-text text-sm">
                                          {matchInsight.insight.description}
                                        </p>
                                        {matchInsight.insight.score && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className="text-terminal-text-muted text-xs">
                                              Score:
                                            </span>
                                            <div className="w-20 bg-terminal-bg rounded-full h-1.5">
                                              <div
                                                className="bg-terminal-green h-1.5 rounded-full transition-all"
                                                style={{
                                                  width: `${
                                                    matchInsight.insight.score *
                                                    100
                                                  }%`,
                                                }}
                                              />
                                            </div>
                                            <span className="text-terminal-green text-xs">
                                              {Math.round(
                                                matchInsight.insight.score * 100
                                              )}
                                              %
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {matchInsights[match.id] &&
                              matchInsights[match.id].length === 0 && (
                                <p className="mt-3 text-terminal-text-muted text-sm text-center">
                                  No insights available for this match.
                                </p>
                              )}
                          </div>
                        </div>

                        {/* User Status Badge */}
                        <UserStatusBadge status={match.matched_user.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent
            value="conversations"
            className="flex-1 overflow-y-auto p-6"
          >
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-terminal-cyan animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-terminal-text-muted">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversations found for this user.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-terminal-cyan font-mono text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Omniscient Conversations ({conversations.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="border border-terminal-purple/30 rounded-lg p-4 hover:bg-terminal-purple/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          {/* Other User Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-terminal-purple/20 flex items-center justify-center">
                              <User className="w-5 h-5 text-terminal-purple" />
                            </div>
                            <div>
                              <p className="font-mono text-terminal-purple">
                                @{conversation.other_user.handle}
                              </p>
                              <p className="text-terminal-text-muted text-sm">
                                {conversation.other_user.agent_profiles?.[0]
                                  ?.agent_name || "No agent"}
                              </p>
                            </div>
                          </div>

                          {/* Conversation Details */}
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-terminal-text-muted text-sm">
                                Quality Score
                              </p>
                              {conversation.quality_score ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-terminal-bg rounded-full h-2">
                                    <div
                                      className="bg-terminal-purple h-2 rounded-full transition-all"
                                      style={{
                                        width: `${
                                          conversation.quality_score * 100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-terminal-purple font-mono text-sm">
                                    {Math.round(
                                      conversation.quality_score * 100
                                    )}
                                    %
                                  </span>
                                </div>
                              ) : (
                                <span className="text-terminal-text-muted text-sm">
                                  N/A
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="text-terminal-text-muted text-sm">
                                Status
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  conversation.status === "completed"
                                    ? "border-terminal-green text-terminal-green"
                                    : conversation.status === "active"
                                    ? "border-terminal-purple text-terminal-purple"
                                    : conversation.status === "scheduled"
                                    ? "border-terminal-cyan text-terminal-cyan"
                                    : conversation.status === "failed"
                                    ? "border-red-400 text-red-400"
                                    : "border-terminal-text-muted text-terminal-text-muted"
                                }
                              >
                                {conversation.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Outcome */}
                          {conversation.actual_outcome && (
                            <div className="mt-3">
                              <p className="text-terminal-text-muted text-sm mb-1">
                                Actual Outcome
                              </p>
                              <Badge
                                variant="outline"
                                className={
                                  conversation.actual_outcome === "STRONG_MATCH"
                                    ? "border-terminal-green text-terminal-green"
                                    : conversation.actual_outcome ===
                                      "EXPLORATORY"
                                    ? "border-terminal-yellow text-terminal-yellow"
                                    : conversation.actual_outcome ===
                                      "FUTURE_POTENTIAL"
                                    ? "border-terminal-cyan text-terminal-cyan"
                                    : "border-terminal-text-muted text-terminal-text-muted"
                                }
                              >
                                {conversation.actual_outcome.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          )}

                          {/* Conversation Summary */}
                          {conversation.conversation_summary && (
                            <div className="mt-3">
                              <p className="text-terminal-text-muted text-sm mb-1">
                                Summary
                              </p>
                              <p className="text-terminal-text text-sm">
                                {conversation.conversation_summary}
                              </p>
                            </div>
                          )}

                          {/* Key Moments */}
                          {conversation.key_moments &&
                            conversation.key_moments.length > 0 && (
                              <div className="mt-3">
                                <p className="text-terminal-text-muted text-sm mb-1">
                                  Key Moments
                                </p>
                                <div className="space-y-1">
                                  {conversation.key_moments.map(
                                    (moment: any, idx: number) => (
                                      <p
                                        key={idx}
                                        className="text-terminal-text text-sm"
                                      >
                                        • {moment}
                                      </p>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Timestamps */}
                          <div className="flex flex-wrap gap-3 text-terminal-text-muted text-xs mt-3">
                            <span>
                              Created: {formatDate(conversation.created_at)}
                            </span>
                            {conversation.scheduled_for && (
                              <span>
                                Scheduled:{" "}
                                {formatDate(conversation.scheduled_for)}
                              </span>
                            )}
                            {conversation.completed_at && (
                              <span>
                                Completed:{" "}
                                {formatDate(conversation.completed_at)}
                              </span>
                            )}
                          </div>

                          {/* Conversation Turns Section */}
                          <div className="mt-4 pt-3 border-t border-terminal-purple/20">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (conversationTurns[conversation.id]) {
                                  // Toggle visibility
                                  setConversationTurns((prev) => {
                                    const newTurns = { ...prev };
                                    if (newTurns[conversation.id]) {
                                      delete newTurns[conversation.id];
                                    }
                                    return newTurns;
                                  });
                                } else {
                                  fetchConversationTurns(conversation.id);
                                }
                              }}
                              className="w-full justify-between text-terminal-purple hover:text-terminal-purple hover:bg-terminal-purple/10"
                            >
                              <span className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                {conversationTurns[conversation.id]
                                  ? "Hide Conversation"
                                  : "Show Conversation"}
                              </span>
                              {loadingTurns[conversation.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : conversationTurns[conversation.id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>

                            {/* Display Conversation Turns */}
                            {conversationTurns[conversation.id] &&
                              conversationTurns[conversation.id].length > 0 && (
                                <div className="mt-3 space-y-3">
                                  {conversationTurns[conversation.id].map(
                                    (turn, idx) => (
                                      <div
                                        key={turn.id}
                                        className="bg-terminal-bg/50 rounded p-3 border border-terminal-purple/20"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant="outline"
                                              className={
                                                turn.speaker_role === "agent_a"
                                                  ? "border-terminal-cyan text-terminal-cyan"
                                                  : "border-terminal-yellow text-terminal-yellow"
                                              }
                                            >
                                              {turn.speaker_role}
                                            </Badge>
                                            <span className="text-terminal-text-muted text-sm">
                                              @{turn.speaker.handle}
                                            </span>
                                          </div>
                                          {turn.opportunity_alignment_score && (
                                            <span className="text-terminal-green text-xs">
                                              {Math.round(
                                                turn.opportunity_alignment_score *
                                                  100
                                              )}
                                              % aligned
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-terminal-text text-sm whitespace-pre-wrap">
                                          {turn.message}
                                        </p>
                                        {turn.guided_by_insights &&
                                          turn.guided_by_insights.length >
                                            0 && (
                                            <p className="text-terminal-text-muted text-xs mt-2">
                                              Guided by{" "}
                                              {turn.guided_by_insights.length}{" "}
                                              insight
                                              {turn.guided_by_insights.length >
                                              1
                                                ? "s"
                                                : ""}
                                            </p>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {conversationTurns[conversation.id] &&
                              conversationTurns[conversation.id].length ===
                                0 && (
                                <p className="mt-3 text-terminal-text-muted text-sm text-center">
                                  No conversation turns available.
                                </p>
                              )}
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        {conversation.match?.opportunity_score && (
                          <Badge
                            variant="outline"
                            className="border-terminal-green text-terminal-green"
                          >
                            {Math.round(
                              conversation.match.opportunity_score * 100
                            )}
                            % match
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Status Actions */}
              {user.status === "PENDING" && (onApprove || onReject) && (
                <div className="border border-terminal-yellow/30 rounded-lg p-6 space-y-4">
                  <h3 className="text-terminal-yellow font-mono text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Approval Actions
                  </h3>
                  <p className="text-terminal-text-muted text-sm">
                    This user is pending approval. Review their profile and
                    personal story before making a decision.
                  </p>
                  <div className="flex gap-3">
                    {onApprove && (
                      <Button
                        onClick={() => onApprove(user.id)}
                        className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
                      >
                        Approve User
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        variant="outline"
                        onClick={() => onReject(user.id)}
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-terminal-bg"
                      >
                        Reject User
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Already Approved/Rejected Message */}
              {user.status !== "PENDING" && (
                <div className="text-center py-12 text-terminal-text-muted">
                  <p>This user has already been {user.status.toLowerCase()}.</p>
                  <p className="text-sm mt-2">No actions available.</p>
                </div>
              )}

              {/* Placeholder for future actions */}
              <div className="mt-8 text-terminal-text-muted text-sm">
                <p>
                  More administrative actions will be available here in the
                  future.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
