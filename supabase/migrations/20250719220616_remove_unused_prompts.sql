-- This migration removes the deprecated prompt templates that are no longer used

-- First, delete all prompt template versions for this template
DELETE FROM prompt_template_versions 
WHERE prompt_template_id IN (
  SELECT id FROM prompt_templates 
  WHERE name = 'onboarding_story_extraction'
);

-- Then delete the prompt template itself
DELETE FROM prompt_templates 
WHERE name = 'onboarding_story_extraction';

-- story_summary_generator
DELETE FROM prompt_template_versions 
WHERE prompt_template_id IN (
  SELECT id FROM prompt_templates 
  WHERE name = 'story_summary_generator'
);

-- Then delete the prompt template itself
DELETE FROM prompt_templates 
WHERE name = 'story_summary_generator';

-- outcome_analysis_detailed
DELETE FROM prompt_template_versions 
WHERE prompt_template_id IN (
  SELECT id FROM prompt_templates 
  WHERE name = 'outcome_analysis_detailed'
);

-- Then delete the prompt template itself
DELETE FROM prompt_templates 
WHERE name = 'outcome_analysis_detailed';


-- delete deprecated system config keys
DELETE FROM system_config 
WHERE config_key IN (
  'ai_model_onboarding',
  'ai_model_conversation',
  'ai_model_reporting',
  'omniscient_analysis_model',
  'omniscient_conversation_model',
  'omniscient_reporting_model',
  'omniscient_enable_quality_filtering',
  'omniscient_max_concurrent_conversations',
  'omniscient_enable_debug_mode',
  'daily_introductions',
  'omniscient_enable_auto_scheduling',
  'conversations_per_user_per_day',
  'omniscient_matching_batch_size',
  'omniscient_enable_realtime_monitoring',
  'omniscient_retry_failed_conversations',
  'alert_threshold_api_response_time',
  'omniscient_matching_schedule',
  'matching_batch_size',
  'omniscient_max_retries',
  'omniscient_conversations_per_user_per_day',
  'omniscient_min_opportunity_score',
  'omniscient_schedule_buffer_hours',
  'omniscient_min_quality_score',
  'omniscient_conversation_model',
  'batch_enabled',
  'alert_threshold_active_users_ratio',
  'omniscient_rate_limit_per_minute',
  'omniscient_enable_intelligent_matching',
  'alert_threshold_batch_completion_rate',
  'omniscient_conversation_timeout',
  'alert_threshold_email_delivery_rate',
  'omniscient_log_level'
);