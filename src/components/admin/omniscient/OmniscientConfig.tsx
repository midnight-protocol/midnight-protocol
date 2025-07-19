import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Brain,
  Zap,
  Shield,
  AlertTriangle,
  Save,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPIService } from "@/services/admin-api.service";
import { omniscientService } from "@/services/omniscient.service";

interface ConfigState {
  // Matching Configuration
  batchSize: number;
  minOpportunityScore: number;
  maxConversationsPerDay: number;
  enableIntelligentMatching: boolean;

  // AI Models
  analysisModel: string;
  conversationModel: string;
  summaryModel: string;

  // Processing
  enableAutoScheduling: boolean;
  scheduleBufferHours: number;
  maxConcurrentConversations: number;
  conversationTimeout: number;

  // Quality Thresholds
  minQualityScore: number;
  enableQualityFiltering: boolean;
  retryFailedConversations: boolean;
  maxRetries: number;

  // System
  enableRealTimeMonitoring: boolean;
  logLevel: string;
  enableDebugMode: boolean;
  rateLimitPerMinute: number;
}

interface ConfigItem {
  id: string;
  category: string;
  config_key: string;
  config_value: string;
  description: string;
}

interface ConfigMap {
  [key: string]: ConfigItem;
}

const defaultConfig: ConfigState = {
  batchSize: 50,
  minOpportunityScore: 0.7,
  maxConversationsPerDay: 3,
  enableIntelligentMatching: true,

  analysisModel: "google/gemini-2.5-flash",
  conversationModel: "anthropic/claude-3.5-sonnet",
  summaryModel: "google/gemini-2.5-flash",

  enableAutoScheduling: true,
  scheduleBufferHours: 2,
  maxConcurrentConversations: 5,
  conversationTimeout: 600,

  minQualityScore: 0.6,
  enableQualityFiltering: true,
  retryFailedConversations: true,
  maxRetries: 2,

  enableRealTimeMonitoring: true,
  logLevel: "info",
  enableDebugMode: false,
  rateLimitPerMinute: 60,
};

const OmniscientConfig = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConfigState>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configMap, setConfigMap] = useState<ConfigMap>({});

  // Fetch system configs
  const { data: systemConfigs, isLoading } = useQuery({
    queryKey: ["system-configs"],
    queryFn: () => adminAPIService.getSystemConfigs(),
  });

  // Map database configs to local state
  useEffect(() => {
    if (systemConfigs) {
      const newConfig = { ...defaultConfig };
      const newConfigMap: ConfigMap = {};

      // Flatten all configs and create a map
      Object.values(systemConfigs)
        .flat()
        .forEach((config: ConfigItem) => {
          newConfigMap[config.config_key] = config;
          // Ensure config_value is a string before processing
          const rawValue = String(config.config_value);
          const value = rawValue.replace(/^"|"$/g, ""); // Remove quotes if present

          switch (config.config_key) {
            case "omniscient_matching_batch_size":
              newConfig.batchSize = parseInt(value) || 200;
              break;
            case "omniscient_conversations_per_user_per_day":
              newConfig.maxConversationsPerDay = parseInt(value) || 3;
              break;
            case "omniscient_conversation_model":
              newConfig.conversationModel = value;
              break;
            case "omniscient_reporting_model":
              newConfig.summaryModel = value;
              break;
            // Omniscient-specific configs (may not exist yet)
            case "omniscient_analysis_model":
              newConfig.analysisModel = value;
              break;
            case "omniscient_min_opportunity_score":
              newConfig.minOpportunityScore = parseFloat(value) || 0.7;
              break;
            case "omniscient_enable_intelligent_matching":
              newConfig.enableIntelligentMatching = value === "true";
              break;
            case "omniscient_enable_auto_scheduling":
              newConfig.enableAutoScheduling = value === "true";
              break;
            case "omniscient_schedule_buffer_hours":
              newConfig.scheduleBufferHours = parseInt(value) || 2;
              break;
            case "omniscient_max_concurrent_conversations":
              newConfig.maxConcurrentConversations = parseInt(value) || 5;
              break;
            case "omniscient_conversation_timeout":
              newConfig.conversationTimeout = parseInt(value) || 600;
              break;
            case "omniscient_min_quality_score":
              newConfig.minQualityScore = parseFloat(value) || 0.6;
              break;
            case "omniscient_enable_quality_filtering":
              newConfig.enableQualityFiltering = value === "true";
              break;
            case "omniscient_retry_failed_conversations":
              newConfig.retryFailedConversations = value === "true";
              break;
            case "omniscient_max_retries":
              newConfig.maxRetries = parseInt(value) || 2;
              break;
            case "omniscient_enable_realtime_monitoring":
              newConfig.enableRealTimeMonitoring = value === "true";
              break;
            case "omniscient_log_level":
              newConfig.logLevel = value || "info";
              break;
            case "omniscient_enable_debug_mode":
              newConfig.enableDebugMode = value === "true";
              break;
            case "omniscient_rate_limit_per_minute":
              newConfig.rateLimitPerMinute = parseInt(value) || 60;
              break;
          }
        });

      setConfig(newConfig);
      setConfigMap(newConfigMap);
    }
  }, [systemConfigs]);

  const handleConfigChange = (key: keyof ConfigState, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Array<{ id: string; value: any }> = [];

      // Map config changes to database updates
      const configMappings = [
        { key: "omniscient_matching_batch_size", value: config.batchSize },
        {
          key: "omniscient_conversations_per_user_per_day",
          value: config.maxConversationsPerDay,
        },
        {
          key: "omniscient_conversation_model",
          value: config.conversationModel,
        },
        { key: "omniscient_reporting_model", value: config.summaryModel },
        { key: "omniscient_analysis_model", value: config.analysisModel },
        {
          key: "omniscient_min_opportunity_score",
          value: config.minOpportunityScore,
        },
        {
          key: "omniscient_enable_intelligent_matching",
          value: config.enableIntelligentMatching,
        },
        {
          key: "omniscient_enable_auto_scheduling",
          value: config.enableAutoScheduling,
        },
        {
          key: "omniscient_schedule_buffer_hours",
          value: config.scheduleBufferHours,
        },
        {
          key: "omniscient_max_concurrent_conversations",
          value: config.maxConcurrentConversations,
        },
        {
          key: "omniscient_conversation_timeout",
          value: config.conversationTimeout,
        },
        { key: "omniscient_min_quality_score", value: config.minQualityScore },
        {
          key: "omniscient_enable_quality_filtering",
          value: config.enableQualityFiltering,
        },
        {
          key: "omniscient_retry_failed_conversations",
          value: config.retryFailedConversations,
        },
        { key: "omniscient_max_retries", value: config.maxRetries },
        {
          key: "omniscient_enable_realtime_monitoring",
          value: config.enableRealTimeMonitoring,
        },
        { key: "omniscient_log_level", value: config.logLevel },
        { key: "omniscient_enable_debug_mode", value: config.enableDebugMode },
        {
          key: "omniscient_rate_limit_per_minute",
          value: config.rateLimitPerMinute,
        },
      ];

      for (const mapping of configMappings) {
        if (configMap[mapping.key]) {
          // Update existing config
          updates.push({
            id: configMap[mapping.key].id,
            value: mapping.value,
          });
        } else {
          // Create new config (would need a separate API call)
          console.log(`Config key ${mapping.key} not found in database`);
        }
      }

      // Save all updates
      for (const update of updates) {
        await adminAPIService.updateSystemConfig(update.id, update.value);
      }

      // Invalidate cache to reload configs
      await queryClient.invalidateQueries({ queryKey: ["system-configs"] });

      toast.success("Configuration saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error(
        `Failed to save configuration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setHasChanges(true);
    toast.info("Configuration reset to defaults");
  };

  const handleTest = async () => {
    try {
      toast.info("Testing omniscient configuration...");

      // Test the configuration by running a system health check
      const health = await omniscientService.getSystemHealth();

      if (health) {
        toast.success("Configuration test passed");
      } else {
        toast.error("Configuration test failed");
      }
    } catch (error) {
      toast.error(
        `Configuration test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            System Configuration
          </h2>
          <p className="text-gray-400">
            Configure omniscient system parameters and behavior
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <Button
            onClick={handleTest}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Test Config
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="matching" className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-gray-800 border-gray-700">
          <TabsTrigger
            value="matching"
            className="data-[state=active]:bg-purple-600"
          >
            Matching
          </TabsTrigger>
          <TabsTrigger
            value="models"
            className="data-[state=active]:bg-blue-600"
          >
            AI Models
          </TabsTrigger>
          <TabsTrigger
            value="processing"
            className="data-[state=active]:bg-green-600"
          >
            Processing
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="data-[state=active]:bg-yellow-600"
          >
            Quality
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-red-600"
          >
            System
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Matching Configuration */}
          <TabsContent value="matching">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Matching Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="batchSize" className="text-gray-300">
                      Batch Size
                    </Label>
                    <Input
                      id="batchSize"
                      type="number"
                      min="10"
                      max="200"
                      value={config.batchSize}
                      onChange={(e) =>
                        handleConfigChange(
                          "batchSize",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Number of matches to analyze per batch (10-200)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="minOpportunityScore"
                      className="text-gray-300"
                    >
                      Min Opportunity Score
                    </Label>
                    <Input
                      id="minOpportunityScore"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.minOpportunityScore}
                      onChange={(e) =>
                        handleConfigChange(
                          "minOpportunityScore",
                          parseFloat(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Minimum score to schedule conversations (0.0-1.0)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="maxConversationsPerDay"
                      className="text-gray-300"
                    >
                      Max Conversations/Day
                    </Label>
                    <Input
                      id="maxConversationsPerDay"
                      type="number"
                      min="1"
                      max="10"
                      value={config.maxConversationsPerDay}
                      onChange={(e) =>
                        handleConfigChange(
                          "maxConversationsPerDay",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Maximum conversations per user per day
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="enableIntelligentMatching"
                        className="text-gray-300"
                      >
                        Intelligent Matching
                      </Label>
                      <Switch
                        id="enableIntelligentMatching"
                        checked={config.enableIntelligentMatching}
                        onCheckedChange={(checked) =>
                          handleConfigChange(
                            "enableIntelligentMatching",
                            checked
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Use AI-powered matching vs random selection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Models Configuration */}
          <TabsContent value="models">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  AI Models Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="analysisModel" className="text-gray-300">
                      Analysis Model
                    </Label>
                    <Select
                      value={config.analysisModel}
                      onValueChange={(value) =>
                        handleConfigChange("analysisModel", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-2.5-flash">
                          Gemini 2.5 Flash
                        </SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">
                          Gemini 2.5 Pro
                        </SelectItem>
                        <SelectItem value="anthropic/claude-3.5-sonnet">
                          Claude 3.5 Sonnet
                        </SelectItem>
                        <SelectItem value="anthropic/claude-3.5-haiku">
                          Claude 3.5 Haiku
                        </SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4">
                          Claude Sonnet 4
                        </SelectItem>
                        <SelectItem value="anthropic/claude-opus-4">
                          Claude Opus 4
                        </SelectItem>
                        <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      Model used for match analysis and insight generation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="conversationModel"
                      className="text-gray-300"
                    >
                      Conversation Model
                    </Label>
                    <Select
                      value={config.conversationModel}
                      onValueChange={(value) =>
                        handleConfigChange("conversationModel", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic/claude-3.5-sonnet">
                          Claude 3.5 Sonnet
                        </SelectItem>
                        <SelectItem value="anthropic/claude-3.5-haiku">
                          Claude 3.5 Haiku
                        </SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4">
                          Claude Sonnet 4
                        </SelectItem>
                        <SelectItem value="anthropic/claude-opus-4">
                          Claude Opus 4
                        </SelectItem>
                        <SelectItem value="google/gemini-2.5-flash">
                          Gemini 2.5 Flash
                        </SelectItem>
                        <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="openai/gpt-4o-mini">
                          GPT-4o Mini
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      Model used for conversation execution
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="summaryModel" className="text-gray-300">
                      Summary Model
                    </Label>
                    <Select
                      value={config.summaryModel}
                      onValueChange={(value) =>
                        handleConfigChange("summaryModel", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-2.5-flash">
                          Gemini 2.5 Flash
                        </SelectItem>
                        <SelectItem value="anthropic/claude-3.5-haiku">
                          Claude 3.5 Haiku
                        </SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4">
                          Claude Sonnet 4
                        </SelectItem>
                        <SelectItem value="anthropic/claude-opus-4">
                          Claude Opus 4
                        </SelectItem>
                        <SelectItem value="openai/gpt-4o-mini">
                          GPT-4o Mini
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      Model used for conversation summaries and outcomes
                    </p>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-300 mb-1">
                        Model Selection Tips
                      </h4>
                      <ul className="text-sm text-blue-200 space-y-1">
                        <li>
                          • Use faster models (Flash, Haiku) for high-volume
                          operations
                        </li>
                        <li>
                          • Use premium models (Sonnet, GPT-4o) for critical
                          conversations
                        </li>
                        <li>
                          • Consider cost vs quality tradeoffs for your use case
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Configuration */}
          <TabsContent value="processing">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-green-400" />
                  Processing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="enableAutoScheduling"
                        className="text-gray-300"
                      >
                        Auto Scheduling
                      </Label>
                      <Switch
                        id="enableAutoScheduling"
                        checked={config.enableAutoScheduling}
                        onCheckedChange={(checked) =>
                          handleConfigChange("enableAutoScheduling", checked)
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Automatically schedule conversations at midnight
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="scheduleBufferHours"
                      className="text-gray-300"
                    >
                      Schedule Buffer (hours)
                    </Label>
                    <Input
                      id="scheduleBufferHours"
                      type="number"
                      min="0"
                      max="24"
                      value={config.scheduleBufferHours}
                      onChange={(e) =>
                        handleConfigChange(
                          "scheduleBufferHours",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Hours before midnight to schedule conversations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="maxConcurrentConversations"
                      className="text-gray-300"
                    >
                      Max Concurrent
                    </Label>
                    <Input
                      id="maxConcurrentConversations"
                      type="number"
                      min="1"
                      max="20"
                      value={config.maxConcurrentConversations}
                      onChange={(e) =>
                        handleConfigChange(
                          "maxConcurrentConversations",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Maximum concurrent conversation executions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="conversationTimeout"
                      className="text-gray-300"
                    >
                      Timeout (seconds)
                    </Label>
                    <Input
                      id="conversationTimeout"
                      type="number"
                      min="60"
                      max="1800"
                      value={config.conversationTimeout}
                      onChange={(e) =>
                        handleConfigChange(
                          "conversationTimeout",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Maximum time for conversation execution
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Configuration */}
          <TabsContent value="quality">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  Quality Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minQualityScore" className="text-gray-300">
                      Min Quality Score
                    </Label>
                    <Input
                      id="minQualityScore"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.minQualityScore}
                      onChange={(e) =>
                        handleConfigChange(
                          "minQualityScore",
                          parseFloat(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Minimum quality score for successful conversations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="enableQualityFiltering"
                        className="text-gray-300"
                      >
                        Quality Filtering
                      </Label>
                      <Switch
                        id="enableQualityFiltering"
                        checked={config.enableQualityFiltering}
                        onCheckedChange={(checked) =>
                          handleConfigChange("enableQualityFiltering", checked)
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Filter out low-quality conversations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="retryFailedConversations"
                        className="text-gray-300"
                      >
                        Retry Failed
                      </Label>
                      <Switch
                        id="retryFailedConversations"
                        checked={config.retryFailedConversations}
                        onCheckedChange={(checked) =>
                          handleConfigChange(
                            "retryFailedConversations",
                            checked
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Automatically retry failed conversations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxRetries" className="text-gray-300">
                      Max Retries
                    </Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="0"
                      max="5"
                      value={config.maxRetries}
                      onChange={(e) =>
                        handleConfigChange(
                          "maxRetries",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      Maximum retry attempts for failed conversations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Configuration */}
          <TabsContent value="system">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-400" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="enableRealTimeMonitoring"
                        className="text-gray-300"
                      >
                        Real-time Monitoring
                      </Label>
                      <Switch
                        id="enableRealTimeMonitoring"
                        checked={config.enableRealTimeMonitoring}
                        onCheckedChange={(checked) =>
                          handleConfigChange(
                            "enableRealTimeMonitoring",
                            checked
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Enable WebSocket monitoring and live updates
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logLevel" className="text-gray-300">
                      Log Level
                    </Label>
                    <Select
                      value={config.logLevel}
                      onValueChange={(value) =>
                        handleConfigChange("logLevel", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      System logging verbosity level
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="enableDebugMode"
                        className="text-gray-300"
                      >
                        Debug Mode
                      </Label>
                      <Switch
                        id="enableDebugMode"
                        checked={config.enableDebugMode}
                        onCheckedChange={(checked) =>
                          handleConfigChange("enableDebugMode", checked)
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Enable detailed debugging and extra logging
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="rateLimitPerMinute"
                      className="text-gray-300"
                    >
                      Rate Limit (/min)
                    </Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      min="10"
                      max="1000"
                      value={config.rateLimitPerMinute}
                      onChange={(e) =>
                        handleConfigChange(
                          "rateLimitPerMinute",
                          parseInt(e.target.value)
                        )
                      }
                      className="bg-gray-700 border-gray-600"
                    />
                    <p className="text-xs text-gray-400">
                      API requests per minute limit
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-600" />

                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-300 mb-1">
                        Production Warning
                      </h4>
                      <p className="text-sm text-red-200">
                        Debug mode and verbose logging can impact performance
                        and increase costs. Use with caution in production
                        environments.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Status Indicator */}
      {hasChanges && (
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  You have unsaved changes
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-yellow-400 border-yellow-400"
              >
                Modified
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OmniscientConfig;
