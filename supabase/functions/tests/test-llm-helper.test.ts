#!/usr/bin/env -S deno run --allow-all

/**
 * Test script for the LLM helper module
 * This validates that dynamic response generation works correctly
 */

import { 
  generateOnboardingResponse, 
  validatePersona,
  extractConversationInsights 
} from "./test-llm-helper.ts";
import { load } from "jsr:@std/dotenv";

// Load environment variables for testing
try {
  await load({ envPath: '.env.test', export: true });
} catch (error) {
  // Ignore if .env.test doesn't exist
}

// Test persona
const testPersona = {
  name: "Alex Chen",
  role: "Senior Full-Stack Developer",
  background: "10 years of experience building enterprise SaaS applications",
  personality: "analytical",
  currentProject: "Migrating a monolithic application to microservices",
  expertise: ["TypeScript", "React", "Node.js", "AWS"],
  goals: [
    "Reduce technical debt while maintaining feature velocity",
    "Build scalable and maintainable systems",
    "Mentor junior developers"
  ]
};

// Test conversation history
const conversationHistory = [
  {
    role: "agent" as const,
    content: "Hi! I'm TestAgent, your AI agent. I'm here to learn about you so I can represent you effectively in the network. Let's start with something simple - what's your current professional focus or the main project you're working on?"
  }
];

async function testDynamicResponse() {
  console.log("🧪 Testing LLM Helper Functions\n");
  
  // Test 1: Validate persona
  console.log("Test 1: Validating persona structure");
  const isValid = validatePersona(testPersona);
  console.log(`✅ Persona validation: ${isValid ? "PASSED" : "FAILED"}\n`);
  
  // Test 2: Generate fallback response (no API key)
  console.log("Test 2: Generating fallback response (no API key)");
  const fallbackResponse = await generateOnboardingResponse({
    agentName: "TestAgent",
    communicationStyle: "warm_conversational",
    persona: testPersona,
    conversationHistory,
    turnNumber: 1
  }, undefined);
  
  console.log(`Fallback response: "${fallbackResponse.substring(0, 100)}..."`);
  console.log(`✅ Fallback generation: ${fallbackResponse.length > 10 ? "PASSED" : "FAILED"}\n`);
  
  // Test 3: Generate dynamic response (with API key if available)
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("TEST_OPENROUTER_API_KEY");
  
  if (apiKey) {
    console.log("Test 3: Generating dynamic response (with API key)");
    console.log("⏳ Calling OpenRouter API...");
    
    try {
      const dynamicResponse = await generateOnboardingResponse({
        agentName: "TestAgent",
        communicationStyle: "warm_conversational",
        persona: testPersona,
        conversationHistory,
        turnNumber: 1
      }, apiKey);
      
      console.log(`Dynamic response: "${dynamicResponse.substring(0, 100)}..."`);
      console.log(`✅ Dynamic generation: PASSED\n`);
    } catch (error) {
      console.error(`❌ Dynamic generation failed: ${error.message}\n`);
    }
  } else {
    console.log("Test 3: Skipping dynamic response test (no API key provided)");
    console.log("To test dynamic responses, set OPENROUTER_API_KEY environment variable\n");
  }
  
  // Test 4: Extract conversation insights
  console.log("Test 4: Extracting conversation insights");
  const extendedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: "I'm working on migrating our monolithic app to microservices" },
    { role: "agent" as const, content: "That sounds like a significant undertaking! What are the main challenges?" },
    { role: "user" as const, content: "Balancing technical debt reduction with new feature development" }
  ];
  
  const insights = extractConversationInsights(extendedHistory, testPersona);
  
  console.log("Extracted insights:");
  console.log(`- Narrative length: ${insights.narrative.length} chars`);
  console.log(`- Current focus items: ${insights.currentFocus.length}`);
  console.log(`- Seeking connections: ${insights.seekingConnections.length}`);
  console.log(`- Offering expertise: ${insights.offeringExpertise.length}`);
  console.log(`✅ Insight extraction: ${insights.narrative.length > 50 ? "PASSED" : "FAILED"}\n`);
  
  console.log("✨ All tests completed!");
}

// Run tests
if (import.meta.main) {
  await testDynamicResponse();
}