import { ActionContext, ActionResponse } from '../types.ts';

export default async function analyzeOutcome(context: ActionContext): Promise<ActionResponse> {
  const { supabase, openRouterApiKey, params } = context;
  const { conversationId } = params;

  // Fetch conversation details
  const { data: conversation, error } = await supabase
    .from('omniscient_conversations')
    .select(`
      *,
      match:omniscient_matches!match_id(*),
      turns:omniscient_turns(*)
    `)
    .eq('id', conversationId)
    .single();

  if (error) throw new Error(`Failed to fetch conversation: ${error.message}`);

  // Generate outcome analysis using AI
  const analysisPrompt = `Analyze this completed conversation and provide detailed outcome analysis:

Conversation between users with predicted outcome: ${conversation.match.predicted_outcome}
Actual conversation outcome: ${conversation.actual_outcome}
Quality score: ${conversation.quality_score}

Conversation transcript:
${conversation.turns?.map(t => `Turn ${t.turn_number} (${t.speaker_role}): ${t.message}`).join('\n')}

Provide analysis in JSON format with:
- outcomeAnalysis (detailed analysis of what happened)
- collaborationReadinessScore (0-1 score for readiness to collaborate)
- specificNextSteps (array of actionable next steps)
- followUpRecommended (boolean)
- followUpTimeframe (suggested timeframe if follow-up recommended)

Respond ONLY with valid JSON.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const analysisData = JSON.parse(aiResponse.choices[0].message.content);

  // Store outcome analysis
  const { data: outcome } = await supabase
    .from('omniscient_outcomes')
    .insert({
      conversation_id: conversationId,
      match_id: conversation.match_id,
      outcome_analysis: analysisData.outcomeAnalysis,
      collaboration_readiness_score: analysisData.collaborationReadinessScore,
      specific_next_steps: analysisData.specificNextSteps,
      follow_up_recommended: analysisData.followUpRecommended,
      follow_up_timeframe: analysisData.followUpTimeframe
    })
    .select()
    .single();

  return {
    success: true,
    data: { outcome, analysis: analysisData }
  };
}