-- Fix alert threshold values to be stored as JSONB numbers instead of strings
UPDATE system_config 
SET config_value = 
  CASE config_key
    WHEN 'alert_threshold_api_response_time' THEN to_jsonb(500)
    WHEN 'alert_threshold_batch_completion_rate' THEN to_jsonb(95)
    WHEN 'alert_threshold_email_delivery_rate' THEN to_jsonb(90)
    WHEN 'alert_threshold_active_users_ratio' THEN to_jsonb(50)
  END
WHERE category = 'alerts' 
AND config_key IN (
  'alert_threshold_api_response_time',
  'alert_threshold_batch_completion_rate', 
  'alert_threshold_email_delivery_rate',
  'alert_threshold_active_users_ratio'
);