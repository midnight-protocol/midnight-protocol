import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminAPIService } from "@/services/admin-api.service";

interface ConfigItem {
  id: string;
  category: string;
  config_key: string;
  config_value: any;
  description: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
}

// Separate component for text inputs to properly handle local state
const TextConfigInput = ({
  value,
  onUpdate,
  disabled,
}: {
  value: any;
  onUpdate: (newValue: string) => void;
  disabled: boolean;
}) => {
  const [localValue, setLocalValue] = useState(
    typeof value === "string" ? value : JSON.stringify(value)
  );

  useEffect(() => {
    setLocalValue(typeof value === "string" ? value : JSON.stringify(value));
  }, [value]);

  return (
    <Input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={(e) => onUpdate(e.target.value)}
      className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
      disabled={disabled}
    />
  );
};

export const SystemConfigPanel = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Clear cache on component mount to ensure fresh data
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const configData = await adminAPIService.getSystemConfigs();

      // Flatten the grouped configs back into an array
      const flatConfigs: ConfigItem[] = [];
      Object.entries(configData).forEach(([category, configs]) => {
        (configs as any[]).forEach((config) => {
          flatConfigs.push(config);
        });
      });

      setConfigs(flatConfigs);
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configId: string, newValue: any) => {
    setSaving(configId);
    try {
      // Find the config to check if it's an AI model config
      const config = configs.find((c) => c.id === configId);
      let valueToSave = newValue;

      // For AI model configs, save as JSON string to match database format
      if (config && config.config_key.startsWith("ai_model_")) {
        valueToSave = JSON.stringify(newValue);
      }

      await adminAPIService.updateSystemConfig(configId, valueToSave);

      // Clear cache and update local state
      setConfigs((prev) =>
        prev.map((config) =>
          config.id === configId
            ? { ...config, config_value: valueToSave }
            : config
        )
      );

      toast.success("Configuration updated successfully");
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Failed to update configuration");
      // Revert local state on error
      fetchConfigs();
    } finally {
      setSaving(null);
    }
  };

  const parseConfigValue = (config: ConfigItem) => {
    const value = config.config_value;

    // If it's a string that looks like JSON, try to parse it
    if (
      typeof value === "string" &&
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  };

  const getModelConfigByKey = (key: string) => {
    return configs.find((config) => config.config_key === key);
  };

  const renderOtherConfigInput = (config: ConfigItem) => {
    const value = parseConfigValue(config);
    const isSaving = saving === config.id;

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value}
            onCheckedChange={(checked) => updateConfig(config.id, checked)}
            disabled={isSaving}
          />
          <Label className="text-terminal-text">
            {value ? "Enabled" : "Disabled"}
          </Label>
          {isSaving && (
            <Loader2 className="w-4 h-4 animate-spin text-terminal-green" />
          )}
        </div>
      );
    }

    if (typeof value === "number") {
      return (
        <div className="space-y-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => updateConfig(config.id, parseInt(e.target.value))}
            className="bg-terminal-bg/20 border-terminal-green/30 text-terminal-text"
            disabled={isSaving}
          />
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-terminal-green">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <TextConfigInput
          value={value}
          onUpdate={(newValue) => updateConfig(config.id, newValue)}
          disabled={isSaving}
        />
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-terminal-green">
            <Loader2 className="w-4 h-4 animate-spin" />
            Updating...
          </div>
        )}
      </div>
    );
  };

  // Group non-AI model configs
  const nonModelConfigs = configs.filter(
    (config) => !config.config_key.includes("ai_model_")
  );

  const groupedConfigs = nonModelConfigs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, ConfigItem[]>);

  if (loading) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6">
          <div className="text-terminal-green font-mono animate-pulse text-center">
            LOADING CONFIGURATION...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Configuration
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                fetchConfigs();
              }}
              variant="outline"
              size="sm"
              className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Other Configuration Sections */}
        {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-terminal-green font-mono text-lg capitalize border-b border-terminal-green/30 pb-1">
              {category}
            </h3>
            <div className="grid gap-4">
              {categoryConfigs.map((config) => (
                <div
                  key={config.id}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 bg-terminal-bg/20 rounded border border-terminal-green/20"
                >
                  <div>
                    <div className="text-terminal-text font-mono text-sm">
                      {config.config_key}
                    </div>
                    <div className="text-terminal-text-muted text-xs">
                      {config.description}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    {renderOtherConfigInput(config)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-terminal-text-muted mx-auto mb-4" />
            <div className="text-terminal-text-muted">
              No configuration items found
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
