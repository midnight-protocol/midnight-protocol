# Hardcoded Prompts Migration Guide

This document tracks all hardcoded prompts found in the codebase that need to be migrated to use the `prompt_templates` table.

## Summary

- **Total prompts found**: 8 distinct prompts
- **Files affected**: 7 different files
- **Migration status**: SQL migration created in `/supabase/migrations/20250713214403_more_prompts.sql`

## Prompt Locations

### 1. Onboarding Interview System Prompt [COMPLETE]

- **File**: `/src/components/OnboardingChat.tsx`
- **Line**: ~270-285
- **Function**: Inside `supabase.functions.invoke("openrouter-chat")`
- **Template Name**: `agent_interview_onboarding_v2`
- **Variables**: `agentName`, `communicationStyle`
- **Usage**: Main system prompt for onboarding conversations

### 2. Onboarding Story Extraction Instructions [COMPLETE - merged with 1]

- **File**: `/supabase/functions/openrouter-chat/index.ts`
- **Line**: Appended to system prompt during onboarding
- **Template Name**: `onboarding_story_extraction`
- **Variables**: None
- **Usage**: Extracts structured story data from conversations

### 3. Omniscient Analysis Prompt [Prompt itself needs update, missing fields]

- **File**: `/supabase/functions/omniscient-system/omniscientAnalysis.ts`
- **Function**: `analyzeCollaborationPotential()`
- **Template Name**: `omniscient_opportunity_analysis_v2`
- **Variables**: `handleA`, `narrativeA`, `currentFocusA`, `seekingA`, `offeringA`, `handleB`, `narrativeB`, `currentFocusB`, `seekingB`, `offeringB`
- **Usage**: Analyzes collaboration potential between two users

### 4. Agent Conversation Prompt

- **File**: `/supabase/functions/omniscient-system/actions/execute-conversation.ts [COMPLETE - will deprecate probably]
- **Function**: Inside conversation execution logic
- **Template Name**: `agent_conversation_enhanced_v2`
- **Variables**: `agentName`, `userHandle`, `narrative`, `currentFocus`, `seekingConnections`, `offeringExpertise`, `otherUserHandle`, `turnNumber`, `contextPrompt`, `conversationHistory`
- **Usage**: Templates for AI agents during conversations

### 5. Conversation Summary Prompt

- **File**: `/supabase/functions/omniscient-system/actions/execute-conversation.ts` [COMPLETE - will deprecate probably]
- **Function**: At the end of conversation execution
- **Template Name**: `conversation_summary_analysis`
- **Variables**: `userAHandle`, `userBHandle`, `conversationContent`
- **Usage**: Summarizes completed conversations

### 6. Morning Report Insights Prompt

- **File**: `/supabase/functions/generate-morning-reports/index.ts`
- **Function**: Inside report generation logic
- **Template Name**: `morning_report_insights`
- **Variables**: `conversationSummary`, `userFocusAreas`, `userSeeking`
- **Usage**: Generates insights from conversations for morning reports

### 7. Story Summary Generator

- **File**: `/supabase/functions/generate-story-summary/index.ts` [DEPRECATED]
- **Function**: Main function body
- **Template Name**: `story_summary_generator`
- **Variables**: `narrative`, `currentFocus`, `seekingConnections`, `offeringExpertise`
- **Usage**: Creates 2-sentence summaries of user stories

### 8. Outcome Analysis Prompt

- **File**: `/supabase/functions/omniscient-system/actions/analyze-outcome.ts` [DEPRECATED]
- **Function**: Inside outcome analysis logic
- **Template Name**: `outcome_analysis_detailed`
- **Variables**: `userAHandle`, `userBHandle`, `conversationTurns`, `predictedScore`, `predictedOutcome`, `predictedOpportunities`
- **Usage**: Analyzes how conversations matched predictions

## Migration Steps

### Phase 1: Database Setup ✅

1. Run migration `/supabase/migrations/20250713214403_more_prompts.sql`
2. Verify all templates are loaded in the `prompt_templates` table
3. Test the PromptEditor in the admin dashboard

### Phase 2: Code Refactoring (TODO)

Each hardcoded prompt needs to be replaced with a call to fetch from the database:

1. **Create a prompt service** to fetch templates by name or type
2. **Replace hardcoded strings** with template fetching and variable substitution
3. **Update edge functions** to use the prompt service
4. **Update frontend components** to use the admin API for prompts

### Phase 3: Testing (TODO)

1. Test each affected function to ensure prompts are loaded correctly
2. Verify variable substitution works properly
3. Check that all features continue to work as expected

## Example Refactoring

### Before:

```typescript
const prompt = `You are ${agentName}, representing ${userHandle}.
Your background: ${narrative}
...`;
```

### After:

```typescript
const template = await promptService.getActiveTemplate("agent_conversation");
const prompt = promptService.interpolate(template.template_text, {
  agentName,
  userHandle,
  narrative,
  // ... other variables
});
```

## Benefits of Migration

1. **Centralized Management**: All prompts in one place
2. **Version Control**: Track changes to prompts over time
3. **A/B Testing**: Easy to test different prompt versions
4. **No Code Changes**: Update prompts without deploying code
5. **Admin UI**: Use the PromptEditor to manage all prompts

## Notes

- Some prompts have been enhanced with more variables for flexibility
- New prompt types were added: `onboarding_story_extraction`, `morning_report_insights`, `story_summary`, `outcome_analysis`
- Existing prompts are versioned (v2) to maintain history
- The unique constraint ensures only one active prompt per type
