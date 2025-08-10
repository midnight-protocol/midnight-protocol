/**
 * Admin API Test Suite
 * 
 * Test Coverage:
 * 
 * 1. Authentication Tests
 *    - Should allow admin user access
 *    - Should deny regular user admin access  
 *    - Should deny unauthenticated access
 * 
 * 2. User Management Tests
 *    - Should get user stats (getUserStats)
 *    - Should search users (searchUsers)
 *    - Should get user details (getUserDetails)
 * 
 * 3. System Health Tests
 *    - Should get system health (getSystemHealth) - validates database, aiService, emailService, metrics
 *    - Should get alert thresholds (getAlertThresholds) - validates api_response_time, batch_completion_rate
 * 
 * 4. Configuration Tests
 *    - Should get system configs (getSystemConfigs)
 *    - Should update system config (updateSystemConfig)
 * 
 * 5. Error Handling Tests
 *    - Should handle missing action parameter
 *    - Should handle invalid action  
 *    - Should handle malformed request
 * 
 * Test Setup:
 * - Creates admin user (admin@test.com) with 'admin' role
 * - Creates regular user (user@test.com) with 'user' role for permission testing
 * - Creates test user record and system config for testing operations
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

// Global setup
testFramework.setGlobalSetup(async () => {
  console.log("Setting up test environment...");
  
  // Clean up any leftover test data before starting
  console.log("Cleaning up any leftover test data...");
  try {
    // Get test user IDs first
    const { data: testUsers } = await testDb.getClient()
      .from("users")
      .select("id")
      .like("handle", "test-%");
    
    // Clean up admin_activity_logs for test users
    if (testUsers && testUsers.length > 0) {
      await testDb.getClient()
        .from("admin_activity_logs")
        .delete()
        .in("admin_user_id", testUsers.map(u => u.id));
    }
    
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
testFramework.describe("Admin API User Management")
// Note: We use the test users created in global setup instead of creating new ones
.test("should get user stats", async (ctx) => {
  const response = await testClient.callAdminApi("getUserStats", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  // Check nested data structure
  const stats = response.data.data || response.data;
  ctx.assertHasProperty(stats, 'total_users');
  ctx.assertHasProperty(stats, 'active_users');
})
.test("should search users", async (ctx) => {
  const response = await testClient.callAdminApi("searchUsers", adminUser, {
    query: "test-user",
    limit: 10
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  // Check nested data structure
  const users = response.data.data || response.data;
  ctx.assert(Array.isArray(users), "Response should be an array");
})
.test("should get user details", async (ctx) => {
  // Use the regular test user created in global setup
  if (!regularUser || !regularUser.databaseId) {
    ctx.log("Regular user not available for testing");
    ctx.assert(false, "Regular user not initialized properly");
    return;
  }
  
  const response = await testClient.callAdminApi("getUserDetails", adminUser, {
    user_id: regularUser.databaseId
  });
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  const details = response.data.data || response.data;
  ctx.assertHasProperty(details, 'handle');
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
  ctx.assertExists(response.data.data);
  // Check the actual structure returned
  ctx.assertHasProperty(response.data.data, 'database');
  ctx.assertHasProperty(response.data.data, 'aiService');
  ctx.assertHasProperty(response.data.data, 'emailService');
  ctx.assertHasProperty(response.data.data, 'metrics');
})
.test("should get alert thresholds", async (ctx) => {
  const response = await testClient.callAdminApi("getAlertThresholds", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  ctx.assertExists(response.data.data);
  // Alert thresholds returns an object with threshold values
  ctx.assert(typeof response.data.data === 'object', "Alert thresholds should be an object");
  ctx.assertHasProperty(response.data.data, 'api_response_time');
  ctx.assertHasProperty(response.data.data, 'batch_completion_rate');
});

// Admin API Configuration Tests
testFramework.describe("Admin API Configuration", async () => {
  // Create test system config
  await testDb.createTestRecord('system_config', {
    category: 'test',
    config_key: 'test_config_key',
    config_value: { value: 'test_value' },
    description: 'Test configuration'
  });
}, async () => {
  // Cleanup handled by global teardown
})
.test("should get system configs", async (ctx) => {
  const response = await testClient.callAdminApi("getSystemConfigs", adminUser);
  
  ctx.assertSuccess(response);
  ctx.assertExists(response.data);
  // Check both possible response structures
  const configs = response.data.data || response.data.configs || response.data;
  ctx.assert(Array.isArray(configs) || typeof configs === 'object', "System configs should be an array or object");
})
.test("should update system config", async (ctx) => {
  // First get the config to get its ID
  const getResponse = await testClient.callAdminApi("getSystemConfigs", adminUser, {
    category: "test"
  });
  
  // Find our test config
  const configs = getResponse.data?.test || getResponse.data?.data?.test || [];
  const testConfig = Array.isArray(configs) ? 
    configs.find(c => c.config_key === "test_config_key") :
    Object.values(configs).find((c: any) => c.config_key === "test_config_key");
  
  if (!testConfig) {
    ctx.log("Could not find test config to update");
    ctx.assert(false, "Test config not found");
    return;
  }
  
  const response = await testClient.callAdminApi("updateSystemConfig", adminUser, {
    configId: testConfig.id,
    value: { value: "updated_test_value" }
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