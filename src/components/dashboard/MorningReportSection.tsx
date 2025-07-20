import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Mail,
  ExternalLink,
  ChevronRight,
  Sun,
  User,
  MessageSquare,
  ArrowRight,
  Brain,
} from "lucide-react";
import {
  omniscientService,
  OmniscientMorningReport,
  MatchNotification,
} from "@/services/omniscient.service";
import { toast } from "sonner";

interface MorningReportSectionProps {
  userId: string;
  userStatus: string;
}

export const MorningReportSection: React.FC<MorningReportSectionProps> = ({
  userId,
  userStatus,
}) => {
  const [latestReport, setLatestReport] =
    useState<OmniscientMorningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    if (userStatus === "APPROVED") {
      fetchLatestReport();
    } else {
      setLoading(false);
      setShowSample(true);
    }
  }, [userId, userStatus]);

  const fetchLatestReport = async () => {
    try {
      const report = await omniscientService.getUserMorningReport(userId);

      if (report && report.match_notifications.length > 0) {
        setLatestReport(report);
        setShowSample(false);
      } else {
        setShowSample(true);
      }
    } catch (err) {
      console.error("Error fetching morning report:", err);
      setShowSample(true);
    } finally {
      setLoading(false);
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
      <Card className="bg-terminal-bg/50 border-terminal-cyan/30">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-terminal-bg-secondary rounded w-1/3"></div>
            <div className="h-4 bg-terminal-bg-secondary rounded w-2/3"></div>
            <div className="h-32 bg-terminal-bg-secondary rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notifications = showSample
    ? SAMPLE_NOTIFICATIONS
    : latestReport?.match_notifications || [];
  const isPreview = showSample || !latestReport;

  return (
    <Card className="bg-terminal-bg/50 border-terminal-cyan/30 overflow-hidden">
      {/* Header */}
      <CardHeader className="relative pb-6">
        <div className="absolute top-4 right-4">
          {isPreview && (
            <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">
              Preview
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Sun className="w-6 h-6 text-terminal-yellow" />
          <CardTitle className="text-2xl font-mono text-terminal-green">
            Morning Report
          </CardTitle>
        </div>
        <p className="text-terminal-text-muted">
          {isPreview
            ? "Here's what your morning reports will look like"
            : `${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}`}
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        {/* Summary Stats */}
        {!isPreview && latestReport?.match_summaries && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20">
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-cyan">
                {latestReport.notification_count}
              </p>
              <p className="text-xs text-terminal-text-muted">New Matches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-green">
                {latestReport.match_summaries.average_opportunity_score.toFixed(
                  1
                )}
              </p>
              <p className="text-xs text-terminal-text-muted">
                Avg Opportunity
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-yellow">
                {latestReport.match_summaries.highest_scoring_match.toFixed(1)}
              </p>
              <p className="text-xs text-terminal-text-muted">Top Score</p>
            </div>
          </div>
        )}

        {/* Match Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-mono text-terminal-cyan flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            New Opportunities
          </h3>

          {notifications.length > 0 ? (
            notifications
              .slice(0, 2)
              .map((notification: MatchNotification, index: number) => (
                <div
                  key={notification.match_id || index}
                  className="p-5 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20 hover:border-terminal-cyan/40 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-terminal-cyan/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-terminal-cyan" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-terminal-text">
                            {notification.other_user.handle}
                          </p>
                          <span className="text-terminal-text-muted">•</span>
                          <p className="text-sm text-terminal-text-muted">
                            Score:{" "}
                            {(notification.notification_score * 100).toFixed(0)}
                            %
                          </p>
                        </div>
                        <p className="text-sm text-terminal-text-muted mt-0.5">
                          {notification.notification_reasoning}
                        </p>
                      </div>
                    </div>
                    {getMatchTypeBadge(notification.predicted_outcome)}
                  </div>

                  {/* Introduction Rationale */}
                  <div className="p-3 bg-terminal-bg rounded border border-terminal-text/10 mb-4">
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

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono group-hover:scale-105 transition-transform"
                      disabled={isPreview}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Request Introduction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                      disabled={isPreview}
                    >
                      View Match Details
                    </Button>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-8">
              <p className="text-terminal-text-muted">
                No new matches today. Check back tomorrow!
              </p>
            </div>
          )}
        </div>

        {/* Agent Insights */}
        {!isPreview && latestReport?.agent_insights && (
          <div className="p-4 bg-terminal-bg/60 rounded-lg border border-terminal-purple/20">
            <h4 className="text-sm font-mono text-terminal-purple mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Agent Insights
            </h4>
            {latestReport.agent_insights.top_opportunities.map(
              (opportunity, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm mb-2">
                  <ChevronRight className="w-4 h-4 text-terminal-purple mt-0.5 flex-shrink-0" />
                  <span className="text-terminal-text-muted">
                    {opportunity}
                  </span>
                </div>
              )
            )}
          </div>
        )}

        {/* View Full Report Button */}
        <div className="pt-4">
          <Button
            className="w-full bg-terminal-bg border-2 border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono group"
            disabled={isPreview}
          >
            View Full Morning Report
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          {isPreview && (
            <p className="text-center text-xs text-terminal-text-muted mt-2">
              Complete your profile setup to start receiving real morning
              reports
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sample data for preview
const SAMPLE_NOTIFICATIONS: MatchNotification[] = [
  {
    match_id: "sample-1",
    other_user: {
      id: "sample-user-1",
      handle: "@sarahchen",
      email: "sarah@example.com",
    },
    notification_score: 0.85,
    opportunity_score: 0.78,
    predicted_outcome: "STRONG_MATCH",
    notification_reasoning: "High compatibility in AI/ML collaboration",
    introduction_rationale:
      "Based on your shared interest in ethical AI development, this could be a valuable connection for your upcoming privacy-first AI project.",
    agent_summary:
      "Sarah brings complementary technical expertise in ML infrastructure.",
    match_reasoning:
      "Strong alignment in technical focus and collaboration style",
    insights: [],
    created_at: new Date().toISOString(),
  },
  {
    match_id: "sample-2",
    other_user: {
      id: "sample-user-2",
      handle: "@alexwright",
      email: "alex@example.com",
    },
    notification_score: 0.72,
    opportunity_score: 0.68,
    predicted_outcome: "EXPLORATORY",
    notification_reasoning: "Potential for future collaboration opportunities",
    introduction_rationale:
      "Alex's experience in fintech could provide valuable insights for your payment infrastructure challenges.",
    agent_summary:
      "Alex offers strategic guidance and has relevant industry connections.",
    match_reasoning: "Complementary experience in related domains",
    insights: [],
    created_at: new Date().toISOString(),
  },
];