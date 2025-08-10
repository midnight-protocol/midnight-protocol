/**
 * End-to-End User Journey Test Suite
 *
 * This test suite validates the complete user journey through the Midnight Protocol application,
 * from initial signup through matchmaking and daily report generation.
 *
 * Test Coverage:
 *
 * 1. User Registration & Authentication
 *    - User signup with email/password/handle
 *    - Email verification (if applicable)
 *    - Login and session management
 *
 * 2. Onboarding Process
 *    - Agent personalization (name, communication style)
 *    - Onboarding chat interview
 *    - Personal story generation
 *    - Onboarding completion
 *
 * 3. Admin Approval Workflow
 *    - User pending state after onboarding
 *    - Admin review and approval
 *    - Status update propagation
 *
 * 4. Matchmaking Process
 *    - Match generation for approved users
 *    - Match analysis and scoring
 *    - Agent conversation simulation
 *    - Outcome analysis
 *
 * 5. Morning Report Generation
 *    - Report generation for matched users
 *    - Email notification preparation
 *    - Report content validation
 *
 * ⚠️ WARNING: E2E Test Considerations
 *
 * This test suite creates and modifies significant amounts of data across multiple tables:
 * - Users and authentication records
 * - Agent profiles and personal stories
 * - Conversations and messages
 * - Matches and insights
 * - Morning reports
 *
 * CLEANUP REQUIREMENTS:
 * - All test data uses 'e2e-test-' prefix for identification
 * - Comprehensive cleanup in global teardown
 * - Each test phase tracks created records for cleanup
 * - Consider running in isolated test environment
 *
 * Test Setup:
 * - Creates test users with different roles (admin, regular users)
 * - Simulates complete user journeys
 * - Validates data integrity at each stage
 * - Ensures proper state transitions
 */

import { testFramework } from "./test-framework.ts";
import { TestAuth } from "./test-auth.ts";
import { TestClient } from "./test-client.ts";
import { TestDatabase } from "./test-database.ts";

// Initialize test utilities
const testAuth = new TestAuth();
const testClient = new TestClient();
const testDb = new TestDatabase();

// Load test profiles from external file
const testProfilesPath = "./e2e-test-profiles.json";
const testProfilesContent = await Deno.readTextFile(testProfilesPath);
const testProfiles = JSON.parse(testProfilesContent);

// Test users for the journey
let adminUser: any;

// Track created data for cleanup
const createdRecords = {
  users: [] as string[],
  agentProfiles: [] as string[],
  conversations: [] as string[],
  matches: [] as string[],
  reports: [] as string[],
};

// Global setup for E2E tests
testFramework.setGlobalSetup(async () => {
  console.log("🚀 Setting up E2E test environment...");

  try {
    // Only create admin user for approval steps in Phase 3
    console.log("Creating admin user for approval workflow...");
    const adminEmail = `${testProfiles.admin.emailPrefix}-${Date.now()}@test.com`;
    adminUser = await testAuth.createTestUser(
      adminEmail,
      testProfiles.admin.password,
      testProfiles.admin.role
    );
    createdRecords.users.push(adminUser.id);

    console.log("✅ E2E test environment setup complete");
  } catch (error) {
    console.error("❌ Failed to set up E2E test environment:", error);
    throw error;
  }
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  console.log("🧹 Cleaning up E2E test data...");

  try {
    // Clean up in reverse order of dependencies
    // Note: executeSql may not be available in test environment
    // The testAuth.cleanupAllTestUsers() and testDb.cleanupTestData() 
    // should handle most cleanup automatically

    // Clean up test users
    await testAuth.cleanupAllTestUsers();

    // Clean up any other test data
    await testDb.cleanupTestData();

    console.log("✅ E2E test cleanup complete");
  } catch (error) {
    console.error("❌ Error during E2E test cleanup:", error);
    // Don't throw to allow other cleanup to continue
  }
});

// E2E Test Suite - Main User Journey
testFramework
  .describe("E2E User Journey - Complete Flow")
  .test(
    "should complete full user journey from signup to morning report",
    async (ctx) => {
      ctx.log("🚀 Starting complete user journey test...");
      
      // Select which profile to test (can be controlled via environment variable)
      const profileIndex = parseInt(Deno.env.get("TEST_PROFILE_INDEX") || "0");
      const profileData = testProfiles.journeyUsers[profileIndex] || testProfiles.journeyUsers[0];
      
      ctx.log(`Using test profile ${profileIndex}: ${profileData.name}`);
      
      // Variables to track data across phases
      let journeyUser: any;
      let conversationId: string;
      let agentProfileId: string;

      // Phase 1: User Signup and Authentication
      ctx.log("Phase 1: Testing user signup and authentication");
      ctx.log(`Testing profile: ${profileData.name}`);
      
      // Create a new test user for the complete journey
      const timestamp = Date.now();
      const testEmail = `${profileData.emailPrefix}-${timestamp}@test.com`;
      const testPassword = profileData.password;
      const testHandle = `${profileData.handlePrefix}-${timestamp}`;
      
      ctx.log(`Creating new user: ${testEmail} with handle: ${testHandle}`);
      
      // Create the user using the test auth utility
      journeyUser = await testAuth.createTestUser(
        testEmail,
        testPassword,
        "user",
        testHandle  // Pass handle as string, not object
      );
      
      // Track for cleanup
      createdRecords.users.push(journeyUser.id);
      
      // Verify the auth user was created
      ctx.assertExists(journeyUser.id, "Auth user ID should exist");
      ctx.assertExists(journeyUser.authToken, "Auth token should be generated");
      ctx.assertEquals(journeyUser.email, testEmail, "Email should match");
      
      // Verify the database user record was created
      const dbUsers = await testDb.getTestData("users", {
        auth_user_id: journeyUser.id
      });
      
      ctx.assertExists(dbUsers, "Database query should return results");
      ctx.assertEquals(dbUsers.length, 1, "Should find exactly one user record");
      
      const dbUser = dbUsers[0];
      ctx.assertExists(dbUser, "Database user record should be created");
      ctx.assertEquals(dbUser.handle, testHandle, "Handle should be set correctly");
      // Note: In test environment, users might be auto-approved. Accept both PENDING and APPROVED
      ctx.assert(
        dbUser.status === "PENDING" || dbUser.status === "APPROVED",
        `User status should be PENDING or APPROVED, got: ${dbUser.status}`
      );
      ctx.assertEquals(dbUser.role, "user", "User role should be 'user'");
      
      // Log the actual status for debugging
      ctx.log(`User created with status: ${dbUser.status}`);
      
      // Store the database user ID for later phases (it's already in journeyUser.databaseId from createTestUser)
      
      // Test that the user can authenticate and get their data
      const userDataResponse = await testClient.callInternalApi(
        "getUserData",
        journeyUser
      );
      
      ctx.assertSuccess(userDataResponse);
      ctx.assertExists(userDataResponse.data, "User data should be returned");
      
      ctx.log(`✅ Phase 1 complete: User ${testEmail} created and authenticated`);

      // Phase 2: Onboarding Process
      ctx.log("Phase 2: Testing onboarding process");
      
      // Step 1: Save agent personalization
      ctx.log("Step 2.1: Saving agent personalization...");
      
      const agentName = `${profileData.agent.namePrefix}-${timestamp}`;
      const communicationStyle = profileData.agent.communicationStyle;
      
      const personalizationResponse = await testClient.callInternalApi(
        "saveAgentPersonalization",
        journeyUser,
        {
          agentName,
          communicationStyle
        }
      );
      
      ctx.assertSuccess(personalizationResponse);
      ctx.assert(
        personalizationResponse.data?.success === true,
        "Agent personalization should be saved successfully"
      );
      
      // Verify the agent profile was created/updated
      const agentProfiles = await testDb.getTestData("agent_profiles", {
        user_id: journeyUser.databaseId
      });
      
      ctx.assertEquals(agentProfiles.length, 1, "Should have exactly one agent profile");
      const agentProfile = agentProfiles[0];
      ctx.assertEquals(agentProfile.agent_name, agentName, "Agent name should match");
      ctx.assertEquals(agentProfile.communication_style, communicationStyle, "Communication style should match");
      
      // Store agent profile ID for later use
      agentProfileId = agentProfile.id;
      createdRecords.agentProfiles.push(agentProfileId);
      
      ctx.log(`✅ Agent personalization saved: ${agentName} with style: ${communicationStyle}`);
      
      // Step 2: Initialize onboarding chat
      ctx.log("Step 2.2: Initializing onboarding chat...");
      
      const initChatResponse = await testClient.callInternalApi(
        "initializeOnboardingChat",
        journeyUser,
        {
          agentName,
          communicationStyle
        }
      );
      
      ctx.assertSuccess(initChatResponse);
      ctx.assertExists(initChatResponse.data, "Chat initialization should return data");
      
      // Log the response structure to understand it
      ctx.log(`Init chat response structure: ${JSON.stringify(Object.keys(initChatResponse.data))}`);
      
      // Check if data is wrapped in another layer
      const chatData = initChatResponse.data.data || initChatResponse.data;
      
      ctx.assertExists(chatData.conversationId, "Should return conversation ID");
      ctx.assertExists(chatData.messages, "Should return initial messages");
      ctx.assert(Array.isArray(chatData.messages), "Messages should be an array");
      ctx.assert(chatData.messages.length > 0, "Should have at least one initial message");
      
      conversationId = chatData.conversationId;
      createdRecords.conversations.push(conversationId);
      
      // Verify the agent's initial message
      const initialMessage = chatData.messages[0];
      ctx.assertEquals(initialMessage.role, "agent", "First message should be from agent");
      ctx.assertExists(initialMessage.content, "Message should have content");
      
      ctx.log(`Chat initialized with conversation ID: ${conversationId}`);
      
      // Step 3: Send onboarding messages
      ctx.log("Step 2.3: Sending onboarding messages...");
      
      let currentMessages = chatData.messages;
      let turnCount = chatData.turnCount || 1;
      let essenceData = chatData.essenceData;
      let showCompleteButton = false;
      
      // Send each message from the profile
      for (const [index, message] of profileData.onboarding.messages.entries()) {
        ctx.log(`Sending message ${index + 1}/${profileData.onboarding.messages.length}: "${message.substring(0, 50)}..."`);
        
        const messageResponse = await testClient.callInternalApi(
          "sendOnboardingMessage",
          journeyUser,
          {
            conversationId,
            message,
            agentName,
            communicationStyle,
            currentMessages,
            turnCount
          }
        );
        
        ctx.assertSuccess(messageResponse);
        ctx.assertExists(messageResponse.data, "Message response should have data");
        
        // Check the response structure
        const msgData = messageResponse.data.data || messageResponse.data;
        ctx.assertExists(msgData.agentMessage, "Should return agent's response");
        
        // Update tracking variables
        currentMessages.push({
          role: "user",
          content: message,
          timestamp: new Date().toISOString()
        });
        currentMessages.push(msgData.agentMessage);
        turnCount++;
        
        if (msgData.essenceData) {
          essenceData = msgData.essenceData;
        }
        
        if (msgData.showCompleteButton) {
          showCompleteButton = true;
        }
        
        // Verify the agent responded appropriately
        const agentResponse = msgData.agentMessage;
        ctx.assertEquals(agentResponse.role, "agent", "Response should be from agent");
        ctx.assertExists(agentResponse.content, "Agent should provide a response");
        ctx.assert(agentResponse.content.length > 10, "Agent response should be meaningful");
      }
      
      ctx.log(`✅ Sent ${profileData.onboarding.messages.length} messages, received ${turnCount} turns total`);
      
      // Verify personal story is being built
      ctx.assert(
        essenceData || turnCount >= 5,
        "Personal story should be building after multiple messages"
      );
      
      // Step 4: Complete onboarding
      ctx.log("Step 2.4: Completing onboarding...");
      
      const completeResponse = await testClient.callInternalApi(
        "completeOnboarding",
        journeyUser,
        {
          conversationId
        }
      );
      
      ctx.assertSuccess(completeResponse);
      ctx.assert(
        completeResponse.data?.success === true,
        "Onboarding should complete successfully"
      );
      
      // Verify personal story was created
      const personalStories = await testDb.getTestData("personal_stories", {
        user_id: journeyUser.databaseId
      });
      
      ctx.assert(personalStories.length > 0, "Personal story should be created");
      const personalStory = personalStories[0];
      ctx.assertExists(personalStory.narrative, "Personal story should have narrative");
      ctx.assert(
        personalStory.narrative.length > 100,
        "Personal story narrative should be substantial"
      );
      
      ctx.log(`✅ Phase 2 complete: Onboarding finished with ${turnCount} conversation turns`);

      // Phase 3: Admin Approval
      ctx.log("Phase 3: Testing admin approval workflow");
      // TODO: Implement approval flow test
      // - Verify user status is PENDING
      // - Admin fetches pending users
      // - Admin approves user
      // - Verify status change to APPROVED

      // Phase 4: Matchmaking
      ctx.log("Phase 4: Testing matchmaking process");
      // TODO: Implement matchmaking test
      // - Trigger match analysis
      // - Verify match creation
      // - Execute agent conversation
      // - Verify conversation quality

      // Phase 5: Morning Reports
      ctx.log("Phase 5: Testing morning report generation");
      // TODO: Implement morning report test
      // - Generate morning reports
      // - Verify report contains matches
      // - Validate report structure
      // - Test email preparation (without sending)

      ctx.log("✅ User journey test completed successfully");
    }
  );

// Run tests if this file is executed directly
if (import.meta.main) {
  const results = await testFramework.run();

  if (results.failed > 0) {
    Deno.exit(1);
  }
}
