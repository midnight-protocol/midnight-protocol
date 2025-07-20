import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  omniscientService, 
  OmniscientMorningReport, 
  MatchNotification 
} from '@/services/omniscient.service';
import { 
  Loader2, 
  Sun, 
  Mail, 
  Play, 
  Calendar, 
  Users, 
  TrendingUp, 
  Brain,
  User,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const OmniscientMorningReports = () => {
  const [selectedReport, setSelectedReport] = useState<OmniscientMorningReport | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [emailDate, setEmailDate] = useState('');
  const [forceResend, setForceResend] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [emailOverride, setEmailOverride] = useState('');
  const queryClient = useQueryClient();

  // Fetch morning reports stats
  const { data: morningReportsStats, isLoading: statsLoading } = useQuery({
    queryKey: ['morning-reports-stats'],
    queryFn: async () => {
      try {
        const reports = await omniscientService.getMorningReports({ limit: 100 });
        const todayReports = reports.filter(
          (r) => r.report_date === new Date().toISOString().split("T")[0]
        );

        return {
          totalToday: todayReports.length,
          averageNotifications:
            todayReports.reduce((sum, r) => sum + r.notification_count, 0) /
              todayReports.length || 0,
          emailsSent: todayReports.filter((r) => r.email_sent).length,
          totalReports: reports.length,
          recentReports: reports.slice(0, 10)
        };
      } catch (error) {
        console.error("Error fetching morning reports stats:", error);
        return { 
          totalToday: 0, 
          averageNotifications: 0, 
          emailsSent: 0, 
          totalReports: 0,
          recentReports: []
        };
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all morning reports for detailed view
  const { data: allReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['all-morning-reports', dateFilter],
    queryFn: async () => {
      const filters: any = { limit: 50 };
      if (dateFilter && dateFilter.trim() !== '') {
        filters.dateRange = {
          start: dateFilter,
          end: dateFilter
        };
      }
      return await omniscientService.getMorningReports(filters);
    },
  });

  const handleGenerateMorningReports = async () => {
    setIsGenerating(true);
    try {
      const result = await omniscientService.generateMorningReports({
        date: dateFilter || undefined,
        forceRegenerate
      });
      console.log('Morning reports generated:', result);
      
      // Refetch data after generation
      queryClient.invalidateQueries({ queryKey: ['morning-reports-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-morning-reports'] });
      
      // Show success message with details
      console.log(`✅ Generated ${result.summary.reportsGenerated} reports, marked ${result.summary.matchesMarkedAsReported} matches as reported`);
      
    } catch (error) {
      console.error('Failed to generate morning reports:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmails = async () => {
    setIsSendingEmails(true);
    try {
      const result = await omniscientService.sendMorningReportEmails({
        date: emailDate || undefined,
        forceResend,
        dryRun,
        emailOverride: emailOverride.trim() || undefined
      });
      console.log('Morning report emails processed:', result);
      
      // Refetch stats after sending emails
      queryClient.invalidateQueries({ queryKey: ['morning-reports-stats'] });
      
      // Show success message
      if (dryRun) {
        console.log(`📋 Dry run completed: ${result.summary.emailsSent} emails would be sent`);
      } else {
        console.log(`📧 Sent ${result.summary.emailsSent} emails, ${result.summary.emailsFailed} failed`);
      }
      
    } catch (error) {
      console.error('Failed to send morning report emails:', error);
    } finally {
      setIsSendingEmails(false);
    }
  };

  const getMatchTypeBadge = (outcome: string) => {
    switch (outcome) {
      case "STRONG_MATCH":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Strong Match
          </Badge>
        );
      case "EXPLORATORY":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Exploratory
          </Badge>
        );
      case "FUTURE_POTENTIAL":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Future Potential
          </Badge>
        );
      default:
        return <Badge variant="outline">Match</Badge>;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading morning reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Morning Reports System</h1>
            <p className="text-gray-400">AI-powered daily insights and match notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['morning-reports-stats'] })}
            variant="outline"
            size="sm"
            className="border-gray-600 hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Generation Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-400" />
            Report Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Date (optional)</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceRegenerate"
                  checked={forceRegenerate}
                  onChange={(e) => setForceRegenerate(e.target.checked)}
                  className="rounded border-gray-600"
                />
                <label htmlFor="forceRegenerate" className="text-sm text-gray-300">
                  Force regenerate all reports
                </label>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateMorningReports}
                disabled={isGenerating}
                className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {forceRegenerate ? 'Regenerate All' : 'Generate New'} Reports
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-700/50 rounded-lg text-sm text-gray-300">
            <strong>Incremental Mode:</strong> Only processes new matches not yet reported.<br />
            <strong>Force Regenerate:</strong> Reprocesses all matches for the selected date, overwriting existing reports.
          </div>
        </CardContent>
      </Card>

      {/* Email Management */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Email Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Email Date</label>
              <Input
                type="date"
                value={emailDate}
                onChange={(e) => setEmailDate(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Today"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Override Email (Testing)</label>
              <Input
                type="email"
                value={emailOverride}
                onChange={(e) => setEmailOverride(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="test@example.com"
              />
            </div>
            <div className="flex items-end">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="forceResend"
                    checked={forceResend}
                    onChange={(e) => setForceResend(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <label htmlFor="forceResend" className="text-xs text-gray-300">
                    Force resend
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRun"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <label htmlFor="dryRun" className="text-xs text-gray-300">
                    Dry run
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSendEmails}
                disabled={isSendingEmails}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {isSendingEmails ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {dryRun ? 'Test' : 'Send'} Emails
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-700/50 rounded-lg text-sm text-gray-300">
            <strong>Default:</strong> Sends emails only to users with unsent reports.<br />
            <strong>Force Resend:</strong> Sends emails even to users who already received them.<br />
            <strong>Dry Run:</strong> Test mode - shows what emails would be sent without actually sending them.<br />
            <strong>Override Email:</strong> Send all emails to this address instead of users (for testing).
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Reports Today</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {morningReportsStats?.totalToday || 0}
            </div>
            <p className="text-xs text-gray-400">Generated today</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Notifications</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {morningReportsStats?.averageNotifications.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-gray-400">Per report today</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {morningReportsStats?.emailsSent || 0}
            </div>
            <p className="text-xs text-gray-400">Email deliveries</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Reports</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {morningReportsStats?.totalReports || 0}
            </div>
            <p className="text-xs text-gray-400">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Recent Reports
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm"
                placeholder="Filter by date"
              />
              <Button
                onClick={() => setDateFilter('')}
                variant="outline"
                size="sm"
                className="border-gray-600 hover:bg-gray-700"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              allReports?.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedReport?.id === report.id
                      ? "bg-blue-600/20 border border-blue-500"
                      : "bg-gray-700/50 hover:bg-gray-700 border border-gray-600"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-white">
                        {format(new Date(report.report_date), "MMM d, yyyy")}
                      </span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {report.notification_count} notifications
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {report.user?.handle && (
                          <span className="text-blue-400 font-medium truncate">
                            @{report.user.handle}
                          </span>
                        )}
                        <span className="text-gray-400">
                          Score: {report.total_opportunity_score.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-400 flex-shrink-0 ml-2">
                        {report.email_sent ? '✓ Emailed' : '○ Not sent'}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
            
            {allReports?.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No reports found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Details */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Report Details - {format(new Date(selectedReport.report_date), "MMMM d, yyyy")}
                  {selectedReport.user?.handle && (
                    <span className="text-blue-400 font-medium ml-2">
                      (@{selectedReport.user.handle})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedReport.notification_count} notifications
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {selectedReport.total_opportunity_score.toFixed(1)} total score
                  </span>
                  {selectedReport.email_sent && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Email sent
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {selectedReport.match_summaries.total_matches}
                    </div>
                    <div className="text-xs text-gray-400">Total Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {selectedReport.match_summaries.average_opportunity_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-400">
                      {selectedReport.match_summaries.highest_scoring_match.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Top Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400">
                      {Object.keys(selectedReport.match_summaries.top_outcomes).length}
                    </div>
                    <div className="text-xs text-gray-400">Outcomes</div>
                  </div>
                </div>

                {/* Agent Insights */}
                {selectedReport.agent_insights && (
                  <div className="p-4 bg-gray-700/30 rounded-lg border border-purple-500/20">
                    <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Agent Insights
                    </h4>
                    <div className="space-y-3">
                      {selectedReport.agent_insights.patterns_observed.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">Patterns</h5>
                          {selectedReport.agent_insights.patterns_observed.map((pattern, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs mb-1">
                              <ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-400 break-words">{pattern}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedReport.agent_insights.top_opportunities.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">Opportunities</h5>
                          {selectedReport.agent_insights.top_opportunities.map((opportunity, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs mb-1">
                              <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-400 break-words whitespace-normal">{opportunity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Notifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Match Notifications ({selectedReport.match_notifications.length})
                  </h4>
                  {selectedReport.match_notifications.slice(0, 3).map((notification) => (
                    <div
                      key={notification.match_id}
                      className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {notification.other_user.handle}
                            </p>
                            <p className="text-xs text-gray-400">
                              Score: {(notification.notification_score * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        {getMatchTypeBadge(notification.predicted_outcome)}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {notification.notification_reasoning}
                      </p>
                      <div className="p-2 bg-gray-800/50 rounded text-xs text-gray-400">
                        <span className="text-yellow-400">Rationale:</span> {notification.introduction_rationale}
                      </div>
                    </div>
                  ))}
                  
                  {selectedReport.match_notifications.length > 3 && (
                    <div className="text-center">
                      <Badge variant="outline" className="text-gray-400">
                        +{selectedReport.match_notifications.length - 3} more notifications
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-400">
                  <Sun className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p>Select a report to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OmniscientMorningReports;