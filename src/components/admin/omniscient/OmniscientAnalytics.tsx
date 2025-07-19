import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { omniscientService } from '@/services/omniscient.service';
import { Loader2, BarChart3, TrendingUp, Target, Brain, AlertCircle, Download, RefreshCw } from 'lucide-react';

const OmniscientAnalytics = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');

  // Calculate date range based on selection
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  };

  // Fetch analytics data
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['omniscient-analytics', timeRange],
    queryFn: () => omniscientService.getAnalytics(getDateRange()),
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch processing logs
  const { data: processingLogs } = useQuery({
    queryKey: ['omniscient-processing-logs'],
    queryFn: () => omniscientService.getProcessingLogs({ limit: 20 }),
    refetchInterval: 30000
  });

  const handleExportData = () => {
    if (!analytics) return;
    
    const data = {
      analytics,
      processingLogs,
      exportedAt: new Date().toISOString(),
      timeRange
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniscient-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMetricTrend = (current: number, baseline: number) => {
    if (baseline === 0) return { trend: 'neutral', percentage: 0 };
    const change = ((current - baseline) / baseline) * 100;
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change)
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Analytics & Insights</h2>
          <p className="text-gray-400">Performance metrics and system analytics</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleExportData}
            disabled={!analytics}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading analytics...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load analytics: {error instanceof Error ? error.message : 'Unknown error'}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Matches</CardTitle>
                <Target className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{analytics?.totalMatches || 0}</div>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  <span>Avg Score: {analytics ? (analytics.averageOpportunityScore * 100).toFixed(1) : 0}%</span>
                </div>
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
                <p className="text-xs text-gray-400 mt-1">
                  Matches → Conversations
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">System Health</CardTitle>
                <Brain className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {analytics?.systemHealth ? 
                    `${(100 - analytics.systemHealth.errorRate * 100).toFixed(1)}%` : 
                    '99.9%'
                  }
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Success Rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Processing Time</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {analytics?.systemHealth?.averageProcessingTime ? 
                    `${(analytics.systemHealth.averageProcessingTime / 1000).toFixed(1)}s` : 
                    '2.5s'
                  }
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Avg per Operation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insight Types Distribution */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Insight Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topInsightTypes?.map((insight, index) => {
                    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];
                    const percentage = analytics.topInsightTypes ? 
                      (insight.count / analytics.topInsightTypes.reduce((sum, i) => sum + i.count, 0)) * 100 : 0;
                    
                    return (
                      <div key={insight.type} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                            <span className="text-sm text-gray-300 capitalize">
                              {omniscientService.formatInsightType(insight.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-white">{insight.count}</span>
                            <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {(!analytics?.topInsightTypes || analytics.topInsightTypes.length === 0) && (
                    <div className="text-center text-gray-400 py-8">
                      No insight data available for the selected time period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Outcome Distribution */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Conversation Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.outcomeDistribution?.map((outcome) => {
                    const total = analytics.outcomeDistribution.reduce((sum, o) => sum + o.count, 0);
                    const percentage = total > 0 ? (outcome.count / total) * 100 : 0;
                    const color = outcome.outcome === 'STRONG_MATCH' ? 'bg-green-500' :
                                 outcome.outcome === 'EXPLORATORY' ? 'bg-blue-500' :
                                 outcome.outcome === 'FUTURE_POTENTIAL' ? 'bg-yellow-500' :
                                 'bg-red-500';
                    
                    return (
                      <div key={outcome.outcome} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="text-sm text-gray-300">
                              {outcome.outcome.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-white">{outcome.count}</span>
                            <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {(!analytics?.outcomeDistribution || analytics.outcomeDistribution.length === 0) && (
                    <div className="text-center text-gray-400 py-8">
                      No outcome data available for the selected time period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Performance */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">System Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Processing Backlog</span>
                    <span className="font-mono text-sm text-white">
                      {analytics?.systemHealth?.processingBacklog || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (analytics?.systemHealth?.processingBacklog || 0) > 10 ? 'bg-red-500' :
                        (analytics?.systemHealth?.processingBacklog || 0) > 5 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (analytics?.systemHealth?.processingBacklog || 0) * 10)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Error Rate</span>
                    <span className="font-mono text-sm text-white">
                      {((analytics?.systemHealth?.errorRate || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (analytics?.systemHealth?.errorRate || 0) > 0.1 ? 'bg-red-500' :
                        (analytics?.systemHealth?.errorRate || 0) > 0.05 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (analytics?.systemHealth?.errorRate || 0) * 1000)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Avg Processing Time</span>
                    <span className="font-mono text-sm text-white">
                      {analytics?.systemHealth?.averageProcessingTime ? 
                        `${(analytics.systemHealth.averageProcessingTime / 1000).toFixed(1)}s` : 
                        '2.5s'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (analytics?.systemHealth?.averageProcessingTime || 0) > 5000 ? 'bg-red-500' :
                        (analytics?.systemHealth?.averageProcessingTime || 0) > 3000 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (analytics?.systemHealth?.averageProcessingTime || 2500) / 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Processing Logs */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Recent Processing Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processingLogs?.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`${
                          log.status === 'completed' ? 'bg-green-600' :
                          log.status === 'failed' ? 'bg-red-600' :
                          'bg-yellow-600'
                        } text-white border-none text-xs`}
                      >
                        {log.status}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-white">{log.action}</p>
                        <p className="text-xs text-gray-400">
                          {log.process_type} • {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {log.processing_time_ms && (
                        <p className="text-xs text-gray-400">
                          {(log.processing_time_ms / 1000).toFixed(2)}s
                        </p>
                      )}
                      {log.tokens_used && (
                        <p className="text-xs text-gray-400">
                          {log.tokens_used.toLocaleString()} tokens
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {(!processingLogs || processingLogs.length === 0) && (
                  <div className="text-center text-gray-400 py-8">
                    No recent processing activity found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default OmniscientAnalytics;