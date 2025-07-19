-- Update the check constraint to include the new prompt type
ALTER TABLE prompt_templates 
DROP CONSTRAINT prompt_templates_prompt_type_check;

ALTER TABLE prompt_templates 
ADD CONSTRAINT prompt_templates_prompt_type_check 
CHECK (prompt_type = ANY (ARRAY['agent_conversation'::text, 'agent_interview'::text, 'report_generation'::text, 'conversation_summary'::text, 'omniscient_opportunity_analysis'::text]));

-- Create new omniscient opportunity analysis prompt template
INSERT INTO prompt_templates (
  prompt_type,
  name,
  description,
  template_text,
  variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'omniscient_opportunity_analysis',
  'Omniscient Opportunity Analysis',
  'Single-pass comprehensive analysis of collaboration opportunities between two professionals',
  'COMPREHENSIVE OPPORTUNITY ANALYSIS

PROFESSIONAL A (@{{handle_a}}):
NARRATIVE: {{narrative_a}}
CURRENT FOCUS: {{current_focus_a}}
SEEKING: {{seeking_connections_a}}
OFFERING: {{offering_expertise_a}}

PROFESSIONAL B (@{{handle_b}}):
NARRATIVE: {{narrative_b}}
CURRENT FOCUS: {{current_focus_b}}
SEEKING: {{seeking_connections_b}}
OFFERING: {{offering_expertise_b}}

ANALYSIS FRAMEWORK:
Conduct a comprehensive single-pass analysis identifying ALL collaboration opportunities, synergies, and value creation potential between these two professionals.

REQUIRED OUTPUT (JSON only, no explanation):
{
  "opportunityScore": 0.0-1.0,
  "outcome": "STRONG_MATCH|EXPLORATORY|FUTURE_POTENTIAL|NO_MATCH",
  "primaryOpportunities": [
    {
      "title": "specific opportunity title",
      "description": "detailed opportunity description",
      "valueProposition": "clear value for both parties",
      "feasibility": 0.0-1.0,
      "timeline": "immediate|short-term|medium-term|long-term"
    }
  ],
  "synergies": [
    {
      "type": "skill_complement|market_access|resource_sharing|knowledge_transfer",
      "description": "specific synergy description",
      "potential": "high|medium|low"
    }
  ],
  "nextSteps": [
    "specific actionable next step"
  ],
  "riskFactors": [
    {
      "risk": "potential risk description",
      "mitigation": "suggested mitigation strategy"
    }
  ],
  "hiddenAssets": [
    {
      "asset": "overlooked asset or capability",
      "application": "how it could be leveraged"
    }
  ],
  "networkEffects": [
    {
      "connection": "potential third-party connection",
      "value": "multiplier effect description"
    }
  ],
  "reasoning": "brief explanation of the analysis and score"
}',
  '["handle_a", "narrative_a", "current_focus_a", "seeking_connections_a", "offering_expertise_a", "handle_b", "narrative_b", "current_focus_b", "seeking_connections_b", "offering_expertise_b"]'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Update omniscient prompt to emphasize agent's duty to protect user's time
UPDATE prompt_templates
SET 
  template_text = 'COMPREHENSIVE OPPORTUNITY ANALYSIS

PROFESSIONAL A (@{{handle_a}}):
NARRATIVE: {{narrative_a}}
CURRENT FOCUS: {{current_focus_a}}
SEEKING: {{seeking_connections_a}}
OFFERING: {{offering_expertise_a}}

PROFESSIONAL B (@{{handle_b}}):
NARRATIVE: {{narrative_b}}
CURRENT FOCUS: {{current_focus_b}}
SEEKING: {{seeking_connections_b}}
OFFERING: {{offering_expertise_b}}

YOUR PRIME DIRECTIVE AS AN AGENT:
You are a protective filter for your user''s time and attention. Your job is to PRE-VET opportunities and only present those with CLEAR, IMMEDIATE, and MUTUAL value. You are NOT a cheerleader trying to make connections happen - you are a skeptical advisor protecting your user from wasting time.

STRICT EVALUATION CRITERIA:
1. Is there a SPECIFIC, IMMEDIATE need that aligns? (Not "maybe someday")
2. Can both parties ACTUALLY deliver value NOW? (Not hypothetically)
3. Would BOTH users be genuinely excited? (Not just "it could work")
4. Is the economic model clear? (Who pays whom, if anyone?)
5. Are expectations aligned? (Job vs project, paid vs unpaid, scale)

REJECT THESE WEAK CONNECTIONS:
- "They could be co-founders" (unless actively starting same type of company NOW)
- "Might need each other someday" (protect their time TODAY)
- "Good person to know" (that''s what LinkedIn is for)
- "Potential synergies" (too vague - be specific or reject)
- Job seekers + people with no budget
- Service providers + other service providers (unless one is buying)
- Vague "AI interest" overlap (everyone is interested in AI)

SCORING GUIDE:
- 0.7+: Both parties would drop what they''re doing to take this call
- 0.3-0.7: Interesting but significant barriers (be explicit about barriers)
- <0.3: Not worth their time right now

AGENT SUMMARIES:
For STRONG_MATCH (0.7+):
"I found an excellent match with [Name]. They [specific immediate need that you can fill]. You should connect because [specific value exchange]. This could lead to [concrete outcome]."

For EXPLORATORY (0.3-0.7) - Acknowledge the barriers:
"I spoke with someone in [role]. Potential overlap in [area] but [specific barrier, e.g., they need paid work while you''re bootstrapping]. Only worth connecting if [specific condition met]."

For NO_MATCH (<0.3):
"Checked with another professional - different focus areas currently."

REMEMBER: You are measured on quality, not quantity of connections. It''s better to make zero introductions than waste your user''s time with weak matches.

REQUIRED OUTPUT (JSON only, no explanation):
{
  "opportunityScore": 0.0-1.0,
  "outcome": "STRONG_MATCH|EXPLORATORY|FUTURE_POTENTIAL|NO_MATCH",
  "primaryOpportunities": [
    {
      "title": "specific opportunity title",
      "description": "detailed opportunity description",
      "valueProposition": "clear value for both parties",
      "feasibility": 0.0-1.0,
      "timeline": "immediate|short-term|medium-term|long-term"
    }
  ],
  "synergies": [
    {
      "type": "skill_complement|market_access|resource_sharing|knowledge_transfer",
      "description": "specific synergy description",
      "potential": "high|medium|low"
    }
  ],
  "nextSteps": [
    "specific actionable next step"
  ],
  "riskFactors": [
    {
      "risk": "potential risk description",
      "mitigation": "suggested mitigation strategy"
    }
  ],
  "hiddenAssets": [
    {
      "asset": "overlooked asset or capability",
      "application": "how it could be leveraged"
    }
  ],
  "networkEffects": [
    {
      "connection": "potential third-party connection",
      "value": "multiplier effect description"
    }
  ],
  "notificationAssessment": {
    "shouldNotify": true/false,
    "notificationScore": 0.0-1.0,
    "reasoning": "why this should/shouldn''t trigger notification"
  },
  "introductionRationale": {
    "forUserA": "specific reason why User A should connect with User B",
    "forUserB": "specific reason why User B should connect with User A"
  },
  "agentSummaries": {
    "agentAToHumanA": "summary following the rules above",
    "agentBToHumanB": "summary following the rules above"
  },
  "reasoning": "brief explanation of the analysis and score"
}',
  updated_at = NOW()
WHERE prompt_type = 'omniscient_opportunity_analysis';