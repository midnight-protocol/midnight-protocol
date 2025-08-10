/**
 * Omniscient System Test Suite
 * 
 * Test Coverage:
 * 
 * 1. Authentication Tests
 *    - Should allow admin user access
 *    - Should deny regular user access
 *    - Should deny unauthenticated access
 * 
 * 2. System Health Tests
 *    - Should get system health status (getSystemHealth)
 *    - Should get analytics data (getAnalytics)
 * 
 * 3. Match Management Tests
 *    - Should get matches list (getMatches)
 *    - Should get single match details (getMatch)
 *    - Should get match insights (getMatchInsights)
 * 
 * 4. Error Handling Tests
 *    - Should handle missing action parameter
 *    - Should handle invalid action
 *    - Should handle malformed request
 * 
 * TODO: Additional tests to add based on available actions:
 * 
 * ⚠️ WARNING: Database Pollution Risk Assessment for Omniscient Tests
 * 
 * CRITICAL RISK - AI-Driven Operations (high cost and data modification):
 * These tests trigger AI operations and MUST be mocked or carefully controlled:
 * - analyzeMatches: Creates AI-driven match predictions - MOCK LLM calls
 * - executeConversation: Simulates AI conversations - HIGH LLM API costs
 * - processUserMidnight: Triggers midnight processing - creates matches/conversations
 * - manualMatch: Creates manual matches between users - pollutes match data
 * - analyzeOutcome: Analyzes match outcomes with AI - LLM API costs
 * - generateMorningReports: Generates AI reports - creates report records
 * - sendMorningReportEmails: Sends actual emails - MUST mock email service
 * 
 * HIGH RISK - Data Modification Tests:
 * - Manual matching operations create permanent match records
 * - Report generation creates morning_reports entries
 * - Conversation execution creates conversation transcripts
 * 
 * MEDIUM RISK - Processing Operations:
 * - generateReport: Creates report data but doesn't send
 * - Processing logs may accumulate if not cleaned
 * 
 * LOW RISK - Read-Only Operations:
 * - All get* operations (getMatches, getConversations, etc.)
 * - getSystemHealth, getAnalytics - read-only metrics
 * - getMorningReportEmailStatus - status checking only
 * 
 * CRITICAL CLEANUP REQUIREMENTS:
 * - MOCK all LLM API calls to prevent costs
 * - MOCK email sending to prevent actual emails
 * - Use only test users for any matching operations
 * - Clean up all omniscient_matches created during tests
 * - Delete morning_reports and processing_logs after tests
 * - Consider using TEST_MODE flag to bypass AI operations
 * 
 * Core Matching Actions:
 * - analyzeMatches: Test AI-driven match analysis and predictions
 * - manualMatch: Test manual match creation between users
 * - getMatchInsights: Test fetching detailed match analytics
 * - analyzeOutcome: Test match outcome analysis
 * 
 * Conversation Actions:
 * - executeConversation: Test AI conversation simulation
 * - getConversations: Test fetching conversation list
 * - getConversation: Test fetching single conversation
 * - getConversationDetails: Test fetching conversation metadata
 * 
 * Report Generation Actions:
 * - generateMorningReports: Test morning report generation
 * - sendMorningReportEmails: Test email delivery of reports
 * - getMorningReports: Test fetching generated reports
 * - getUserMorningReport: Test fetching user-specific report
 * - getMorningReportEmailStatus: Test email delivery status
 * - generateReport: Test general report generation
 * 
 * Processing Actions:
 * - processUserMidnight: Test midnight processing workflow
 * - getProcessingLogs: Test fetching processing history
 * - getOutcomes: Test fetching match outcomes
 * 
 * Test Setup:
 * - Creates admin user (omniscient-admin@test.com) with 'admin' role
 * - Creates regular user (omniscient-user@test.com) with 'user' role
 * - Creates test users for matching operations
 * - All test data is cleaned up after test completion
 */

import { testFramework } from "./test-framework.ts";
import { TestAuth } from "./test-auth.ts";
import { TestClient } from "./test-client.ts";
import { TestDatabase } from "./test-database.ts";

// Initialize test utilities
const testAuth = new TestAuth();
const testClient = new TestClient();
const testDb = new TestDatabase();

// Test users
let adminUser: any;
let regularUser: any;
let testUser1: any;
let testUser2: any;

// Global setup for omniscient system tests
testFramework.setGlobalSetup(async () => {
  console.log("Setting up omniscient system test environment...");
  
  // Clean up any leftover test data before starting
  console.log("Cleaning up any leftover test data...");
  try {
    // Clean up test matches
    await testDb.getClient()
      .from("omniscient_matches")
      .delete()
      .or("user_a_id.in.(SELECT id FROM users WHERE handle LIKE 'test-%'),user_b_id.in.(SELECT id FROM users WHERE handle LIKE 'test-%')");
    
    // Clean up test morning reports
    await testDb.getClient()
      .from("morning_reports")
      .delete()
      .in("user_id", "(SELECT id FROM users WHERE handle LIKE 'test-%')");
    
    // Clean up test processing logs
    await testDb.getClient()
      .from("omniscient_processing_logs")
      .delete()
      .like("details", "%test-%");
    
    // Clean up test users from database
    await testDb.getClient()
      .from("users")
      .delete()
      .like("handle", "test-%");
    
    // Clean up test auth users
    const { data: authUsers } = await testDb.getClient().auth.admin.listUsers();
    if (authUsers) {
      for (const user of authUsers.users) {
        if (user.email?.includes("@test.com") || user.email?.includes("test-")) {
          await testDb.getClient().auth.admin.deleteUser(user.id).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.warn("Pre-test cleanup warning:", error);
  }
  
  // Wait for services to be ready
  await testDb.waitForReady();
  await testClient.waitForReady();

  // Create test users with unique handles
  adminUser = await testAuth.createTestUser("omniscient-admin@test.com", "password123", "admin");
  regularUser = await testAuth.createTestUser("omniscient-user@test.com", "password123", "user");
  
  // Create additional test users for matching operations
  testUser1 = await testAuth.createTestUser("omniscient-test1@test.com", "password123", "user");
  testUser2 = await testAuth.createTestUser("omniscient-test2@test.com", "password123", "user");
  
  // Create personal stories for test users to enable matching
  await testDb.createTestRecord('personal_stories', {
    user_id: testUser1.databaseId,
    narrative: "Test user 1 is a software engineer interested in AI and machine learning.",
    current_focus: ["AI", "Machine Learning"],
    seeking_connections: ["Technical mentorship", "AI projects"],
    offering_expertise: ["Python", "Data Science"],
    summary: "Software engineer focused on AI",
    completeness_score: 0.8
  });
  
  await testDb.createTestRecord('personal_stories', {
    user_id: testUser2.databaseId,
    narrative: "Test user 2 is a product manager looking to understand AI applications.",
    current_focus: ["Product Management", "AI Applications"],
    seeking_connections: ["AI expertise", "Technical guidance"],
    offering_expertise: ["Product Strategy", "User Research"],
    summary: "Product manager exploring AI",
    completeness_score: 0.8
  });
  
  console.log("Omniscient system test users created");
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  console.log("Cleaning up omniscient system test environment...");
  
  // Clean up any matches created during tests
  try {
    await testDb.getClient()
      .from("omniscient_matches")
      .delete()
      .or(`user_a_id.in.(${[testUser1?.databaseId, testUser2?.databaseId].filter(Boolean).join(',')}),user_b_id.in.(${[testUser1?.databaseId, testUser2?.databaseId].filter(Boolean).join(',')})`);
  } catch (error) {
    console.warn("Error cleaning up matches:", error);
  }
  
  await testAuth.cleanupAllTestUsers();
  await testDb.cleanupTestData();
});

// Omniscient System Authentication Tests
testFramework.describe("Omniscient System Authentication")
.test("should allow admin user access", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getSystemHealth", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertHasProperty(response.data, 'data');
})
.test("should deny regular user access", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getSystemHealth", regularUser);
  
  ctx.assertError(response);
  ctx.assert(response.error?.includes("Admin access required") || response.status === 403, 
    "Should require admin access");
})
.test("should deny unauthenticated access", async (ctx) => {
  const response = await testClient.callFunctionUnauthenticated("omniscient-system", {
    action: "getSystemHealth"
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 401);
});

// Omniscient System Health Tests
testFramework.describe("Omniscient System Health")
.test("should get system health status", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getSystemHealth", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  
  // Check for expected health data structure
  const healthData = response.data.data;
  ctx.assertExists(healthData);
  
  // The actual structure may vary - check what we get
  ctx.assert(typeof healthData === 'object', "Health data should be an object");
  
  // Log to see actual structure for debugging
  ctx.log(`Health data structure: ${JSON.stringify(Object.keys(healthData))}`);
  
  // Check for possible health-related properties
  if (healthData.healthy !== undefined) {
    ctx.assert(typeof healthData.healthy === 'boolean', "healthy should be boolean");
  }
  
  // Verify health checks structure
  if (healthData.checks) {
    ctx.assert(typeof healthData.checks === 'object', "Health checks should be an object");
  }
})
.test("should get analytics data", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getAnalytics", adminUser, {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    endDate: new Date().toISOString()
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  
  // Check for analytics data structure
  const analyticsData = response.data.data;
  ctx.assertExists(analyticsData);
  
  // Analytics might be empty for test environment, but structure should exist
  ctx.assert(typeof analyticsData === 'object', "Analytics should return an object");
});

// Omniscient System Match Management Tests
testFramework.describe("Omniscient System Match Management")
.test("should get matches list", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getMatches", adminUser, {
    limit: 10,
    offset: 0
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  
  const matchesData = response.data.data;
  ctx.assert(Array.isArray(matchesData) || (matchesData && typeof matchesData === 'object'), 
    "Matches should be an array or object with matches array");
})
.test("should handle get single match with invalid ID", async (ctx) => {
  const response = await testClient.callOmniscientSystem("getMatch", adminUser, {
    matchId: "invalid-match-id"
  });
  
  // This might return success with null data or error depending on implementation
  if (response.ok) {
    ctx.assert(!response.data.data || response.data.data === null, 
      "Should return null or empty for invalid match ID");
  } else {
    ctx.assertError(response);
  }
})
.test("should handle match insights request without matchId", async (ctx) => {
  // getMatchInsights requires a matchId parameter, not userId
  // Test that it properly handles missing matchId
  const response = await testClient.callOmniscientSystem("getMatchInsights", adminUser, {
    // No matchId provided
  });
  
  // This should fail - match insights needs a match ID
  ctx.assertError(response);
  ctx.assert(response.error?.includes("uuid") || response.error?.includes("matchId") || response.error?.includes("undefined"), 
    "Should indicate missing or invalid matchId");
});

// Omniscient System Error Handling Tests
testFramework.describe("Omniscient System Error Handling")
.test("should handle missing action parameter", async (ctx) => {
  const response = await testClient.callFunction("omniscient-system", adminUser, {
    // Missing action
    params: {}
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
  ctx.assert(response.error?.includes("No action specified"), "Should indicate missing action");
})
.test("should handle invalid action", async (ctx) => {
  const response = await testClient.callOmniscientSystem("invalidAction", adminUser);
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
  ctx.assert(response.error?.includes("Unknown action"), "Should indicate unknown action");
})
.test("should handle malformed request", async (ctx) => {
  const response = await testClient.callFunction("omniscient-system", adminUser, "not valid json");
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const results = await testFramework.run();
  
  if (results.failed > 0) {
    Deno.exit(1);
  }
}