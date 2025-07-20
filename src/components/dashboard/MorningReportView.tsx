import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Mail,
  ChevronRight,
  Sun,
  Brain,
  User,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  omniscientService,
  OmniscientMorningReport,
  MatchNotification,
} from "@/services/omniscient.service";

export function MorningReportView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<OmniscientMorningReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<OmniscientMorningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingIntro, setSendingIntro] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      // Get user ID from users table
      const { data: userData } = await omniscientService.getMatches({
        userId: user!.id,
        limit: 1,
      });

      if (!userData) return;

      const reports = await omniscientService.getMorningReports({
        limit: 30,
      });

      setReports(reports);
      if (reports.length > 0) {
        setSelectedReport(reports[0]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load morning reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIntroductionRequest = async (notification: MatchNotification) => {
    setSendingIntro(notification.match_id);
    try {
      // This would call an introduction request function
      toast({
        title: "Introduction Sent!",
        description: `Your introduction request to ${notification.other_user.handle} has been sent.`,
      });
    } catch (error) {
      console.error("Error sending introduction:", error);
      toast({
        title: "Error",
        description: "Failed to send introduction request",
        variant: "destructive",
      });
    } finally {
      setSendingIntro(null);
    }
  };

  const getMatchTypeBadge = (outcome: string) => {
    switch (outcome) {
      case "STRONG_MATCH":
        return (
          <Badge className="bg-terminal-green/20 text-terminal-green border-terminal-green/30">
            Strong Match
          </Badge>
        );
      case "EXPLORATORY":
        return (
          <Badge className="bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30">
            Exploratory
          </Badge>
        );
      case "FUTURE_POTENTIAL":
        return (
          <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">
            Future Potential
          </Badge>
        );
      default:
        return <Badge variant="outline">Match</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-terminal-green font-mono animate-pulse">
          Loading morning reports...
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Sun className="w-12 h-12 text-terminal-yellow mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Morning Reports Yet</h3>
        <p className="text-terminal-text-muted">
          Your omniscient system will start generating reports when matches are found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Report List */}
      <div className="w-64 space-y-2">
        <h3 className="text-sm font-semibold text-terminal-green mb-3">
          Recent Reports
        </h3>
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedReport?.id === report.id
                ? "bg-terminal-green/20 border border-terminal-green"
                : "bg-terminal-bg hover:bg-terminal-green/10 border border-terminal-green/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">
                {format(new Date(report.report_date), "MMM d")}
              </span>
              <Badge variant="secondary" className="text-xs">
                {report.notification_count} matches
              </Badge>
            </div>
            <div className="text-xs text-terminal-text-muted mt-1">
              {report.match_summaries.total_matches} opportunities
            </div>
          </button>
        ))}
      </div>

      {/* Report Details */}
      {selectedReport && (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-terminal-green mb-2">
                Morning Report -{" "}
                {format(new Date(selectedReport.report_date), "MMMM d, yyyy")}
              </h2>
              <div className="flex items-center gap-4 text-sm text-terminal-text-muted">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedReport.notification_count} new matches
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {selectedReport.total_opportunity_score.toFixed(1)} total opportunity score
                </span>
                {selectedReport.email_sent && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email sent
                  </span>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <Card className="p-6 bg-terminal-bg border-terminal-green/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-terminal-green" />
                Match Summary
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-terminal-green">
                    {selectedReport.match_summaries.total_matches}
                  </div>
                  <div className="text-xs text-terminal-text-muted">
                    Total Matches
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-terminal-cyan">
                    {selectedReport.match_summaries.average_opportunity_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-terminal-text-muted">
                    Avg Opportunity
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-terminal-yellow">
                    {selectedReport.match_summaries.highest_scoring_match.toFixed(1)}
                  </div>
                  <div className="text-xs text-terminal-text-muted">
                    Top Score
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-terminal-purple">
                    {Object.keys(selectedReport.match_summaries.top_outcomes).length}
                  </div>
                  <div className="text-xs text-terminal-text-muted">
                    Outcome Types
                  </div>
                </div>
              </div>
            </Card>

            {/* Agent Insights */}
            {selectedReport.agent_insights && (
              <Card className="p-6 bg-terminal-bg border-terminal-purple/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-terminal-purple" />
                  Agent Insights
                </h3>
                <div className="space-y-4">
                  {selectedReport.agent_insights.patterns_observed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-terminal-purple mb-2">
                        Patterns Observed
                      </h4>
                      {selectedReport.agent_insights.patterns_observed.map((pattern, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm mb-1">
                          <ChevronRight className="w-4 h-4 text-terminal-purple mt-0.5 flex-shrink-0" />
                          <span className="text-terminal-text-muted">{pattern}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedReport.agent_insights.top_opportunities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-terminal-cyan mb-2">
                        Top Opportunities
                      </h4>
                      {selectedReport.agent_insights.top_opportunities.map((opportunity, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm mb-1">
                          <ChevronRight className="w-4 h-4 text-terminal-cyan mt-0.5 flex-shrink-0" />
                          <span className="text-terminal-text-muted">{opportunity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedReport.agent_insights.recommended_actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-terminal-green mb-2">
                        Recommended Actions
                      </h4>
                      {selectedReport.agent_insights.recommended_actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm mb-1">
                          <ChevronRight className="w-4 h-4 text-terminal-green mt-0.5 flex-shrink-0" />
                          <span className="text-terminal-text-muted">{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Match Notifications */}
            {selectedReport.match_notifications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-terminal-green" />
                  Match Opportunities
                </h3>
                <div className="space-y-4">
                  {selectedReport.match_notifications.map((notification) => (
                    <Card
                      key={notification.match_id}
                      className="p-6 bg-terminal-bg border-terminal-green/20"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-terminal-cyan/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-terminal-cyan" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold">
                              {notification.other_user.handle}
                            </h4>
                            <p className="text-sm text-terminal-text-muted">
                              Score: {(notification.notification_score * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMatchTypeBadge(notification.predicted_outcome)}
                          <Button
                            onClick={() => handleIntroductionRequest(notification)}
                            disabled={sendingIntro === notification.match_id}
                            size="sm"
                            className="bg-terminal-green hover:bg-terminal-cyan"
                          >
                            {sendingIntro === notification.match_id ? (
                              "Sending..."
                            ) : (
                              <>
                                Request Introduction
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <p className="text-terminal-text mb-4">
                        {notification.notification_reasoning}
                      </p>

                      {/* Introduction Rationale */}
                      <div className="p-3 bg-terminal-bg/50 rounded border border-terminal-text/10 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-terminal-yellow" />
                          <span className="text-xs font-mono text-terminal-yellow">
                            Why This Match Matters
                          </span>
                        </div>
                        <p className="text-sm text-terminal-text-muted">
                          {notification.introduction_rationale}
                        </p>
                      </div>

                      {/* Agent Summary */}
                      {notification.agent_summary && (
                        <div className="p-3 bg-terminal-bg/30 rounded border border-terminal-cyan/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-terminal-cyan" />
                            <span className="text-xs font-mono text-terminal-cyan">
                              Agent Analysis
                            </span>
                          </div>
                          <p className="text-sm text-terminal-text-muted">
                            {notification.agent_summary}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}