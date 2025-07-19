

  -- Add new columns to prompt_templates table
  ALTER TABLE public.prompt_templates
  ADD COLUMN is_json_response boolean DEFAULT false,
  ADD COLUMN json_schema jsonb,
  ADD COLUMN llm_model text;

  -- Remove the CHECK constraint on prompt_type to allow more flexibility
  ALTER TABLE public.prompt_templates
  DROP CONSTRAINT IF EXISTS prompt_templates_prompt_type_check;

  -- Update existing prompts with appropriate default models
  UPDATE public.prompt_templates
  SET llm_model = CASE
      -- Use Gemini for JSON-based analysis prompts
      WHEN name IN (
          'omniscient_opportunity_analysis',
          'omniscient_opportunity_analysis_v2',
          'conversation_summary_analysis',
          'outcome_analysis_detailed',
          'onboarding_story_extraction'
      ) THEN 'google/gemini-2.0-flash-exp:free'
      -- Use Claude for conversational prompts
      ELSE 'anthropic/claude-3-5-sonnet-20241022'
  END
  WHERE llm_model IS NULL;

  -- Set is_json_response and json_schema for prompts that return JSON
  UPDATE public.prompt_templates
  SET is_json_response = true,
      json_schema = '{
          "type": "object",
          "properties": {
              "opportunityScore": {"type": "number"},
              "outcome": {
                  "type": "string",
                  "enum": ["STRONG_MATCH", "EXPLORATORY", "FUTURE_POTENTIAL", "NO_MATCH"]
              },
              "primaryOpportunities": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "title": {"type": "string"},
                          "description": {"type": "string"},
                          "valueProposition": {"type": "string"},
                          "feasibility": {"type": "number"},
                          "timeline": {"type": "string"}
                      },
                      "required": ["title", "description", "valueProposition", "feasibility", "timeline"]
                  }
              },
              "synergies": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "type": {"type": "string"},
                          "description": {"type": "string"},
                          "potential": {"type": "string"}
                      },
                      "required": ["type", "description", "potential"]
                  }
              },
              "nextSteps": {"type": "array", "items": {"type": "string"}},
              "riskFactors": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "risk": {"type": "string"},
                          "mitigation": {"type": "string"}
                      },
                      "required": ["risk", "mitigation"]
                  }
              },
              "hiddenAssets": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "asset": {"type": "string"},
                          "application": {"type": "string"}
                      },
                      "required": ["asset", "application"]
                  }
              },
              "networkEffects": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "connection": {"type": "string"},
                          "value": {"type": "string"}
                      },
                      "required": ["connection", "value"]
                  }
              },
              "reasoning": {"type": "string"}
          },
          "required": ["opportunityScore", "outcome", "primaryOpportunities", "synergies", "nextSteps", "riskFactors", "hiddenAssets", "networkEffects", "reasoning"]
      }'::jsonb
  WHERE name IN ('omniscient_opportunity_analysis', 'omniscient_opportunity_analysis_v2');

  -- Set JSON schema for onboarding story extraction
  UPDATE public.prompt_templates
  SET is_json_response = true,
      json_schema = '{
          "type": "object",
          "properties": {
              "narrative": {"type": "string"},
              "current_focus": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "seeking_connections": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "offering_expertise": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "key_themes": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "collaboration_style": {"type": "string"},
              "success_metrics": {
                  "type": "array",
                  "items": {"type": "string"}
              }
          },
          "required": ["narrative", "current_focus", "seeking_connections", "offering_expertise", "key_themes", "collaboration_style", "success_metrics"]
      }'::jsonb
  WHERE name = 'onboarding_story_extraction';

  -- Set JSON schema for conversation summary
  UPDATE public.prompt_templates
  SET is_json_response = true,
      json_schema = '{
          "type": "object",
          "properties": {
              "summary": {"type": "string"},
              "mainTopics": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "keyInsights": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "collaborationPotential": {"type": "string"},
              "nextSteps": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "overallTone": {"type": "string"}
          },
          "required": ["summary", "mainTopics", "keyInsights", "collaborationPotential", "nextSteps", "overallTone"]
      }'::jsonb
  WHERE name = 'conversation_summary_analysis';

  -- Set JSON schema for outcome analysis
  UPDATE public.prompt_templates
  SET is_json_response = true,
      json_schema = '{
          "type": "object",
          "properties": {
              "accuracyAssessment": {"type": "string"},
              "actualOutcome": {"type": "string"},
              "keyDifferences": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "unexpectedDiscoveries": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "learningPoints": {
                  "type": "array",
                  "items": {"type": "string"}
              },
              "modelImprovementSuggestions": {
                  "type": "array",
                  "items": {"type": "string"}
              }
          },
          "required": ["accuracyAssessment", "actualOutcome", "keyDifferences", "unexpectedDiscoveries", "learningPoints", "modelImprovementSuggestions"]
      }'::jsonb
  WHERE name = 'outcome_analysis_detailed';

  -- Add comment to document the new columns
  COMMENT ON COLUMN public.prompt_templates.is_json_response IS 'Whether this prompt expects a JSON response';
  COMMENT ON COLUMN public.prompt_templates.json_schema IS 'JSON Schema for validating the response when is_json_response is true';
  COMMENT ON COLUMN public.prompt_templates.llm_model IS 'The LLM model to use for this specific prompt';
