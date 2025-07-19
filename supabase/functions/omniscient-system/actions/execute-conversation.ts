import { ActionContext, ActionResponse } from "../types.ts";
import {
  ChatCompletionRequest,
  llmService,
} from "../../_shared/llm-service.ts";
import { getSystemConfig } from "../../_shared/system-config.ts";
import { PromptService } from "../../_shared/prompt-service.ts";

export default async function executeConversation(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, openRouterApiKey, params } = context;
  const { matchId } = params;

  // Initialize prompt service
  const promptService = new PromptService(supabase);

  // 1. Fetch match and insights
  const { data: match, error: matchError } = await supabase
    .from("omniscient_matches")
    .select(
      `
      *,
      user_a:users!user_a_id(
        id, handle,
        personal_stories(*),
        agent_profiles(*)
      ),
      user_b:users!user_b_id(
        id, handle,
        personal_stories(*),
        agent_profiles(*)
      ),
      insights:omniscient_match_insights(
        insight:omniscient_insights(*)
      )
    `
    )
    .eq("id", matchId)
    .single();

  if (matchError)
    throw new Error(`Failed to fetch match: ${matchError.message}`);

  // 2. Create conversation record
  const { data: conversation, error: convError } = await supabase
    .from("omniscient_conversations")
    .insert({
      match_id: matchId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (convError)
    throw new Error(`Failed to create conversation: ${convError.message}`);

  try {
    // 3. Prepare context with insights
    const opportunities = match.insights
      .filter((mi) => mi.insight.insight_type === "opportunity")
      .map((mi) => mi.insight);

    const synergies = match.insights
      .filter((mi) => mi.insight.insight_type === "synergy")
      .map((mi) => mi.insight);

    const contextPrompt = `
      Key Opportunities to Explore:
      ${opportunities.map((o) => `- ${o.title}: ${o.description}`).join("\n")}
      
      Potential Synergies:
      ${synergies.map((s) => `- ${s.title}: ${s.description}`).join("\n")}
      
      Guidance: Focus the conversation on these identified opportunities while maintaining natural flow.
    `;

    // 4. Execute 6-turn conversation with omniscient guidance
    const turns = [];
    let totalTokens = 0;

    for (let turnNumber = 1; turnNumber <= 6; turnNumber++) {
      const isUserA = turnNumber % 2 === 1;
      const speaker = isUserA ? match.user_a : match.user_b;
      const otherUser = isUserA ? match.user_b : match.user_a;

      let conversationHistory = turns
        .map((t) => `${t.speaker_role}: ${t.message}`)
        .join("\n");

      if (!conversationHistory) {
        conversationHistory = "no history yet";
      }

      // Use the agent_conversation_enhanced_v2 template
      const turnResponse = await promptService.executePromptTemplate(
        {
          templateName: "agent_conversation_enhanced_v2",
          variables: {
            agentName: speaker.agent_profiles[0].agent_name,
            userHandle: speaker.handle,
            narrative: speaker.personal_stories.narrative,
            currentFocus:
              speaker.personal_stories.current_focus?.join(", ") ||
              "Not specified",
            seekingConnections:
              speaker.personal_stories.seeking_connections?.join(", ") ||
              "Not specified",
            offeringExpertise:
              speaker.personal_stories.offering_expertise?.join(", ") ||
              "Not specified",
            otherUserHandle: otherUser.handle,
            turnNumber: turnNumber.toString(),
            contextPrompt: contextPrompt,
            conversationHistory: conversationHistory,
          },
        },
        {
          edgeFunction: "omniscient-system/executeConversation",
          userId: speaker.id,
        }
      );

      const turnMessage = turnResponse.response;
      const turnTokens = turnResponse.usage?.total_tokens || 0;
      totalTokens += turnTokens;

      // Calculate opportunity alignment score (simplified)
      const alignmentScore = Math.random() * 0.3 + 0.6; // 0.6-0.9 range

      // Store turn
      const turn = {
        conversation_id: conversation.id,
        turn_number: turnNumber,
        speaker_user_id: speaker.id,
        speaker_role: isUserA ? "agent_a" : "agent_b",
        message: turnMessage,
        guided_by_insights: opportunities.map((o) => o.id),
        opportunity_alignment_score: alignmentScore,
        prompt_tokens: turnResponse.usage?.prompt_tokens || 0,
        completion_tokens: turnResponse.usage?.completion_tokens || 0,
        response_time_ms: 2000, // Placeholder
      };

      await supabase.from("omniscient_turns").insert(turn);
      turns.push(turn);

      console.log(
        `Turn ${turnNumber} completed for conversation ${conversation.id}`
      );
    }

    // 5. Generate conversation summary and outcome
    const conversationContent = turns
      .map((t) => `${t.speaker_role}: ${t.message}`)
      .join("\n\n");

    const summaryResponse = await promptService.executePromptTemplate(
      {
        templateName: "conversation_summary_analysis",
        variables: {
          userAHandle: match.user_a.handle,
          userBHandle: match.user_b.handle,
          conversationContent: conversationContent,
        },
      },
      {
        edgeFunction: "omniscient-system/executeConversation",
        userId: match.user_a.id,
      }
    );

    const summaryMessage = summaryResponse.response;
    const summaryTokens = summaryResponse.usage?.total_tokens || 0;
    totalTokens += summaryTokens;

    try {
      // console.debug("Summary message", summaryMessage);
      const summaryData = JSON.parse(summaryMessage);

      // 6. Update conversation with results
      await supabase
        .from("omniscient_conversations")
        .update({
          status: "completed",
          actual_outcome: summaryData.actualOutcome,
          quality_score: summaryData.qualityScore,
          conversation_summary: summaryData.summary,
          key_moments: summaryData.keyMoments,
          total_tokens: totalTokens,
          completed_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      // 7. Update match status
      await supabase
        .from("omniscient_matches")
        .update({ status: "completed" })
        .eq("id", matchId);

      return {
        success: true,
        data: {
          conversation,
          turns: turns.length,
          qualityScore: summaryData.qualityScore,
          outcome: summaryData.actualOutcome,
          totalTokens,
        },
      };
    } catch (error) {
      console.error("Failed to parse summary data", error);
      throw new Error("Failed to parse summary data");
    }
  } catch (error) {
    // Mark conversation as failed
    await supabase
      .from("omniscient_conversations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    throw error;
  }
}
