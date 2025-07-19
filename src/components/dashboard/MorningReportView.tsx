import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface MorningReport {
  id: string;
  report_date: string;
  discoveries: Json;
  activity_summary: Json;
  status?: string;
  sent_at?: string;
}

interface Discovery {
  conversation_id: string;
  match_type: string;
  match_score: number;
  other_user: {
    id: string;
    username: string;
    full_name?: string;
    seeking: string[];
    focus: string[];
  };
  opportunity_summary: string;
  synergies: string[];
  key_insights: string[];
  conversation_snippet?: Array<{
    speaker: string;
    content: string;
  }>;
}

interface ActivitySummary {
  total_conversations: number;
  strong_matches: number;
  exploratory_connections: number;
  future_potential: number;
  agent_name: string;
}

export function MorningReportView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<MorningReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MorningReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sendingIntro, setSendingIntro] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from("morning_reports")
        .select("*")
        .eq("user_id", userData.id)
        .order("report_date", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Map the database data to include missing fields with defaults
      const mappedReports = (data || []).map((report) => ({
        ...report,
        status: "generated", // Default status since it's not in the database
      })) as MorningReport[];

      setReports(mappedReports);
      if (mappedReports.length > 0) {
        setSelectedReport(mappedReports[0]);
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

  const handleIntroductionRequest = async (discovery: Discovery) => {
    setSendingIntro(discovery.conversation_id);
    try {
      const response = await supabase.functions.invoke(
        "handle-introduction-request",
        {
          body: {
            targetUserId: discovery.other_user.id,
            conversationId: discovery.conversation_id,
            message: `I'm interested in the opportunities we discussed around ${
              discovery.synergies[0] || "our shared interests"
            }.`,
          },
        }
      );

      if (response.error) throw response.error;

      toast({
        title: "Introduction Sent!",
        description: `Your introduction request to ${
          discovery.other_user.full_name || discovery.other_user.username
        } has been sent.`,
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

  // Helper function to safely parse JSON data
  const parseDiscoveries = (discoveries: Json): Discovery[] => {
    try {
      if (Array.isArray(discoveries)) {
        return discoveries as unknown as Discovery[];
      }
      return [];
    } catch {
      return [];
    }
  };

  const parseActivitySummary = (activitySummary: Json): ActivitySummary => {
    try {
      if (
        typeof activitySummary === "object" &&
        activitySummary !== null &&
        !Array.isArray(activitySummary)
      ) {
        return activitySummary as unknown as ActivitySummary;
      }
      return {
        total_conversations: 0,
        strong_matches: 0,
        exploratory_connections: 0,
        future_potential: 0,
        agent_name: "Your Agent",
      };
    } catch {
      return {
        total_conversations: 0,
        strong_matches: 0,
        exploratory_connections: 0,
        future_potential: 0,
        agent_name: "Your Agent",
      };
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
          Your agent will start having conversations at midnight tonight.
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
        {reports.map((report) => {
          const discoveries = parseDiscoveries(report.discoveries);
          const activitySummary = parseActivitySummary(report.activity_summary);

          return (
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
                  {discoveries.length} finds
                </Badge>
              </div>
              <div className="text-xs text-terminal-text-muted mt-1">
                {activitySummary.total_conversations} conversations
              </div>
            </button>
          );
        })}
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
                  <MessageCircle className="w-4 h-4" />
                  {
                    parseActivitySummary(selectedReport.activity_summary)
                      .total_conversations
                  }{" "}
                  conversations
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {parseDiscoveries(selectedReport.discoveries).length}{" "}
                  opportunities
                </span>
                {selectedReport.sent_at && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Sent {format(new Date(selectedReport.sent_at), "h:mm a")}
                  </span>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            <Card className="p-6 bg-terminal-bg border-terminal-green/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-terminal-green" />
                Activity Summary
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {(() => {
                  const summary = parseActivitySummary(
                    selectedReport.activity_summary
                  );
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-terminal-green">
                          {summary.total_conversations}
                        </div>
                        <div className="text-xs text-terminal-text-muted">
                          Total Conversations
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-terminal-cyan">
                          {summary.strong_matches}
                        </div>
                        <div className="text-xs text-terminal-text-muted">
                          Strong Matches
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-terminal-yellow">
                          {summary.exploratory_connections}
                        </div>
                        <div className="text-xs text-terminal-text-muted">
                          Explorations
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-terminal-purple">
                          {summary.future_potential}
                        </div>
                        <div className="text-xs text-terminal-text-muted">
                          Future Potential
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>

            {/* Discoveries */}
            {(() => {
              const discoveries = parseDiscoveries(selectedReport.discoveries);
              return (
                discoveries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-terminal-green" />
                      Today's Discoveries
                    </h3>
                    <div className="space-y-4">
                      {discoveries.map((discovery) => (
                        <Card
                          key={discovery.conversation_id}
                          className="p-6 bg-terminal-bg border-terminal-green/20"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold">
                                {discovery.other_user.full_name ||
                                  discovery.other_user.username}
                              </h4>
                              <Badge
                                variant={
                                  discovery.match_type === "strong"
                                    ? "default"
                                    : "secondary"
                                }
                                className="mt-1"
                              >
                                {discovery.match_type} match
                              </Badge>
                            </div>
                            <Button
                              onClick={() =>
                                handleIntroductionRequest(discovery)
                              }
                              disabled={
                                sendingIntro === discovery.conversation_id
                              }
                              size="sm"
                              className="bg-terminal-green hover:bg-terminal-cyan"
                            >
                              {sendingIntro === discovery.conversation_id ? (
                                "Sending..."
                              ) : (
                                <>
                                  Request Introduction
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          </div>

                          <p className="text-terminal-text mb-4">
                            {discovery.opportunity_summary}
                          </p>

                          {discovery.synergies &&
                            discovery.synergies.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold mb-2">
                                  Potential Synergies:
                                </h5>
                                <div className="space-y-2">
                                  {discovery.synergies.map((synergy, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <div className="w-2 h-2 bg-terminal-green rounded-full" />
                                      {synergy}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {discovery.conversation_snippet &&
                            discovery.conversation_snippet.length > 0 && (
                              <div className="mt-4 p-4 bg-terminal-bg/50 rounded-lg border border-terminal-green/10">
                                <h5 className="text-sm font-semibold mb-2">
                                  Conversation Highlight:
                                </h5>
                                {discovery.conversation_snippet.map(
                                  (turn, idx) => (
                                    <div key={idx} className="text-sm mb-2">
                                      <span className="font-semibold text-terminal-green">
                                        {turn.speaker}:
                                      </span>{" "}
                                      <span className="text-terminal-text-muted">
                                        {turn.content}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
