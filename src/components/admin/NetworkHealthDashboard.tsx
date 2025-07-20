import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  MessageSquare,
  Mail,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { adminAPIService } from "@/services/admin-api.service";
import type { SystemHealth } from "@/services/admin-api.service";
import { SystemHealthCardSkeleton } from "@/components/skeletons/ComponentSkeletons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NetworkHealthMetrics {
  totalActiveUsers: number;
  pendingApprovals: number;
  conversationsToday: number;
  introductionsToday: number;
  avgConversationQuality: number;
  reportsDeliveredToday: number;
}

export const NetworkHealthDashboard = () => {
  const [metrics, setMetrics] = useState<NetworkHealthMetrics>({
    totalActiveUsers: 0,
    pendingApprovals: 0,
    conversationsToday: 0,
    introductionsToday: 0,
    avgConversationQuality: 0,
    reportsDeliveredToday: 0,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [networkData, healthData] = await Promise.all([
        adminAPIService.getNetworkMetrics(),
        adminAPIService.getSystemHealth(),
      ]);

      setMetrics(networkData);
      setSystemHealth(healthData);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      if (!silent) {
        toast.error("Failed to load network health data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchMetrics(true);
    toast.success("Dashboard refreshed");
  };

  const getStatusBadge = (status: "healthy" | "degraded" | "down") => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-terminal-green text-terminal-bg">
            ✓ Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-terminal-yellow text-terminal-bg">
            ⚠ Degraded
          </Badge>
        );
      case "down":
        return <Badge className="bg-red-400 text-terminal-bg">✗ Down</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SystemHealthCardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SystemHealthCardSkeleton />
          <SystemHealthCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Network Health Overview
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-terminal-green font-mono">
                {metrics.totalActiveUsers}
              </div>
              <div className="text-terminal-text-muted text-sm">
                Active Users
              </div>
              <Users className="w-6 h-6 text-terminal-green mx-auto mt-2" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-terminal-yellow font-mono">
                {metrics.pendingApprovals}
              </div>
              <div className="text-terminal-text-muted text-sm">
                Pending Approvals
              </div>
              <Clock className="w-6 h-6 text-terminal-yellow mx-auto mt-2" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-terminal-cyan font-mono">
                {metrics.conversationsToday}
              </div>
              <div className="text-terminal-text-muted text-sm">
                Conversations Today
              </div>
              <MessageSquare className="w-6 h-6 text-terminal-cyan mx-auto mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardHeader>
            <CardTitle className="text-terminal-green font-mono text-lg">
              Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">
                Introductions Requested
              </span>
              <Badge
                variant="outline"
                className="border-terminal-green text-terminal-green"
              >
                {metrics.introductionsToday}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">Reports Delivered</span>
              <Badge
                variant="outline"
                className="border-terminal-cyan text-terminal-cyan"
              >
                {metrics.reportsDeliveredToday}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">
                Avg Conversation Quality
              </span>
              <Badge
                variant="outline"
                className="border-terminal-yellow text-terminal-yellow"
              >
                {metrics.avgConversationQuality.toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-purple/30">
          <CardHeader>
            <CardTitle className="text-terminal-purple font-mono text-lg">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">Database</span>
              {systemHealth ? (
                <div className="flex items-center gap-2">
                  {getStatusBadge(systemHealth.database.status)}
                  {systemHealth.database.latency && (
                    <span className="text-xs text-terminal-text-muted">
                      {systemHealth.database.latency}ms
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="border-terminal-text-muted">
                  Loading...
                </Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">AI Service</span>
              {systemHealth ? (
                <div className="flex items-center gap-2">
                  {getStatusBadge(systemHealth.aiService.status)}
                  {systemHealth.aiService.latency && (
                    <span className="text-xs text-terminal-text-muted">
                      {systemHealth.aiService.latency}ms
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="border-terminal-text-muted">
                  Loading...
                </Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-terminal-text">Email Service</span>
              {systemHealth ? (
                <div className="flex items-center gap-2">
                  {getStatusBadge(systemHealth.emailService.status)}
                  {systemHealth.emailService.deliveryRate > 0 && (
                    <span className="text-xs text-terminal-text-muted">
                      {systemHealth.emailService.deliveryRate.toFixed(1)}%
                      delivery
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="border-terminal-text-muted">
                  Loading...
                </Badge>
              )}
            </div>
            {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-terminal-purple/20">
                <div className="flex items-center gap-1 text-terminal-yellow text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {systemHealth.alerts.length} active alert
                    {systemHealth.alerts.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
