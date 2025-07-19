import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Cache for system configuration values to avoid repeated database queries
 */
const configCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a system configuration value by key
 * @param key The configuration key to retrieve
 * @param supabase The Supabase client instance
 * @param defaultValue Optional default value if config not found
 * @returns The configuration value as a string
 */
export async function getSystemConfig(
  key: string,
  supabase: SupabaseClient,
  defaultValue?: string
): Promise<string> {
  // Check cache first
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    // Fetch from database
    const { data, error } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", key)
      .single();

    if (error) {
      console.error(`Failed to fetch config ${key}:`, error);
      if (defaultValue) return defaultValue;
      throw new Error(`System config not found: ${key}`);
    }

    // Parse the value (remove quotes if present)
    let value = data.config_value;
    if (
      typeof value === "string" &&
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      value = value.slice(1, -1);
    }

    // Update cache
    configCache.set(key, { value, timestamp: Date.now() });

    return value;
  } catch (error) {
    console.error(`Error fetching system config ${key}:`, error);
    if (defaultValue) return defaultValue;
    throw error;
  }
}

/**
 * Get multiple system configuration values at once
 * @param keys Array of configuration keys to retrieve
 * @param supabase The Supabase client instance
 * @returns Object mapping keys to values
 */
export async function getSystemConfigs(
  keys: string[],
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  // Check cache for all keys
  const result: Record<string, string> = {};
  const missingKeys: string[] = [];

  for (const key of keys) {
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      result[key] = cached.value;
    } else {
      missingKeys.push(key);
    }
  }

  // Fetch missing keys from database
  if (missingKeys.length > 0) {
    const { data, error } = await supabase
      .from("system_config")
      .select("config_key, config_value")
      .in("config_key", missingKeys);

    if (!error && data) {
      for (const config of data) {
        let value = config.config_value;
        // Parse the value (remove quotes if present)
        if (
          typeof value === "string" &&
          value.startsWith('"') &&
          value.endsWith('"')
        ) {
          value = value.slice(1, -1);
        }

        result[config.config_key] = value;
        // Update cache
        configCache.set(config.config_key, { value, timestamp: Date.now() });
      }
    }
  }

  return result;
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
}
