import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { adminAPIService } from "@/services/admin-api.service";
import type {
  HealthMetric,
  SystemAlert,
  AlertThresholds,
} from "@/services/admin-api.service";

export const SystemHealthAlerts = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    api_response_time: 500,
    batch_completion_rate: 95,
    email_delivery_rate: 90,
    active_users_ratio: 50,
  });
  const [editingThresholds, setEditingThresholds] =
    useState<AlertThresholds | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [metricsData, systemHealthData, thresholdsData] = await Promise.all(
        [
          adminAPIService.getHealthMetrics(),
          adminAPIService.getSystemHealth(),
          adminAPIService.getAlertThresholds(),
        ]
      );

      console.log("metricsData", metricsData);
      console.log("systemHealthData", systemHealthData);
      console.log("thresholdsData", thresholdsData);

      setMetrics(metricsData);
      setAlerts(systemHealthData.alerts);
      setThresholds(thresholdsData);
    } catch (error) {
      console.error("Failed to fetch health data:", error);
      if (!silent) {
        toast.error("Failed to load health alerts");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchHealthData(true);
    toast.success("Health data refreshed");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-terminal-green" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-terminal-yellow" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-terminal-text-muted" />;
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await adminAPIService.resolveAlert(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      toast.success("Alert resolved");
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      toast.error("Failed to resolve alert");
    }
  };

  const saveThresholds = async () => {
    if (!editingThresholds) return;

    try {
      // Update each threshold
      await Promise.all([
        adminAPIService.updateAlertThreshold(
          "api_response_time",
          editingThresholds.api_response_time
        ),
        adminAPIService.updateAlertThreshold(
          "batch_completion_rate",
          editingThresholds.batch_completion_rate
        ),
        adminAPIService.updateAlertThreshold(
          "email_delivery_rate",
          editingThresholds.email_delivery_rate
        ),
        adminAPIService.updateAlertThreshold(
          "active_users_ratio",
          editingThresholds.active_users_ratio
        ),
      ]);

      setThresholds(editingThresholds);
      setEditingThresholds(null);
      toast.success("Alert thresholds updated");

      // Refresh data to get new alerts based on updated thresholds
      fetchHealthData(true);
    } catch (error) {
      console.error("Failed to save thresholds:", error);
      toast.error("Failed to save thresholds");
    }
  };

  const activeAlerts = alerts.filter((alert) => !alert.resolved);
  const criticalMetrics = metrics.filter(
    (metric) => metric.status === "critical"
  );
  const warningMetrics = metrics.filter(
    (metric) => metric.status === "warning"
  );

  if (loading) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6">
          <div className="text-terminal-green font-mono animate-pulse text-center">
            LOADING SYSTEM HEALTH...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Summary */}
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              System Health Alerts
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (!showSettings) {
                    setEditingThresholds({ ...thresholds });
                  }
                }}
                className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-green font-mono">
                {metrics.filter((m) => m.status === "healthy").length}
              </div>
              <div className="text-terminal-text-muted text-sm">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-yellow font-mono">
                {warningMetrics.length}
              </div>
              <div className="text-terminal-text-muted text-sm">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 font-mono">
                {criticalMetrics.length}
              </div>
              <div className="text-terminal-text-muted text-sm">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-cyan font-mono">
                {activeAlerts.length}
              </div>
              <div className="text-terminal-text-muted text-sm">
                Active Alerts
              </div>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="space-y-2">
            <h4 className="text-terminal-green font-mono text-sm">
              Health Metrics
            </h4>
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-terminal-bg/20 rounded"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="text-terminal-text">{metric.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-terminal-text font-mono">
                    {Math.round(metric.value)}
                    {metric.unit}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      metric.status === "healthy"
                        ? "border-terminal-green text-terminal-green"
                        : metric.status === "warning"
                        ? "border-terminal-yellow text-terminal-yellow"
                        : "border-red-400 text-red-400"
                    }
                  >
                    {metric.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="bg-terminal-bg/30 border-terminal-yellow/30">
          <CardHeader>
            <CardTitle className="text-terminal-yellow font-mono">
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-terminal-bg/20 rounded"
                >
                  <div className="flex items-center gap-3">
                    {alert.type === "error" && (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    {alert.type === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-terminal-yellow" />
                    )}
                    {alert.type === "info" && (
                      <CheckCircle className="h-4 w-4 text-terminal-cyan" />
                    )}
                    <div>
                      <div className="text-terminal-text">{alert.message}</div>
                      <div className="text-terminal-text-muted text-xs">
                        {new Date(alert.timestamp).toLocaleString()}
                        {alert.metric && (
                          <span className="ml-2">
                            ({alert.value?.toFixed(1)} / {alert.threshold})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAlert(alert.id)}
                    className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      {showSettings && editingThresholds && (
        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-terminal-green font-mono">
                Alert Configuration
              </CardTitle>
              <Button
                size="sm"
                onClick={saveThresholds}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-terminal-text-muted text-sm">
                Configure alert thresholds. Changes will take effect after
                saving.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-terminal-green font-mono">
                    API Response Time (ms)
                  </Label>
                  <Input
                    type="number"
                    value={editingThresholds.api_response_time}
                    onChange={(e) =>
                      setEditingThresholds({
                        ...editingThresholds,
                        api_response_time: Number(e.target.value),
                      })
                    }
                    className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
                  />
                  <div className="text-xs text-terminal-text-muted">
                    Alert when response time exceeds this value
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-terminal-green font-mono">
                    Batch Completion Rate (%)
                  </Label>
                  <Input
                    type="number"
                    value={editingThresholds.batch_completion_rate}
                    onChange={(e) =>
                      setEditingThresholds({
                        ...editingThresholds,
                        batch_completion_rate: Number(e.target.value),
                      })
                    }
                    className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
                  />
                  <div className="text-xs text-terminal-text-muted">
                    Alert when completion rate falls below this value
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-terminal-green font-mono">
                    Email Delivery Rate (%)
                  </Label>
                  <Input
                    type="number"
                    value={editingThresholds.email_delivery_rate}
                    onChange={(e) =>
                      setEditingThresholds({
                        ...editingThresholds,
                        email_delivery_rate: Number(e.target.value),
                      })
                    }
                    className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
                  />
                  <div className="text-xs text-terminal-text-muted">
                    Alert when delivery rate falls below this value
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-terminal-green font-mono">
                    Active Users Ratio (%)
                  </Label>
                  <Input
                    type="number"
                    value={editingThresholds.active_users_ratio}
                    onChange={(e) =>
                      setEditingThresholds({
                        ...editingThresholds,
                        active_users_ratio: Number(e.target.value),
                      })
                    }
                    className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
                  />
                  <div className="text-xs text-terminal-text-muted">
                    Alert when active user ratio falls below this value
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
