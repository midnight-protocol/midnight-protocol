import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  omniscientService,
  type OmniscientMatch,
} from "@/services/omniscient.service";
import {
  Loader2,
  Users,
  Play,
  Eye,
  RefreshCw,
  Filter,
  Search,
  Zap,
  Calendar,
  TrendingUp,
  Bell,
  BellOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { UserSelectionDialog } from "@/components/admin/UserSelectionDialog";

const OmniscientMatchManager = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minScoreFilter, setMinScoreFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<OmniscientMatch | null>(
    null
  );
  const [userSelectionDialogOpen, setUserSelectionDialogOpen] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(5);
  const queryClient = useQueryClient();

  // Fetch matches
  const {
    data: matches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["omniscient-matches", statusFilter, minScoreFilter],
    queryFn: () =>
      omniscientService.getMatches({
        status: statusFilter === "all" ? undefined : statusFilter,
        minScore: minScoreFilter ? parseFloat(minScoreFilter) : undefined,
        limit: 50,
      }),
    refetchInterval: 30000,
  });

  // Analyze matches mutation
  const analyzeMatchesMutation = useMutation({
    mutationFn: (batchSizeParam: number) =>
      omniscientService.analyzeMatches({ batchSize: batchSizeParam }),
    onSuccess: (data) => {
      toast.success(
        `Analysis complete: ${data.summary.matchesAnalyzed} matches analyzed, ${data.summary.scheduled} scheduled`
      );
      queryClient.invalidateQueries({ queryKey: ["omniscient-matches"] });
    },
    onError: (error) => {
      toast.error(
        `Failed to analyze matches: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Execute conversation mutation
  const executeConversationMutation = useMutation({
    mutationFn: (matchId: string) =>
      omniscientService.executeConversation(matchId),
    onSuccess: (data) => {
      toast.success(
        `Conversation executed with quality score: ${(
          data.data.qualityScore * 100
        ).toFixed(1)}%`
      );
      queryClient.invalidateQueries({ queryKey: ["omniscient-matches"] });
    },
    onError: (error) => {
      toast.error(
        `Failed to execute conversation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Rerun match analysis mutation
  const rerunAnalysisMutation = useMutation({
    mutationFn: ({ userIdA, userIdB }: { userIdA: string; userIdB: string }) =>
      omniscientService.manualMatch(userIdA, userIdB),
    onSuccess: (data) => {
      toast.success(
        `Match analysis updated! Opportunity score: ${
          data.data?.match?.opportunity_score
            ? omniscientService.formatOpportunityScore(
                data.data.match.opportunity_score
              )
            : "N/A"
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["omniscient-matches"] });
    },
    onError: (error) => {
      toast.error(
        `Failed to rerun analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Manual match creation mutation
  const manualMatchMutation = useMutation({
    mutationFn: ({ userIdA, userIdB }: { userIdA: string; userIdB: string }) =>
      omniscientService.manualMatch(userIdA, userIdB),
    onSuccess: (data, variables) => {
      const score = data.data?.match?.opportunity_score;
      toast.success(
        `Match created successfully! Opportunity score: ${
          score ? omniscientService.formatOpportunityScore(score) : "N/A"
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["omniscient-matches"] });
      setUserSelectionDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        `Failed to create match: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Filter matches based on search query
  const filteredMatches =
    matches?.filter((match) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        match.user_a?.handle.toLowerCase().includes(query) ||
        match.user_b?.handle.toLowerCase().includes(query) ||
        match.predicted_outcome.toLowerCase().includes(query)
      );
    }) || [];

  const handleAnalyzeMatches = () => {
    analyzeMatchesMutation.mutate(batchSize);
  };

  const handleExecuteConversation = (matchId: string) => {
    executeConversationMutation.mutate(matchId);
  };

  const handleRerunAnalysis = (match: OmniscientMatch) => {
    rerunAnalysisMutation.mutate({
      userIdA: match.user_a_id,
      userIdB: match.user_b_id,
    });
  };

  const handleManualMatch = (
    userIdA: string,
    userIdB: string,
    userAHandle: string,
    userBHandle: string
  ) => {
    manualMatchMutation.mutate({ userIdA, userIdB });
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Match Manager</h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setUserSelectionDialogOpen(true)}
            disabled={manualMatchMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Run Match on Specific Users
          </Button>
          <Button
            onClick={handleAnalyzeMatches}
            disabled={analyzeMatchesMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {analyzeMatchesMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Run Match Batch ({batchSize})
          </Button>
          <Input
            type="number"
            min="1"
            max="100"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value))}
          />
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["omniscient-matches"],
              })
            }
            className="border-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_analysis">
                    Pending Analysis
                  </SelectItem>
                  <SelectItem value="analyzed">Analyzed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Score
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                placeholder="0.0 - 1.0"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Users
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by handle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-700 border-gray-600 pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stats
              </label>
              <div className="text-sm text-gray-400">
                {filteredMatches.length} of {matches?.length || 0} matches
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches List */}
      {isLoading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading matches...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="text-red-400">
              Failed to load matches:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMatches.map((match) => (
            <Card
              key={match.id}
              className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-semibold text-white">
                          {match.user_a?.handle} × {match.user_b?.handle}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge
                            variant="outline"
                            className={`${omniscientService.getOutcomeColor(
                              match.predicted_outcome
                            )} border-current text-xs`}
                          >
                            {match.predicted_outcome?.replace("_", " ")}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            Score:{" "}
                            {omniscientService.formatOpportunityScore(
                              match.opportunity_score
                            )}
                          </span>
                          {match.should_notify !== undefined && (
                            <div className="flex items-center gap-1 text-sm">
                              {match.should_notify ? (
                                <>
                                  <Bell className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400">
                                    Notify (
                                    {match.notification_score
                                      ? (
                                          match.notification_score * 100
                                        ).toFixed(0)
                                      : "N/A"}
                                    %)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <BellOff className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-500">
                                    No notify
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          {match.scheduled_for && (
                            <span className="text-sm text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(
                                match.scheduled_for
                              ).toLocaleDateString()}
                            </span>
                          )}
                          {match.analyzed_at && (
                            <span className="text-sm text-gray-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Analyzed:{" "}
                              {new Date(match.analyzed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${omniscientService.getMatchStatusColor(
                        match.status
                      )} text-white border-none`}
                    >
                      {match.status.replace("_", " ")}
                    </Badge>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMatch(match)}
                            className="border-gray-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              Match Details: {match.user_a?.handle} ×{" "}
                              {match.user_b?.handle}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Basic Match Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Opportunity Score
                                </label>
                                <p className="text-lg font-bold text-white">
                                  {omniscientService.formatOpportunityScore(
                                    match.opportunity_score
                                  )}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Predicted Outcome
                                </label>
                                <p
                                  className={`text-lg font-bold ${omniscientService.getOutcomeColor(
                                    match.predicted_outcome
                                  )}`}
                                >
                                  {match.predicted_outcome?.replace("_", " ")}
                                </p>
                              </div>
                            </div>

                            {/* Notification Info */}
                            {match.should_notify !== undefined && (
                              <div className="p-4 bg-gray-700 rounded-lg">
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                  {match.should_notify ? (
                                    <Bell className="w-5 h-5 text-green-400" />
                                  ) : (
                                    <BellOff className="w-5 h-5 text-gray-500" />
                                  )}
                                  Notification Assessment
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <label className="text-sm font-medium text-gray-300">
                                      Should Notify
                                    </label>
                                    <p
                                      className={`text-sm font-bold ${
                                        match.should_notify
                                          ? "text-green-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {match.should_notify ? "Yes" : "No"}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-300">
                                      Notification Score
                                    </label>
                                    <p className="text-sm font-bold text-white">
                                      {match.notification_score
                                        ? (
                                            match.notification_score * 100
                                          ).toFixed(1) + "%"
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                                {match.notification_reasoning && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-300">
                                      Reasoning
                                    </label>
                                    <p className="text-sm text-gray-400 mt-1">
                                      {match.notification_reasoning}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Introduction Rationales */}
                            {(match.introduction_rationale_for_user_a ||
                              match.introduction_rationale_for_user_b) && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-white">
                                  Introduction Rationales
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {match.introduction_rationale_for_user_a && (
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                      <label className="text-sm font-medium text-gray-300">
                                        For {match.user_a?.handle}
                                      </label>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {
                                          match.introduction_rationale_for_user_a
                                        }
                                      </p>
                                    </div>
                                  )}
                                  {match.introduction_rationale_for_user_b && (
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                      <label className="text-sm font-medium text-gray-300">
                                        For {match.user_b?.handle}
                                      </label>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {
                                          match.introduction_rationale_for_user_b
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Agent Summaries */}
                            {(match.agent_summaries_agent_a_to_human_a ||
                              match.agent_summaries_agent_b_to_human_b) && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-white">
                                  Agent Summaries
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {match.agent_summaries_agent_a_to_human_a && (
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                      <label className="text-sm font-medium text-gray-300">
                                        Agent A → {match.user_a?.handle}
                                      </label>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {
                                          match.agent_summaries_agent_a_to_human_a
                                        }
                                      </p>
                                    </div>
                                  )}
                                  {match.agent_summaries_agent_b_to_human_b && (
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                      <label className="text-sm font-medium text-gray-300">
                                        Agent B → {match.user_b?.handle}
                                      </label>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {
                                          match.agent_summaries_agent_b_to_human_b
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Analysis Summary */}
                            {match.analysis_summary && (
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Analysis Summary
                                </label>
                                <p className="text-sm text-gray-400 mt-1">
                                  {match.analysis_summary}
                                </p>
                              </div>
                            )}

                            {/* Insights */}
                            {match.insights && match.insights.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                  Insights
                                </label>
                                <div className="space-y-2">
                                  {match.insights.slice(0, 5).map((insight) => (
                                    <div
                                      key={insight.id}
                                      className="p-3 bg-gray-700 rounded-lg"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-white text-sm">
                                            {insight.insight.title}
                                          </p>
                                          <p className="text-xs text-gray-400 mt-1">
                                            {insight.insight.description}
                                          </p>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {omniscientService.formatInsightType(
                                            insight.insight.insight_type
                                          )}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRerunAnalysis(match)}
                        disabled={rerunAnalysisMutation.isPending}
                        className="border-orange-500 text-orange-400 hover:bg-orange-600 hover:text-white"
                        title="Rerun match analysis"
                      >
                        {rerunAnalysisMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </Button>

                      {(match.status === "analyzed" ||
                        match.status === "scheduled") && (
                        <Button
                          size="sm"
                          onClick={() => handleExecuteConversation(match.id)}
                          disabled={executeConversationMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {executeConversationMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredMatches.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No matches found
                </h3>
                <p className="text-gray-400">
                  {statusFilter === "all"
                    ? "Try running the analyze matches function to generate new matches."
                    : `No matches with status "${statusFilter}" found.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* User Selection Dialog */}
      <UserSelectionDialog
        open={userSelectionDialogOpen}
        onOpenChange={setUserSelectionDialogOpen}
        onConfirm={handleManualMatch}
        loading={manualMatchMutation.isPending}
      />
    </div>
  );
};

export default OmniscientMatchManager;
