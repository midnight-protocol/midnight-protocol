-- Migration: Deprecate prompt_type and is_active fields
-- Replace with version-based system using prompt_template_versions

-- Step 1: Add new fields to prompt_template_versions
ALTER TABLE prompt_template_versions 
ADD COLUMN is_current BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN is_json_response BOOLEAN DEFAULT FALSE,
ADD COLUMN json_schema JSONB,
ADD COLUMN llm_model TEXT;

-- Step 2: Migrate data - mark the latest version of each active template as current
-- First, insert missing version records for active templates that don't have versions
WITH active_templates AS (
  SELECT id, name, version, template_text, variables, is_json_response, json_schema, llm_model
  FROM prompt_templates 
  WHERE is_active = TRUE
),
templates_to_create AS (
  -- Find active templates that don't have corresponding versions
  SELECT at.*
  FROM active_templates at
  LEFT JOIN prompt_template_versions ptv ON at.id = ptv.prompt_template_id
  WHERE ptv.id IS NULL
)
INSERT INTO prompt_template_versions (
  prompt_template_id, 
  version, 
  template_text, 
  variables, 
  change_notes, 
  created_by, 
  created_at,
  is_current,
  is_json_response,
  json_schema,
  llm_model
)
SELECT 
  tc.id,
  tc.version,
  tc.template_text,
  tc.variables,
  'Migrated from active template',
  NULL,
  NOW(),
  TRUE,
  tc.is_json_response,
  tc.json_schema,
  tc.llm_model
FROM templates_to_create tc;

-- Now mark existing latest versions as current and update fields for templates that already have versions
WITH active_templates AS (
  SELECT id, name, version, template_text, variables, is_json_response, json_schema, llm_model
  FROM prompt_templates 
  WHERE is_active = TRUE
),
latest_versions AS (
  SELECT 
    pt.id as template_id,
    MAX(ptv.version) as max_version
  FROM active_templates pt
  LEFT JOIN prompt_template_versions ptv ON pt.id = ptv.prompt_template_id
  GROUP BY pt.id
)
UPDATE prompt_template_versions 
SET 
  is_current = TRUE,
  is_json_response = at.is_json_response,
  json_schema = at.json_schema,
  llm_model = at.llm_model
FROM active_templates at
JOIN latest_versions lv ON at.id = lv.template_id
WHERE prompt_template_versions.prompt_template_id = lv.template_id 
  AND prompt_template_versions.version = lv.max_version
  AND lv.max_version IS NOT NULL;

-- Step 3: Add unique constraint to ensure only one current version per template
CREATE UNIQUE INDEX idx_unique_current_version 
ON prompt_template_versions (prompt_template_id) 
WHERE is_current = TRUE;

-- Step 4: Add unique constraint on template names (replacing prompt_type uniqueness)
-- First, handle any duplicate names by appending a suffix
WITH duplicate_names AS (
  SELECT name, COUNT(*) as count
  FROM prompt_templates
  GROUP BY name
  HAVING COUNT(*) > 1
),
numbered_duplicates AS (
  SELECT 
    pt.id,
    pt.name,
    ROW_NUMBER() OVER (PARTITION BY pt.name ORDER BY pt.created_at) as rn
  FROM prompt_templates pt
  JOIN duplicate_names dn ON pt.name = dn.name
)
UPDATE prompt_templates 
SET name = prompt_templates.name || '_' || (nd.rn - 1)
FROM numbered_duplicates nd
WHERE prompt_templates.id = nd.id AND nd.rn > 1;

-- Now add the unique constraint on name
ALTER TABLE prompt_templates 
ADD CONSTRAINT prompt_templates_name_unique UNIQUE (name);

-- Step 5: Drop the old constraints and indexes
DROP INDEX IF EXISTS idx_unique_active_prompt_type;
DROP INDEX IF EXISTS idx_prompt_templates_prompt_type;
DROP INDEX IF EXISTS idx_prompt_templates_is_active;

-- Drop the prompt_type check constraint
ALTER TABLE prompt_templates 
DROP CONSTRAINT IF EXISTS prompt_templates_prompt_type_check;

-- Step 6: Remove the deprecated columns
ALTER TABLE prompt_templates 
DROP COLUMN IF EXISTS prompt_type,
DROP COLUMN IF EXISTS is_active;

-- Step 7: Update the main templates table to remove fields that now live in versions
-- We keep: id, name, description, created_by, created_at, updated_at, metadata
-- Remove: template_text, variables, version, is_json_response, json_schema, llm_model
-- (These now only exist in prompt_template_versions)

-- Create a backup of the current data first (optional, but safe)
CREATE TABLE IF NOT EXISTS prompt_templates_backup AS 
SELECT * FROM prompt_templates;

-- Remove the fields that are now only in versions
ALTER TABLE prompt_templates 
DROP COLUMN IF EXISTS template_text,
DROP COLUMN IF EXISTS variables,
DROP COLUMN IF EXISTS version,
DROP COLUMN IF EXISTS is_json_response,
DROP COLUMN IF EXISTS json_schema,
DROP COLUMN IF EXISTS llm_model;

-- Step 8: Add helpful comments and cleanup
COMMENT ON TABLE prompt_templates IS 'Template metadata only. Active template content is in prompt_template_versions with is_current = true';
COMMENT ON COLUMN prompt_template_versions.is_current IS 'Only one version per template can be current. Used to determine active template content.';

-- Step 9: Drop backup table (optional - remove if you want to keep it)
DROP TABLE IF EXISTS prompt_templates_backup;