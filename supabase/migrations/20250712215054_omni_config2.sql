
  -- Insert omniscient-specific configuration values
  INSERT INTO system_config (id, category, config_key, config_value, description) VALUES
    -- Analysis Configuration
    (gen_random_uuid(), 'omniscient', 'omniscient_matching_batch_size', '50', 'Batch size for matching'),
    (gen_random_uuid(), 'omniscient', 'omniscient_conversations_per_user_per_day', '3', 'Maximum conversations per user per day'),
    (gen_random_uuid(), 'omniscient', 'omniscient_conversation_model', '"anthropic/claude-3.5-sonnet"', 'AI model used for conversation'),
    (gen_random_uuid(), 'omniscient', 'omniscient_reporting_model', '"google/gemini-2.5-flash"', 'AI model used for reporting')
  ON CONFLICT (category, config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = now();