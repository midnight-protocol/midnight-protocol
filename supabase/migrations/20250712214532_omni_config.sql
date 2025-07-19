
  -- Insert omniscient-specific configuration values
  INSERT INTO system_config (id, category, config_key, config_value, description) VALUES
    -- Analysis Configuration
    (gen_random_uuid(), 'omniscient', 'omniscient_analysis_model', '"google/gemini-2.5-flash"', 'AI model used for match analysis and insight generation'),
    (gen_random_uuid(), 'omniscient', 'omniscient_min_opportunity_score', '0.7', 'Minimum opportunity score to schedule conversations (0.0-1.0)'),
    (gen_random_uuid(), 'omniscient', 'omniscient_enable_intelligent_matching', 'true', 'Use AI-powered matching vs random selection'),

    -- Processing Configuration
    (gen_random_uuid(), 'omniscient', 'omniscient_enable_auto_scheduling', 'true', 'Automatically schedule conversations at midnight'),
    (gen_random_uuid(), 'omniscient', 'omniscient_schedule_buffer_hours', '2', 'Hours before midnight to schedule conversations'),
    (gen_random_uuid(), 'omniscient', 'omniscient_max_concurrent_conversations', '5', 'Maximum concurrent conversation executions'),
    (gen_random_uuid(), 'omniscient', 'omniscient_conversation_timeout', '600', 'Maximum time for conversation execution in seconds'),

    -- Quality Configuration
    (gen_random_uuid(), 'omniscient', 'omniscient_min_quality_score', '0.6', 'Minimum quality score for successful conversations (0.0-1.0)'),
    (gen_random_uuid(), 'omniscient', 'omniscient_enable_quality_filtering', 'true', 'Filter out low-quality conversations'),
    (gen_random_uuid(), 'omniscient', 'omniscient_retry_failed_conversations', 'true', 'Automatically retry failed conversations'),
    (gen_random_uuid(), 'omniscient', 'omniscient_max_retries', '2', 'Maximum retry attempts for failed conversations'),

    -- System Configuration
    (gen_random_uuid(), 'omniscient', 'omniscient_enable_realtime_monitoring', 'true', 'Enable WebSocket monitoring and live updates'),
    (gen_random_uuid(), 'omniscient', 'omniscient_log_level', '"info"', 'System logging verbosity level (error, warn, info, debug)'),
    (gen_random_uuid(), 'omniscient', 'omniscient_enable_debug_mode', 'false', 'Enable detailed debugging and extra logging'),
    (gen_random_uuid(), 'omniscient', 'omniscient_rate_limit_per_minute', '60', 'API requests per minute limit'),
    (gen_random_uuid(), 'omniscient', 'omniscient_matching_schedule', '"daily"', 'Schedule for running omniscient matching (daily, hourly, manual)')
  ON CONFLICT (category, config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = now();