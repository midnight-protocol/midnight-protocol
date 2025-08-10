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

// Global setup
testFramework.setGlobalSetup(async () => {
  console.log("Setting up test environment...");
  
  // Wait for services to be ready
  const dbReady = await testDb.waitForReady();
  if (!dbReady) {
    throw new Error("Database not ready");
  }
  
  const clientReady = await testClient.waitForReady();
  if (!clientReady) {
    throw new Error("Functions not ready");
  }

  // Create test users with unique handles
  adminUser = await testAuth.createTestUser("admin@test.com", "password123", "admin");
  regularUser = await testAuth.createTestUser("user@test.com", "password123", "user");
  
  console.log("Test users created successfully");
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  console.log("Cleaning up test environment...");
  await testAuth.cleanupAllTestUsers();
  await testDb.cleanupTestData();
});

// Admin API Authentication Tests
testFramework.describe("Admin API Authentication", async () => {
  // Suite setup - no additional setup needed
}, async () => {
  // Suite teardown - no additional cleanup needed
})
.test("should allow admin user access", async (ctx) => {
  ctx.log(`Testing with admin user: ${adminUser?.id}, has token: ${!!adminUser?.authToken}`);
  const response = await testClient.callAdminApi("getUserStats", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertHasProperty(response.data.data, 'total');  // The actual stats are in data.data
})
.test("should deny regular user admin access", async (ctx) => {
  // The test client will throw an error before making the request
  // because it checks the user role client-side
  try {
    await testClient.callAdminApi("getUserStats", regularUser);
    ctx.assert(false, "Should have thrown an error for non-admin user");
  } catch (error) {
    ctx.assert(error.message.includes("admin role"), `Expected admin role error, got: ${error.message}`);
  }
})
.test("should deny unauthenticated access", async (ctx) => {
  const response = await testClient.callFunctionUnauthenticated("admin-api", {
    action: "getUserStats"
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 401);  // Unauthenticated should return 401
});

// Admin API User Management Tests
testFramework.describe("Admin API User Management", async () => {
  // Create some test data for user management tests
  await testDb.createTestRecord('users', {
    auth_user_id: 'test-auth-id-1',
    handle: 'test-user-1',
    role: 'user',
    status: 'APPROVED',
    email: 'testuser1@example.com'
  });
}, async () => {
  // Cleanup will be handled by global teardown
})
.test("should get user stats", async (ctx) => {
  const response = await testClient.callAdminApi("getUserStats", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertHasProperty(response.data, 'total_users');
  ctx.assertHasProperty(response.data, 'active_users');
})
.test("should search users", async (ctx) => {
  const response = await testClient.callAdminApi("searchUsers", adminUser, {
    query: "test-user",
    limit: 10
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assert(Array.isArray(response.data), "Response should be an array");
})
.test("should get user details", async (ctx) => {
  // First, get a user ID to test with
  const searchResponse = await testClient.callAdminApi("searchUsers", adminUser, {
    query: "test-user-1",
    limit: 1
  });
  
  ctx.assertSuccess(searchResponse);
  ctx.assert(searchResponse.data.length > 0, "Should find at least one test user");
  
  const userId = searchResponse.data[0].id;
  const response = await testClient.callAdminApi("getUserDetails", adminUser, {
    user_id: userId
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertHasProperty(response.data, 'handle');
});

// Admin API System Health Tests
testFramework.describe("Admin API System Health", async () => {
  // No additional setup needed
}, async () => {
  // No additional teardown needed
})
.test("should get system health", async (ctx) => {
  const response = await testClient.callAdminApi("getSystemHealth", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertHasProperty(response.data, 'database');
  ctx.assertHasProperty(response.data, 'functions');
})
.test("should get alert thresholds", async (ctx) => {
  const response = await testClient.callAdminApi("getAlertThresholds", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assert(Array.isArray(response.data), "Alert thresholds should be an array");
});

// Admin API Configuration Tests
testFramework.describe("Admin API Configuration", async () => {
  // Create test system config
  await testDb.createTestSystemConfig("test_config_key", "test_value");
}, async () => {
  // Cleanup handled by global teardown
})
.test("should get system configs", async (ctx) => {
  const response = await testClient.callAdminApi("getSystemConfigs", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assert(Array.isArray(response.data), "System configs should be an array");
})
.test("should update system config", async (ctx) => {
  const response = await testClient.callAdminApi("updateSystemConfig", adminUser, {
    key: "test_config_key",
    value: "updated_test_value"
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
});

// Admin API Error Handling Tests
testFramework.describe("Admin API Error Handling", async () => {
  // No additional setup needed
}, async () => {
  // No additional teardown needed
})
.test("should handle missing action", async (ctx) => {
  const response = await testClient.callFunction("admin-api", adminUser, {
    // Missing action parameter
    params: {}
  });
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
})
.test("should handle invalid action", async (ctx) => {
  const response = await testClient.callAdminApi("nonExistentAction", adminUser);
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
  ctx.assert(response.error?.includes("Unknown action"), "Should indicate unknown action");
})
.test("should handle malformed request", async (ctx) => {
  const response = await testClient.callFunction("admin-api", adminUser, "invalid json string");
  
  ctx.assertError(response);
  ctx.assertResponse(response, 400);
});

// Run all tests if this file is executed directly
if (import.meta.main) {
  const results = await testFramework.run();
  
  // Exit with non-zero code if tests failed
  if (results.failed > 0) {
    Deno.exit(1);
  }
}