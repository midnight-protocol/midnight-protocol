
  -- Create admin_activity_logs table for audit trail
  CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX idx_admin_activity_logs_admin_user_id ON admin_activity_logs(admin_user_id);
  CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
  CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
  CREATE INDEX idx_admin_activity_logs_target ON admin_activity_logs(target_type, target_id);

  -- Create admin_config table for admin-specific configuration
  CREATE TABLE IF NOT EXISTS admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, key)
  );

  -- Index for lookups
  CREATE INDEX idx_admin_config_category_key ON admin_config(category, key);

  -- Create admin_metrics_cache table for performance optimization
  CREATE TABLE IF NOT EXISTS admin_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key TEXT UNIQUE NOT NULL,
    metric_value JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    calculation_time_ms INTEGER
  );

  -- Index for cache lookups
  CREATE INDEX idx_admin_metrics_cache_key ON admin_metrics_cache(metric_key);
  CREATE INDEX idx_admin_metrics_cache_expires ON admin_metrics_cache(expires_at);

  -- Enable RLS on new tables (service role only access)
  ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
  ALTER TABLE admin_metrics_cache ENABLE ROW LEVEL SECURITY;

  -- Remove old RLS policies from system_config to make it service role only
  DROP POLICY IF EXISTS "System config read access" ON system_config;
  DROP POLICY IF EXISTS "Admins can update system config" ON system_config;
  DROP POLICY IF EXISTS "Admins can insert system config" ON system_config;
  DROP POLICY IF EXISTS "Admins can delete system config" ON system_config;

  -- Migrate existing alert thresholds from system_config to admin_config
  INSERT INTO admin_config (category, key, value, description)
  SELECT
    'alerts' as category,
    REPLACE(config_key, 'alert_threshold_', '') as key,
    to_jsonb(config_value::numeric) as value,
    description
  FROM system_config
  WHERE category = 'alerts'
  AND config_key LIKE 'alert_threshold_%'
  ON CONFLICT (category, key) DO NOTHING;

  -- Add default alert thresholds if they don't exist
  INSERT INTO admin_config (category, key, value, description)
  VALUES
    ('alerts', 'api_response_time', '1000'::jsonb, 'API response time threshold in milliseconds'),
    ('alerts', 'batch_completion_rate', '80'::jsonb, 'Batch completion rate threshold in 
  percentage'),
    ('alerts', 'active_users_ratio', '50'::jsonb, 'Active users ratio threshold in percentage'),
    ('alerts', 'conversation_success_rate', '70'::jsonb, 'Conversation success rate threshold in 
  percentage')
  ON CONFLICT (category, key) DO NOTHING;