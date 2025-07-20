import { supabase } from "../integrations/supabase/client";

interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateConfiguration(): Promise<ConfigValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if we can connect to Supabase
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("config_key, config_value")
      .limit(1);

    if (error) {
      console.error("[ConfigValidator] Database connection error:", error);
      errors.push(`Database connection failed: ${error.message}`);
    }
  } catch (e) {
    console.error("[ConfigValidator] Supabase connection exception:", e);
    errors.push(
      `Failed to connect to Supabase: ${
        e instanceof Error ? e.message : "Unknown error"
      }`
    );
  }

  // Check system configuration
  try {
    const { data: configs } = await supabase
      .from("system_config")
      .select("config_key, config_value");

    const requiredConfigs = [];

    requiredConfigs.forEach((key) => {
      const config = configs?.find((c) => c.config_key === key);
      if (!config) {
        warnings.push(`Missing system config: ${key}`);
      } else if (!config.config_value) {
        warnings.push(`Empty system config: ${key}`);
      }
    });
  } catch (e) {
    warnings.push("Could not validate system configuration");
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  console.log("[ConfigValidator] Validation complete:", result);
  return result;
}
