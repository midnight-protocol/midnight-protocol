-- Fix the alert threshold values to be proper JSONB numbers instead of strings
UPDATE system_config 
SET config_value = to_jsonb(config_value::text::numeric)
WHERE category = 'alerts' 
AND config_key IN (
  'alert_threshold_api_response_time',
  'alert_threshold_batch_completion_rate', 
  'alert_threshold_email_delivery_rate',
  'alert_threshold_active_users_ratio'
)
AND jsonb_typeof(config_value) = 'string';