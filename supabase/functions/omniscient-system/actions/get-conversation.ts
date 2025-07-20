import { ActionContext, ActionResponse } from "../types.ts";

export default async function getConversation(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { conversationId } = params;

  if (!conversationId) {
    throw new Error("conversationId is required");
  }

  console.log(`💬 Fetching single conversation: ${conversationId}`);

  const { data: conversation, error } = await supabase
    .from("omniscient_conversations")
    .select(`
      *,
      match:omniscient_matches!match_id(
        *,
        user_a:users!user_a_id(id, handle),
        user_b:users!user_b_id(id, handle)
      ),
      turns:omniscient_turns(*),
      outcomes:omniscient_outcomes(*)
    `)
    .eq("id", conversationId)
    .single();

  if (error) {
    console.error("Error fetching conversation:", error);
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  console.log(`✅ Successfully fetched conversation ${conversationId}`);

  return {
    success: true,
    data: conversation,
    summary: {
      conversationId,
      status: conversation.status,
      matchId: conversation.match_id,
      turnCount: conversation.turns?.length || 0,
      qualityScore: conversation.quality_score,
      totalTokens: conversation.total_tokens,
      totalCost: conversation.total_cost
    }
  };
}