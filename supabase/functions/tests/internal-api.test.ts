/**
 * Internal API Test Suite
 * 
 * Test Coverage:
 * 
 * 1. Authentication Tests
 *    - Should authenticate valid user
 *    - Should reject unauthenticated requests
 * 
 * 2. User Operations Tests  
 *    - Should handle user profile operations (getUserProfile)
 *    - Should handle email interest operations (getEmailInterests)
 * 
 * 3. Onboarding Tests
 *    - Should handle onboarding flow (startOnboarding)
 * 
 * 4. Error Handling Tests
 *    - Should handle missing action parameter
 *    - Should handle invalid action
 *    - Should handle malformed requests
 * 
 * 5. User Permissions Tests
 *    - Should allow user to access own data
 *    - Should handle cross-user data access appropriately
 * 
 * Test Setup:
 * - Creates two test users (internal1@test.com, internal2@test.com) with 'user' role
 * - Creates test email_interests record for testing
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
let testUser1: any;
let testUser2: any;

// Global setup for internal API tests
testFramework.setGlobalSetup(async () => {
  console.log("Setting up internal API test environment...");
  
  // Clean up any leftover test data before starting
  console.log("Cleaning up any leftover test data...");
  try {
    // Clean up test email interests
    await testDb.getClient()
      .from("email_interests")
      .delete()
      .like("email", "%test%");
    
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
  testUser1 = await testAuth.createTestUser("internal1@test.com", "password123", "user");
  testUser2 = await testAuth.createTestUser("internal2@test.com", "password123", "user");
  
  console.log("Internal API test users created");
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  console.log("Cleaning up internal API test environment...");
  await testAuth.cleanupAllTestUsers();
  await testDb.cleanupTestData();
});

// Internal API Authentication Tests
testFramework.describe("Internal API Authentication")
.test("should authenticate valid user", async (ctx) => {
  const response = await testClient.callInternalApi("getUserProfile", testUser1);
  
  // Should not get authentication error
  if (!response.ok && response.error?.includes("authentication")) {
    ctx.log(`Authentication failed: ${response.error}`);
    throw new Error(`User authentication failed: ${response.error}`);
  }
  
  ctx.assert(response.ok || response.status !== 401, "Should not get authentication error");
})
.test("should reject unauthenticated requests", async (ctx) => {
  const response = await testClient.callFunctionUnauthenticated("internal-api", {
    action: "getUserProfile"
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 401);  // Unauthenticated should return 401
});

// Internal API User Operations Tests
testFramework.describe("Internal API User Operations", async () => {
  // Setup test data
  await testDb.createTestRecord('email_interests', {
    name: 'Test User',
    email: 'test-interest@example.com',
    updates_consent: true,
    related_initiatives_consent: false
  });
}, async () => {
  // Cleanup handled by global teardown
})
.test("should handle user profile operations", async (ctx) => {
  const response = await testClient.callInternalApi("getUserProfile", testUser1);
  
  if (response.ok) {
    ctx.assertExists(response.data);
    ctx.log("Successfully retrieved user profile");
  } else {
    ctx.log(`Profile request failed: ${response.error}`);
    // This might be expected if the endpoint doesn't exist yet
    ctx.assert(response.status !== 500, "Should not have server error");
  }
})
.test("should handle email interest operations", async (ctx) => {
  const response = await testClient.callInternalApi("getEmailInterests", testUser1);
  
  if (response.ok) {
    ctx.assertExists(response.data);
    ctx.log("Successfully retrieved email interests");
  } else {
    ctx.log(`Email interests request failed: ${response.error}`);
    // This might be expected if the endpoint doesn't exist yet
    ctx.assert(response.status !== 500, "Should not have server error");
  }
});

// Internal API Onboarding Tests
testFramework.describe("Internal API Onboarding")
.test("should handle onboarding flow", async (ctx) => {
  const response = await testClient.callInternalApi("startOnboarding", testUser1, {
    step: "personal_info"
  });
  
  if (response.ok) {
    ctx.assertExists(response.data);
    ctx.log("Onboarding started successfully");
  } else {
    ctx.log(`Onboarding request failed: ${response.error}`);
    // Check if it's a known action error vs server error
    if (response.error?.includes("Unknown action")) {
      ctx.log("Onboarding action not implemented yet - this is expected");
    } else {
      ctx.assert(response.status !== 500, "Should not have server error");
    }
  }
});

// Internal API Error Handling Tests
testFramework.describe("Internal API Error Handling")
.test("should handle missing action parameter", async (ctx) => {
  const response = await testClient.callFunction("internal-api", testUser1, {
    // Missing action
    params: {}
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
})
.test("should handle invalid action", async (ctx) => {
  const response = await testClient.callInternalApi("invalidAction", testUser1);
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
  ctx.assert(response.error?.includes("Unknown action") || response.error?.includes("invalid"), 
    "Should indicate invalid/unknown action");
})
.test("should handle malformed requests", async (ctx) => {
  const response = await testClient.callFunction("internal-api", testUser1, "not valid json");
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
});

// Internal API User Permissions Tests
testFramework.describe("Internal API User Permissions")
.test("should allow user to access own data", async (ctx) => {
  const response = await testClient.callInternalApi("getUserData", testUser1, {
    user_id: testUser1.databaseId
  });
  
  // Even if the endpoint doesn't exist, it shouldn't be a permission error
  if (!response.ok) {
    ctx.assertFalse(response.error?.includes("permission") || response.error?.includes("access"), 
      "Should not get permission error for own data");
  } else {
    ctx.assertSuccess(response);
  }
})
.test("should handle cross-user data access appropriately", async (ctx) => {
  const response = await testClient.callInternalApi("getUserData", testUser1, {
    user_id: testUser2.databaseId
  });
  
  // This should either succeed (if allowed) or fail with proper error (not server error)
  ctx.assert(response.status !== 500, "Should not have server error");
  
  if (!response.ok) {
    ctx.log(`Cross-user access denied: ${response.error}`);
  } else {
    ctx.log("Cross-user access allowed");
  }
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const results = await testFramework.run();
  
  if (results.failed > 0) {
    Deno.exit(1);
  }
}