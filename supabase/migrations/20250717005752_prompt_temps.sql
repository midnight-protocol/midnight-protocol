
  -- Add default_temperature column to prompt_template_versions table
  ALTER TABLE prompt_template_versions
  ADD COLUMN default_temperature numeric(3,2) DEFAULT 0.2;

  -- Update all existing records to have temperature of 0.2
  UPDATE prompt_template_versions
  SET default_temperature = 0.2
  WHERE default_temperature IS NULL;

  -- Make the column NOT NULL since we have defaults
  ALTER TABLE prompt_template_versions
  ALTER COLUMN default_temperature SET NOT NULL;

  -- Add check constraint to ensure temperature is within valid range
  ALTER TABLE prompt_template_versions
  ADD CONSTRAINT check_temperature_range
  CHECK (default_temperature >= 0.0 AND default_temperature <= 2.0);

  -- Add comment for documentation
  COMMENT ON COLUMN prompt_template_versions.default_temperature IS 'Default temperature for LLM
   requests (0.0-2.0, default 0.2)';
