import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { omniscientService } from '@/services/omniscient.service';
import { Loader2, TrendingUp, Users, Brain, Activity, AlertTriangle, Clock, Target } from 'lucide-react';

const OmniscientDashboard = () => {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['omniscient-dashboard'],
    queryFn: () => omniscientService.getAdminDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading omniscient dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load dashboard: {error instanceof Error ? error.message : 'Unknown error'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { analytics, recentMatches, activeConversations, systemHealth } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Matches</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics?.totalMatches || 0}</div>
            <p className="text-xs text-gray-400">
              Avg score: {analytics ? (analytics.averageOpportunityScore * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics ? ((analytics.conversionRate || 0) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-gray-400">
              Matches to conversations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Conversations</CardTitle>
            <Brain className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {activeConversations?.length || 0}
            </div>
            <p className="text-xs text-gray-400">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">System Health</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemHealth?.errorRate ? 
                `${(100 - systemHealth.errorRate * 100).toFixed(1)}%` : 
                '99.9%'
              }
            </div>
            <p className="text-xs text-gray-400">
              {systemHealth?.uptime || '99.9%'} uptime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">Processing Backlog</span>
                <span className="text-sm font-mono text-white">
                  {systemHealth?.processingBacklog || 0}
                </span>
              </div>
              <Progress 
                value={Math.max(0, 100 - (systemHealth?.processingBacklog || 0) * 2)} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">Active Processing</span>
                <span className="text-sm font-mono text-white">
                  {systemHealth?.activeConversations || 0}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">Error Rate</span>
                <span className={`text-sm font-mono ${
                  (systemHealth?.errorRate || 0) > 0.1 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {((systemHealth?.errorRate || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <Progress 
                value={100 - (systemHealth?.errorRate || 0) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Recent High-Value Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMatches?.slice(0, 5).map((match) => (
                <div key={match.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white text-sm">
                      {match.user_a?.handle} × {match.user_b?.handle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${omniscientService.getOutcomeColor(match.predicted_outcome)} border-current`}
                      >
                        {match.predicted_outcome?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Score: {omniscientService.formatOpportunityScore(match.opportunity_score)}
                      </span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${omniscientService.getMatchStatusColor(match.status)} text-white border-none text-xs`}
                  >
                    {match.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              
              {(!recentMatches || recentMatches.length === 0) && (
                <div className="text-center text-gray-400 py-4">
                  No recent matches found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Top Insight Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topInsightTypes?.slice(0, 6).map((insight, index) => (
                <div key={insight.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-purple-${400 + index * 100}`} />
                    <span className="text-sm text-gray-300 capitalize">
                      {omniscientService.formatInsightType(insight.type)}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-white">{insight.count}</span>
                </div>
              ))}
              
              {(!analytics?.topInsightTypes || analytics.topInsightTypes.length === 0) && (
                <div className="text-center text-gray-400 py-4">
                  No insights data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.outcomeDistribution?.map((outcome, index) => (
                <div key={outcome.outcome} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      outcome.outcome === 'STRONG_MATCH' ? 'bg-green-400' :
                      outcome.outcome === 'EXPLORATORY' ? 'bg-blue-400' :
                      outcome.outcome === 'FUTURE_POTENTIAL' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`} />
                    <span className="text-sm text-gray-300">
                      {outcome.outcome.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-white">{outcome.count}</span>
                </div>
              ))}
              
              {(!analytics?.outcomeDistribution || analytics.outcomeDistribution.length === 0) && (
                <div className="text-center text-gray-400 py-4">
                  No outcome data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {systemHealth?.recentErrors && systemHealth.recentErrors.length > 0 && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-lg text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemHealth.recentErrors.slice(0, 3).map((error) => (
                <div key={error.id} className="p-3 bg-red-900/30 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-red-300">{error.action}</p>
                      <p className="text-xs text-red-400 mt-1">{error.error_message}</p>
                    </div>
                    <span className="text-xs text-red-500">
                      {new Date(error.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OmniscientDashboard;