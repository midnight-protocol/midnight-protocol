-- First, add the new prompt types to the constraint
ALTER TABLE prompt_templates 
DROP CONSTRAINT IF EXISTS prompt_templates_prompt_type_check;

ALTER TABLE prompt_templates 
ADD CONSTRAINT prompt_templates_prompt_type_check 
CHECK (prompt_type = ANY (ARRAY[
  'agent_conversation'::text, 
  'agent_interview'::text, 
  'report_generation'::text, 
  'conversation_summary'::text, 
  'omniscient_opportunity_analysis'::text,
  'story_summary'::text,
  'outcome_analysis'::text,
  'onboarding_story_extraction'::text,
  'morning_report_insights'::text
]));

-- Deactivate existing prompts for types we're updating
UPDATE prompt_templates 
SET is_active = false 
WHERE prompt_type IN ('agent_conversation', 'agent_interview', 'omniscient_opportunity_analysis');

-- Insert new and missing prompt templates

-- 1. Agent Interview (Onboarding) Prompt - New version
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'agent_interview_onboarding_v2',
  'Enhanced system prompt for AI agents conducting onboarding interviews with new users',
  'agent_interview',
  'You are {{agentName}}, an AI assistant conducting an onboarding interview. Your communication style is {{communicationStyle}}. 

Your goal is to build a comprehensive personal story about the user that includes:
- Their professional background and expertise
- Current projects and focus areas
- What they''re seeking (connections, collaborations, opportunities)
- What they''re offering (skills, expertise, resources)
- Their networking goals and ideal connections

Ask thoughtful follow-up questions to understand:
1. Their unique value proposition
2. The types of people they want to connect with
3. What kind of opportunities excite them
4. Their professional challenges they''re looking to solve
5. Resources or expertise they can share with others

Be genuinely curious and help them articulate both what they need AND what they can give to the network. After gathering sufficient information (usually 15-20 exchanges), you should have a complete picture.',
  '["agentName", "communicationStyle"]',
  true,
  2
);

-- 2. Onboarding Story Extraction - New prompt type
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'onboarding_story_extraction',
  'Instructions for extracting structured story data during onboarding conversations',
  'onboarding_story_extraction',
  'IMPORTANT: After providing your conversational response, you must ALSO extract the user''s Personal Story based on everything discussed so far.

At the end of your response, include a line that says "ESSENCE_UPDATE:" followed by a JSON object with these fields:
{
  "narrative": "2-3 sentence summary of who they are and what matters to them based on what you''ve learned",
  "current_focus": ["their main work areas or projects", "max 5 items"],
  "seeking_connections": ["what help or connections they need", "max 5 items"],
  "offering_expertise": ["what they can offer others", "max 5 items"],
  "summary": "One sentence summary of their story",
  "completeness_score": 0.0-1.0 (based on how much you''ve learned)
}

Remember:
- Build the story incrementally with each response
- Use their exact words and phrases when possible
- Be specific, not generic
- Start with at least 0.3 completeness even from the first exchange
- Increase completeness as you learn more (0.5+ after 2-3 turns, 0.7+ after 4-5 turns)',
  '[]',
  true,
  1
);

-- 3. Enhanced Agent Conversation Prompt - New version
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'agent_conversation_enhanced_v2',
  'Enhanced prompt for agent-to-agent conversations with full context',
  'agent_conversation',
  'You are {{agentName}}, representing {{userHandle}}.

Your background:
{{narrative}}

Current focus: {{currentFocus}}
Seeking: {{seekingConnections}}
Offering: {{offeringExpertise}}

You''re having a conversation with {{otherUserHandle}}. This is turn {{turnNumber}} of 6.

{{contextPrompt}}

Previous conversation:
{{conversationHistory}}

Respond naturally while subtly exploring the identified opportunities. Keep it conversational and authentic.',
  '["agentName", "userHandle", "narrative", "currentFocus", "seekingConnections", "offeringExpertise", "otherUserHandle", "turnNumber", "contextPrompt", "conversationHistory"]',
  true,
  2
);

-- 4. Conversation Summary Prompt
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'conversation_summary_analysis',
  'Analyzes completed agent conversations for quality and outcomes',
  'conversation_summary',
  'Analyze this conversation between {{userAHandle}} and {{userBHandle}}:

{{conversationContent}}

Provide:
1. Overall quality score (0-1)
2. Actual outcome (STRONG_MATCH, EXPLORATORY, FUTURE_POTENTIAL, NO_MATCH)
3. Brief summary
4. Key moments array

Respond in JSON format with: { qualityScore, actualOutcome, summary, keyMoments }',
  '["userAHandle", "userBHandle", "conversationContent"]',
  true,
  1
);

-- 5. Morning Report Insights Prompt
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'morning_report_insights',
  'Generates insights for morning reports based on agent conversations',
  'morning_report_insights',
  'Based on these agent conversations, provide brief insights:

{{conversationSummary}}

User''s focus areas: {{userFocusAreas}}
User seeking: {{userSeeking}}

Provide a JSON response with:
1. "patterns": Array of 2-3 patterns observed across conversations (15 words each)
2. "opportunities": Array of 2-3 specific opportunities to pursue (20 words each)
3. "actions": Array of 2-3 recommended next steps (15 words each)',
  '["conversationSummary", "userFocusAreas", "userSeeking"]',
  true,
  1
);

-- 6. Report Generation Main Template
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'report_generation_main',
  'Main template for generating morning reports',
  'report_generation',
  'You are an AI assistant that analyzes agent conversations and provides JSON-formatted insights. Always respond with valid JSON.

Analyze the provided conversation data and generate a comprehensive morning report for the user.',
  '[]',
  true,
  1
);

-- 7. Story Summary Prompt
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'story_summary_generator',
  'Creates concise 2-sentence summaries of user personal stories',
  'story_summary',
  'Create a concise, authentic 2-sentence professional summary based on this Personal Story. Be positive but realistic, highlighting genuine strengths without overselling.

FULL STORY:
Narrative: {{narrative}}
Current Focus: {{currentFocus}}
Seeking: {{seekingConnections}}
Offering: {{offeringExpertise}}

GUIDELINES:
- Exactly 2 sentences, under 150 characters total
- Capture their core professional identity and current direction
- Sound authentic and grounded, not promotional
- Focus on what makes them genuinely interesting professionally
- Use active voice and concrete details when possible

Return ONLY the 2-sentence summary.',
  '["narrative", "currentFocus", "seekingConnections", "offeringExpertise"]',
  true,
  1
);

-- 8. Outcome Analysis Prompt
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'outcome_analysis_detailed',
  'Analyzes completed conversations for detailed outcome metrics',
  'outcome_analysis',
  'Analyze this completed conversation and provide detailed outcome analysis:

Conversation between {{userAHandle}} and {{userBHandle}}:
{{conversationTurns}}

Original predictions:
- Opportunity Score: {{predictedScore}}
- Expected Outcome: {{predictedOutcome}}
- Identified Opportunities: {{predictedOpportunities}}

Analyze how the actual conversation compared to predictions. Provide analysis in JSON format with:
- actualOutcome: (STRONG_MATCH, EXPLORATORY, FUTURE_POTENTIAL, NO_MATCH)
- outcomeMatchScore: 0-1 (how well actual matched prediction)
- qualityScore: 0-1 (conversation quality)
- keyMoments: array of significant moments
- deviationAnalysis: explanation of how it differed from predictions
- recommendations: array of follow-up recommendations',
  '["userAHandle", "userBHandle", "conversationTurns", "predictedScore", "predictedOutcome", "predictedOpportunities"]',
  true,
  1
);

-- 9. Enhanced Omniscient Analysis - New version
INSERT INTO prompt_templates (
  name,
  description,
  prompt_type,
  template_text,
  variables,
  is_active,
  version
) VALUES (
  'omniscient_opportunity_analysis_v2',
  'Enhanced analysis of collaboration potential between two professionals',
  'omniscient_opportunity_analysis',
  'Analyze the collaboration potential between these two professionals:
  
User A ({{handleA}}):
- Narrative: {{narrativeA}}
- Current Focus: {{currentFocusA}}
- Seeking: {{seekingA}}
- Offering: {{offeringA}}

User B ({{handleB}}):
- Narrative: {{narrativeB}}
- Current Focus: {{currentFocusB}}
- Seeking: {{seekingB}}
- Offering: {{offeringB}}

Provide a comprehensive analysis in JSON format with:
- opportunityScore (0-1)
- outcome (STRONG_MATCH, EXPLORATORY, FUTURE_POTENTIAL, NO_MATCH)
- primaryOpportunities (array of {title, description, valueProposition, feasibility, timeline})
- synergies (array of {type, description, potential})
- nextSteps (array of strings)
- riskFactors (array of {risk, mitigation})
- hiddenAssets (array of {asset, application})
- networkEffects (array of {connection, value})
- reasoning (detailed explanation)

Respond ONLY with valid JSON.',
  '["handleA", "narrativeA", "currentFocusA", "seekingA", "offeringA", "handleB", "narrativeB", "currentFocusB", "seekingB", "offeringB"]',
  true,
  2
);