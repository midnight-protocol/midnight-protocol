import { ChatMessage } from "../_shared/llm-service.ts";

interface TestPersona {
  name: string;
  role: string;
  background: string;
  goals: string[];
  personality: string;
  expertise: string[];
  currentProject?: string;
}

interface OnboardingContext {
  agentName: string;
  communicationStyle: string;
  persona: TestPersona;
  conversationHistory: Array<{
    role: "agent" | "user";
    content: string;
  }>;
  turnNumber: number;
}

/**
 * Generates a dynamic response for onboarding conversation using LLM
 * Falls back to static responses if LLM is not available
 */
export async function generateOnboardingResponse(
  context: OnboardingContext,
  apiKey?: string
): Promise<string> {
  // If no API key, return a fallback response
  if (!apiKey) {
    return generateFallbackResponse(context);
  }

  try {
    // Dynamically import LLMService to avoid issues when API key is not available
    const { LLMService } = await import("../_shared/llm-service.ts");

    // Create a temporary LLM service instance with the provided key
    const llmService = new LLMService();

    // Override the API key by setting the environment variable temporarily
    const originalKey = Deno.env.get("OPENROUTER_API_KEY");
    Deno.env.set("OPENROUTER_API_KEY", apiKey);

    try {
      // Build the prompt for generating a response
      const systemPrompt = buildSystemPrompt(context);
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // Add conversation history
      for (const msg of context.conversationHistory) {
        messages.push({
          role: msg.role === "agent" ? "assistant" : "user",
          content: msg.content,
        });
      }

      // Add instruction for next response as a user message to prompt the assistant
      messages.push({
        role: "user",
        content: `[Assistant: Generate the next user response based on the persona and conversation context. The response should be natural, conversational, and reveal information about the user that helps build their profile. Respond only with the user's message, nothing else.]`,
      });

      // Make the API call
      const response = await llmService.chatCompletion({
        model: "openai/gpt-4o-mini", // Use a fast, cheap model for tests
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const generatedResponse = response.choices[0]?.message?.content;

      if (!generatedResponse) {
        throw new Error("No response generated");
      }

      return generatedResponse;
    } finally {
      // Restore original API key
      if (originalKey) {
        Deno.env.set("OPENROUTER_API_KEY", originalKey);
      } else {
        Deno.env.delete("OPENROUTER_API_KEY");
      }
    }
  } catch (error) {
    console.warn(
      "Failed to generate dynamic response, using fallback:",
      error.message
    );
    // Log more details about the error for debugging
    if (error.message.includes("Bad Request") || error.message.includes("API error")) {
      console.debug("API Error Details:", {
        model: "openai/gpt-4o-mini",
        error: error.message
      });
    }
    return generateFallbackResponse(context);
  }
}

/**
 * Builds the system prompt for the LLM based on context
 */
function buildSystemPrompt(context: OnboardingContext): string {
  const { persona, agentName, communicationStyle } = context;

  return `You are playing the role of a user in an onboarding conversation with an AI agent named ${agentName}.

Your persona:
- Name: ${persona.name}
- Role: ${persona.role}
- Background: ${persona.background}
- Personality: ${persona.personality}
- Current Project: ${persona.currentProject || "Not specified"}
- Expertise: ${persona.expertise.join(", ")}
- Goals: ${persona.goals.join(", ")}

The agent's communication style is: ${communicationStyle}

You are in an onboarding conversation where the agent is trying to learn about you to represent you in a professional network. You should:
1. Answer questions naturally and conversationally
2. Share relevant details about your work and interests
3. Be authentic to your persona's personality
4. Gradually reveal information as the conversation progresses
5. Ask clarifying questions when appropriate
6. Show enthusiasm about the platform and what it can do for you

This is turn ${context.turnNumber} of the conversation.`;
}

/**
 * Generates a fallback response when LLM is not available
 */
function generateFallbackResponse(context: OnboardingContext): string {
  const { persona, turnNumber, conversationHistory } = context;

  // Get the last agent message to understand what we're responding to
  const lastAgentMessage =
    [...conversationHistory].reverse().find((msg) => msg.role === "agent")
      ?.content || "";

  // Generate contextual responses based on turn number and content
  const responses: Record<number, string> = {
    1: `I'm ${persona.role}. ${persona.background}. My current focus is on ${
      persona.currentProject || "exploring new opportunities"
    }.`,

    2: `That's a great question! My main expertise lies in ${
      persona.expertise[0]
    }. I've been working on ${
      persona.goals[0]
    }. What I'm really passionate about is finding ways to ${
      persona.goals[1] || "innovate in my field"
    }.`,

    3: `I'm particularly interested in connecting with people who share similar interests or complementary skills. ${
      persona.personality === "analytical"
        ? "I tend to approach problems methodically"
        : "I love brainstorming creative solutions"
    }. My experience in ${persona.expertise.join(
      " and "
    )} could be valuable to others working on similar challenges.`,

    4: `One of my key goals right now is ${
      persona.goals[0]
    }. I believe this platform could help me ${
      persona.goals[1] || "expand my professional network"
    }. I'm also keen to ${
      persona.goals[2] || "learn from others in the community"
    }.`,

    5: `To give you more context, ${persona.background}. This has shaped my approach to ${persona.expertise[0]}. I'm always looking for opportunities to ${persona.goals[0]}.`,

    6: `That sounds perfect! I'm excited about the potential connections and collaborations. My background in ${persona.expertise.join(
      ", "
    )} combined with my current work on ${
      persona.currentProject || "various projects"
    } means I have a lot to offer and learn from this community.`,
  };

  // Return appropriate response based on turn number, with a default
  return (
    responses[turnNumber] ||
    `I appreciate you taking the time to understand my background. As a ${
      persona.role
    }, I'm always looking for ways to ${
      persona.goals[0] || "grow professionally"
    }. Is there anything specific about my ${
      persona.expertise[0]
    } experience you'd like to know more about?`
  );
}

/**
 * Validates that a persona has all required fields
 */
export function validatePersona(persona: any): persona is TestPersona {
  return (
    typeof persona.name === "string" &&
    typeof persona.role === "string" &&
    typeof persona.background === "string" &&
    Array.isArray(persona.goals) &&
    typeof persona.personality === "string" &&
    Array.isArray(persona.expertise)
  );
}

/**
 * Extracts key information from a conversation for story generation
 */
export function extractConversationInsights(
  conversationHistory: Array<{ role: string; content: string }>,
  persona: TestPersona
): {
  narrative: string;
  currentFocus: string[];
  seekingConnections: string[];
  offeringExpertise: string[];
} {
  // Build a narrative from the persona and conversation
  const narrative = `${persona.name} is a ${persona.role}. ${
    persona.background
  }. Through our conversation, it's clear that ${
    persona.name
  } is focused on ${persona.goals.join(
    " and "
  )}. Their expertise in ${persona.expertise.join(
    ", "
  )} positions them well for collaborative opportunities.`;

  // Extract current focus from goals and current project
  const currentFocus = [
    persona.currentProject,
    ...persona.goals.slice(0, 2),
  ].filter(Boolean) as string[];

  // Define what connections they're seeking based on persona
  const seekingConnections = persona.goals
    .map((goal) => `Professionals who can help with ${goal}`)
    .slice(0, 3);

  // Define what they can offer
  const offeringExpertise = persona.expertise.map(
    (skill) => `${skill} consultation and collaboration`
  );

  return {
    narrative,
    currentFocus,
    seekingConnections,
    offeringExpertise,
  };
}
