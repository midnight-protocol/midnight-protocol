ALTER TABLE public.system_config ADD CONSTRAINT unique_config_key UNIQUE (config_key);

-- Add alert threshold configurations
INSERT INTO system_config (config_key, config_value, category, description) VALUES
  ('alert_threshold_api_response_time', '500', 'alerts', 'Alert threshold for API response time in milliseconds'),
  ('alert_threshold_batch_completion_rate', '95', 'alerts', 'Alert threshold for batch completion rate percentage'),
  ('alert_threshold_email_delivery_rate', '90', 'alerts', 'Alert threshold for email delivery rate percentage'),
  ('alert_threshold_active_users_ratio', '50', 'alerts', 'Alert threshold for active users ratio percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Create system_alerts table to persist alerts across sessions
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
    message TEXT NOT NULL,
    metric TEXT,
    value NUMERIC,
    threshold NUMERIC,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts" ON public.system_alerts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can update alerts (to resolve them)
CREATE POLICY "Admins can update alerts" ON public.system_alerts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- System can insert alerts
CREATE POLICY "System can insert alerts" ON public.system_alerts
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved);
CREATE INDEX idx_system_alerts_created_at ON public.system_alerts(created_at DESC);

