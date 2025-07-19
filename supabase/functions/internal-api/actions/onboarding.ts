import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PromptService } from "../../_shared/prompt-service.ts";
import { llmService } from "../../_shared/llm-service.ts";

interface Message {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
}

interface OnboardingChatResponse {
  messages: Message[];
  conversationId: string;
  turnCount: number;
  essenceData?: any;
  showCompleteButton?: boolean;
}

interface SendMessageResponse {
  agentMessage: Message;
  essenceData?: any;
  showCompleteButton?: boolean;
}

interface OnboardingData {
  userRecord: any;
  agentProfile?: any;
  hasExistingProfile: boolean;
}

/**
 * Initialize onboarding chat - fetch agent profile and load/create conversation
 */
export async function initializeOnboardingChat(
  supabase: SupabaseClient,
  params: {
    agentName: string;
    communicationStyle: string;
  },
  user: any,
  databaseUser: any
): Promise<OnboardingChatResponse> {
  const { agentName, communicationStyle } = params;
  const userId = databaseUser.id;

  // Fetch agent profile
  let agentProfileId: string | null = null;
  try {
    const { data: agentProfile, error: agentError } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (agentError) {
      console.error("Failed to fetch agent profile:", agentError);
    } else if (agentProfile) {
      agentProfileId = agentProfile.id;
    }
  } catch (error) {
    console.error("Error fetching agent profile:", error);
  }

  // Check for existing active onboarding conversation
  const { data: conversationData, error: conversationError } = await supabase
    .from("onboarding_conversations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError && conversationError.code !== "PGRST116") {
    throw new Error(
      `Failed to fetch conversation: ${conversationError.message}`
    );
  }

  let conversationId: string;
  let messages: Message[] = [];
  let turnCount = 0;
  let showCompleteButton = false;

  if (conversationData) {
    // Load existing conversation
    conversationId = conversationData.id;

    // Load existing messages
    const { data: messagesData, error: messagesError } = await supabase
      .from("onboarding_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("message_order", { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    if (messagesData && messagesData.length > 0) {
      messages = messagesData.map((msg) => ({
        id: msg.id,
        role: msg.role as "agent" | "user",
        content: msg.content,
        timestamp: msg.created_at,
      }));

      const userMessageCount = messagesData.filter(
        (m) => m.role === "user"
      ).length;
      turnCount = userMessageCount;
      showCompleteButton = userMessageCount >= 5;
    }
  } else {
    // Create new conversation with greeting
    const { data: newConversation, error: createError } = await supabase
      .from("onboarding_conversations")
      .insert({
        user_id: userId,
        status: "active",
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    conversationId = newConversation.id;

    // Create greeting message
    const greeting = `Hi! I'm ${agentName}, your AI agent. I'm here to learn about you so I can represent you effectively in the network. 

Let's start with something simple - what's your current professional focus or the main project you're working on?`;

    const greetingMessage: Message = {
      id: crypto.randomUUID(),
      role: "agent",
      content: greeting,
      timestamp: new Date().toISOString(),
    };

    // Save greeting message to database
    const { error: saveError } = await supabase
      .from("onboarding_messages")
      .insert({
        conversation_id: conversationId,
        role: greetingMessage.role,
        content: greetingMessage.content,
        message_order: 1,
      });

    if (saveError) {
      console.error("Error saving greeting message:", saveError);
    }

    messages = [greetingMessage];
  }

  return {
    messages,
    conversationId,
    turnCount,
    showCompleteButton,
  };
}

/**
 * Send a message in onboarding chat and get AI response
 */
export async function sendOnboardingMessage(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    message: string;
    agentName: string;
    communicationStyle: string;
    currentMessages: Message[];
    turnCount: number;
  },
  user: any,
  databaseUser: any
): Promise<SendMessageResponse> {
  const {
    conversationId,
    message,
    agentName,
    communicationStyle,
    currentMessages,
    turnCount,
  } = params;
  const userId = databaseUser.id;

  // Create user message
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };

  // Save user message to database
  const messageOrder = currentMessages.length + 1;
  const { error: saveUserError } = await supabase
    .from("onboarding_messages")
    .insert({
      conversation_id: conversationId,
      role: userMessage.role,
      content: userMessage.content,
      message_order: messageOrder,
    });

  if (saveUserError) {
    throw new Error(`Failed to save user message: ${saveUserError.message}`);
  }

  // Get AI response using prompt service
  const promptService = new PromptService(supabase);

  try {
    // Build messages for AI including conversation history
    const allMessages = [...currentMessages, userMessage].map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    console.log("allMessages", allMessages);

    // Get the system prompt from the template
    const promptResponse = await promptService.executePromptTemplate({
      templateName: "agent_interview_onboarding_v2",
      variables: {
        agentName: agentName,
        communicationStyle: communicationStyle,
      },
      temperature: 0.7,
      maxTokens: 1500,
      additionalMessages: allMessages,
    });

    const fullResponse = promptResponse.response;

    console.log("fullResponse", fullResponse);

    // Parse the response to separate chat message from story update
    let chatMessage = fullResponse;
    let essenceData = null;

    const essenceMatch = fullResponse.match(/ESSENCE_UPDATE:\s*(\{[\s\S]*\})/);
    if (essenceMatch) {
      try {
        essenceData = JSON.parse(essenceMatch[1]);
        // Remove the essence part from the chat message
        chatMessage = fullResponse
          .replace(/\n*ESSENCE_UPDATE:[\s\S]*$/, "")
          .trim();

        // Save the story to the database
        const { error: essenceError } = await supabase
          .from("personal_stories")
          .upsert(
            {
              user_id: userId,
              narrative: essenceData.narrative,
              current_focus: essenceData.current_focus || [],
              seeking_connections: essenceData.seeking_connections || [],
              offering_expertise: essenceData.offering_expertise || [],
              summary: essenceData.summary || "",
              completeness_score: essenceData.completeness_score || 0.3,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (essenceError) {
          console.error("Error saving story:", essenceError);
        }
      } catch (parseError) {
        console.error("Failed to parse story JSON:", parseError);
      }
    }

    // Create agent message
    const agentMessage: Message = {
      id: crypto.randomUUID(),
      role: "agent",
      content: chatMessage,
      timestamp: new Date().toISOString(),
    };

    // Save agent message to database
    const { error: saveAgentError } = await supabase
      .from("onboarding_messages")
      .insert({
        conversation_id: conversationId,
        role: agentMessage.role,
        content: agentMessage.content,
        message_order: messageOrder + 1,
      });

    if (saveAgentError) {
      throw new Error(
        `Failed to save agent message: ${saveAgentError.message}`
      );
    }

    const newTurnCount = turnCount + 1;
    const showCompleteButton = newTurnCount >= 5;

    return {
      agentMessage,
      essenceData,
      showCompleteButton,
    };
  } catch (error) {
    console.error("Error in sendOnboardingMessage:", error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
}

/**
 * Complete onboarding process
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
  },
  user: any,
  databaseUser: any
): Promise<{ success: boolean }> {
  const { conversationId } = params;
  const userId = databaseUser.id;

  try {
    // Mark conversation as completed
    const { error: conversationError } = await supabase
      .from("onboarding_conversations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (conversationError) {
      console.error("Failed to update conversation status:", conversationError);
    }

    // Update user status to PENDING
    const { error: userError } = await supabase
      .from("users")
      .update({ status: "PENDING" })
      .eq("id", userId);

    if (userError) {
      throw new Error(`Failed to update user status: ${userError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing onboarding:", error);
    throw error;
  }
}

/**
 * Get onboarding data - fetch user record and agent profile
 */
export async function getOnboardingData(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  params: {},
  user: any,
  databaseUser: any
): Promise<OnboardingData> {
  const userId = databaseUser.id;

  try {
    // Get user record (we already have it from databaseUser, but return it in expected format)
    const userRecord = databaseUser;

    // Check if user already has an agent profile
    const { data: agentProfile, error: agentError } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (agentError) {
      console.error("Error fetching agent profile:", agentError);
    }

    return {
      userRecord,
      agentProfile: agentProfile || null,
      hasExistingProfile: !!agentProfile,
    };
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    throw new Error(`Failed to fetch onboarding data: ${error.message}`);
  }
}

/**
 * Save agent personalization data
 */
export async function saveAgentPersonalization(
  supabase: SupabaseClient,
  params: {
    agentName: string;
    communicationStyle: string;
  },
  user: any,
  databaseUser: any
): Promise<{ success: boolean }> {
  const { agentName, communicationStyle } = params;
  const userId = databaseUser.id;

  try {
    // Save agent profile
    const { error } = await supabase.from("agent_profiles").upsert({
      user_id: userId,
      agent_name: agentName,
      communication_style: communicationStyle,
    });

    if (error) {
      throw new Error(`Failed to save agent profile: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving agent personalization:", error);
    throw error;
  }
}

/**
 * Get user's personal story
 */
export async function getPersonalStory(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  params: {},
  user: any,
  databaseUser: any
): Promise<any> {
  const userId = databaseUser.id;

  try {
    const { data, error } = await supabase
      .from("personal_stories")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching personal story:", error);
      throw new Error(`Failed to fetch personal story: ${error.message}`);
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching personal story:", error);
    throw error;
  }
}

/**
 * Update user's timezone
 */
export async function updateUserTimezone(
  supabase: SupabaseClient,
  params: {
    timezone: string;
  },
  user: any,
  databaseUser: any
): Promise<{ success: boolean }> {
  const { timezone } = params;
  const userId = databaseUser.id;

  try {
    const { error } = await supabase
      .from("users")
      .update({ timezone })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to update timezone: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user timezone:", error);
    throw error;
  }
}
