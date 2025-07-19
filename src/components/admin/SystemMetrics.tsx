
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MessageSquare, UserCheck, Download, Calendar, RefreshCw } from 'lucide-react';
import { adminAPIService } from '@/services/admin-api.service';
import { toast } from 'sonner';

interface MetricData {
  date: string;
  newUsers: number;
  conversations: number;
  introductions: number;
  qualityScore: number;
}

interface SuccessMetrics {
  totalUsers: number;
  activeUsers: number;
  conversationsToday: number;
  introductionRate: number;
  avgQualityScore: number;
  networkGrowth: number;
}

export const SystemMetrics = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartData, setChartData] = useState<MetricData[]>([]);
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    conversationsToday: 0,
    introductionRate: 0,
    avgQualityScore: 0,
    networkGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const metrics = await adminAPIService.getMetrics(timeRange);
      
      // Update success metrics from the API response
      if (metrics.summary) {
        setSuccessMetrics({
          totalUsers: metrics.summary.totalUsers || 0,
          activeUsers: metrics.summary.approvedUsers || 0,
          conversationsToday: metrics.summary.totalConversations || 0,
          introductionRate: metrics.summary.totalIntroductions || 0,
          avgQualityScore: 0.75, // Default for now
          networkGrowth: Math.round((metrics.summary.approvedUsers / metrics.summary.totalUsers) * 100) || 0
        });
      }
      
      // Process time series data
      if (metrics.userGrowth) {
        const data: MetricData[] = metrics.userGrowth.map((item: any) => ({
          date: item.date,
          newUsers: item.count,
          conversations: 0,
          introductions: 0,
          qualityScore: 0.75
        }));
        
        // Merge with conversation data if available
        if (metrics.conversationVolume) {
          metrics.conversationVolume.forEach((item: any) => {
            const existing = data.find(d => d.date === item.date);
            if (existing) {
              existing.conversations = item.count;
            }
          });
        }
        
        // Merge with introduction data if available
        if (metrics.introductionRequests) {
          metrics.introductionRequests.forEach((item: any) => {
            const existing = data.find(d => d.date === item.date);
            if (existing) {
              existing.introductions = item.count;
            }
          });
        }
        
        setChartData(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const conversationOutcomes = [
    { name: 'Strong Match', value: 28, color: '#00ff00' },
    { name: 'Exploratory', value: 36, color: '#00ffff' },
    { name: 'Future Potential', value: 24, color: '#ffff00' },
    { name: 'No Match', value: 12, color: '#ff6b6b' }
  ];

  const handleExportMetrics = async () => {
    try {
      const exportData = await adminAPIService.exportMetrics(timeRange, 'json');
      
      const blob = new Blob([typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `midnight_protocol_metrics_${timeRange}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Metrics exported successfully');
    } catch (error) {
      console.error('Failed to export metrics:', error);
      toast.error('Failed to export metrics');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-terminal-cyan font-mono text-xl">System Metrics Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="flex border border-terminal-green/30 rounded">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? 
                  "bg-terminal-green text-terminal-bg" : 
                  "text-terminal-green hover:bg-terminal-green/10"
                }
              >
                {range}
              </Button>
            ))}
          </div>
          <Button
            onClick={fetchMetrics}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportMetrics}
            variant="outline"
            size="sm"
            className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-terminal-green" />
              <div>
                <div className="text-xl font-bold text-terminal-green font-mono">
                  {successMetrics.totalUsers}
                </div>
                <div className="text-terminal-text-muted text-xs">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-terminal-cyan" />
              <div>
                <div className="text-xl font-bold text-terminal-cyan font-mono">
                  {successMetrics.activeUsers}
                </div>
                <div className="text-terminal-text-muted text-xs">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-yellow/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-terminal-yellow" />
              <div>
                <div className="text-xl font-bold text-terminal-yellow font-mono">
                  {successMetrics.conversationsToday}
                </div>
                <div className="text-terminal-text-muted text-xs">Today's Convos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-terminal-green" />
              <div>
                <div className="text-xl font-bold text-terminal-green font-mono">
                  {successMetrics.introductionRate}%
                </div>
                <div className="text-terminal-text-muted text-xs">Intro Success</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-terminal-cyan" />
              <div>
                <div className="text-xl font-bold text-terminal-cyan font-mono">
                  {Math.round(successMetrics.avgQualityScore * 100)}%
                </div>
                <div className="text-terminal-text-muted text-xs">Avg Quality</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-yellow/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-terminal-yellow" />
              <div>
                <div className="text-xl font-bold text-terminal-yellow font-mono">
                  +{successMetrics.networkGrowth}%
                </div>
                <div className="text-terminal-text-muted text-xs">Growth Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardHeader>
            <CardTitle className="text-terminal-green font-mono">User Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#00ff00', fontSize: 12 }} />
                <YAxis tick={{ fill: '#00ff00', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #00ff00',
                    borderRadius: '4px',
                    color: '#00ff00'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#00ff00" 
                  strokeWidth={2}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversation Outcomes */}
        <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
          <CardHeader>
            <CardTitle className="text-terminal-cyan font-mono">Conversation Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conversationOutcomes}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {conversationOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #00ffff',
                    borderRadius: '4px',
                    color: '#00ffff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Network Activity */}
        <Card className="bg-terminal-bg/30 border-terminal-yellow/30">
          <CardHeader>
            <CardTitle className="text-terminal-yellow font-mono">Network Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#ffff00', fontSize: 12 }} />
                <YAxis tick={{ fill: '#ffff00', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #ffff00',
                    borderRadius: '4px',
                    color: '#ffff00'
                  }} 
                />
                <Legend />
                <Bar dataKey="conversations" fill="#ffff00" name="Conversations" />
                <Bar dataKey="introductions" fill="#00ffff" name="Introductions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Trends */}
        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardHeader>
            <CardTitle className="text-terminal-green font-mono">Quality Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#00ff00', fontSize: 12 }} />
                <YAxis domain={[0, 1]} tick={{ fill: '#00ff00', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #00ff00',
                    borderRadius: '4px',
                    color: '#00ff00'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="qualityScore" 
                  stroke="#00ff00" 
                  strokeWidth={2}
                  name="Quality Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
