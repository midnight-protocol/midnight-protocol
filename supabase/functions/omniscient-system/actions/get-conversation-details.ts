import { ActionContext, ActionResponse } from '../types.ts';

export default async function getConversationDetails(context: ActionContext): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { conversationId } = params;

  const { data: conversation, error } = await supabase
    .from('omniscient_conversations')
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
    .eq('id', conversationId)
    .single();

  if (error) throw new Error(`Failed to fetch conversation: ${error.message}`);

  return {
    success: true,
    data: conversation
  };
}