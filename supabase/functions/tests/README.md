# Supabase Functions Testing Framework

A comprehensive testing framework for testing Supabase Edge Functions with proper authentication and database integration.

## Overview

This custom testing framework provides:

- **Authentication Management**: Create test users with different roles (admin, user, test)
- **HTTP Client**: Make authenticated requests to edge functions
- **Database Utilities**: Setup/teardown test data with proper cleanup
- **Test Framework**: Custom assertion library with detailed reporting
- **Test Runner**: CLI tool for running tests with various options

## Architecture

### Core Components

- **TestAuth** (`test-auth.ts`): Creates and manages test users with proper authentication tokens
- **TestClient** (`test-client.ts`): HTTP client for making authenticated requests to functions
- **TestDatabase** (`test-database.ts`): Database utilities for test data management
- **TestFramework** (`test-framework.ts`): Custom test runner with assertions and reporting
- **TestUtils** (`test-utils.ts`): Environment validation, input validation, and utility functions

### Authentication Strategy

The framework solves the authentication challenge by:

1. **Creating Real Users**: Uses Supabase Admin API to create actual auth users
2. **Handling Database Triggers**: Works with `handle_new_user` triggers that auto-create user records
3. **Token Generation**: Signs in users to get valid JWT tokens for authentication
4. **Role Management**: Supports different user roles (admin, user, test)
5. **Automatic Cleanup**: Removes test users and data after tests complete

### Important Discoveries

#### Database Triggers

If your database has a `handle_new_user` trigger that auto-creates user records when auth users are created, the test framework handles this by:

- Not including the handle in user metadata (to avoid conflicts)
- Using UPDATE instead of INSERT to modify the auto-created user record
- Setting the correct role and status on the existing record

#### Lazy Initialization

Test utilities use lazy initialization for Supabase clients to ensure environment variables are set before connection. This prevents issues when test files are imported before environment setup.

#### Response Structure

Admin API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {
    /* actual response data */
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Test assertions should check `response.data.data` for the actual payload.

## Getting Started

### Prerequisites

1. **Supabase CLI**: Install and configure Supabase CLI
2. **Local Supabase**: Run `supabase start` to start local instance
3. **Serve Functions**: Run `supabase functions serve --env-file .env` in a separate terminal
4. **Environment Variables**: Set up `.env.test` or export required variables

### Running Tests

```bash
# Change to the supabase functions test directory
cd supabase/functions/tests

# Clean up any existing test data first
deno run --allow-env --allow-net cleanup-test-users.ts

# Run all tests
deno run --allow-all run-tests.ts

# Run specific test pattern
deno run --allow-all run-tests.ts -p admin

# Run specific test suites
deno run --allow-all run-tests.ts -s admin-api,internal-api

# Run with verbose output
deno run --allow-all run-tests.ts -v

# Get help
deno run --allow-all run-tests.ts --help
```

### Individual Test Files

```bash
# Run a specific test file
deno run --allow-all admin-api.test.ts

# Run internal API tests
deno run --allow-all internal-api.test.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { testFramework } from "./test-framework.ts";
import { TestAuth } from "./test-auth.ts";
import { TestClient } from "./test-client.ts";
import { TestDatabase } from "./test-database.ts";

// Initialize utilities
const testAuth = new TestAuth();
const testClient = new TestClient();
const testDb = new TestDatabase();

// Global setup
testFramework.setGlobalSetup(async () => {
  // Create test users
  const adminUser = await testAuth.createTestUser(
    "admin@test.com",
    "password",
    "admin"
  );
  const regularUser = await testAuth.createTestUser(
    "user@test.com",
    "password",
    "user"
  );
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  await testAuth.cleanupAllTestUsers();
  await testDb.cleanupTestData();
});

// Test suite
testFramework
  .describe("My Function Tests")
  .test("should do something", async (ctx) => {
    const response = await testClient.callAdminApi("someAction", adminUser);

    ctx.assertSuccess(response);
    ctx.assertExists(response.data);
    ctx.assertEquals(response.data.someField, "expected value");
  });
```

### Available Assertions

```typescript
// Basic assertions
ctx.assert(condition, "message");
ctx.assertEquals(actual, expected, "message");
ctx.assertExists(value);
ctx.assertFalse(condition);

// HTTP response assertions
ctx.assertResponse(response, 200); // Check status code
ctx.assertSuccess(response); // Check if response is successful
ctx.assertError(response); // Check if response is an error

// Object/array assertions
ctx.assertHasProperty(obj, "property");
ctx.assertArrayLength(array, 5);

// Logging
ctx.log("Test message");
```

### Making Function Calls

```typescript
// Admin API calls (requires admin user)
const response = await testClient.callAdminApi("getUserStats", adminUser);

// Internal API calls (regular user)
const response = await testClient.callInternalApi("getUserProfile", user);

// Omniscient system calls
const response = await testClient.callOmniscientSystem("getAnalytics", user);

// Generic function calls
const response = await testClient.callFunction("function-name", user, payload);

// Unauthenticated calls (for testing auth failures)
const response = await testClient.callFunctionUnauthenticated(
  "function-name",
  payload
);

// HTTP method helpers
await testClient.get("function-name", user);
await testClient.post("function-name", user, payload);
await testClient.put("function-name", user, payload);
await testClient.delete("function-name", user, payload);
```

### Database Test Data Management

```typescript
// Create test data (automatically registered for cleanup)
const testUser = await testDb.createTestRecord("users", {
  auth_user_id: "test-auth-id",
  handle: "test-user",
  role: "user",
});

// Create multiple records
const testRecords = await testDb.createTestData("conversations", [
  { participants: ["user1", "user2"] },
  { participants: ["user2", "user3"] },
]);

// Get test data
const users = await testDb.getTestData("users", { role: "test" });

// Execute raw SQL
await testDb.executeSql("UPDATE users SET status = $1 WHERE role = $2", [
  "active",
  "test",
]);

// Create specific test data
const config = await testDb.createTestSystemConfig("test_key", "test_value");
const conversation = await testDb.createTestConversation(["user1", "user2"]);
const match = await testDb.createTestMatch(["user1", "user2"]);
```

## Test Organization

### File Naming Convention

- `*.test.ts` - Test files (automatically discovered)
- `test-*.ts` - Utility files
- `run-tests.ts` - Test runner

### Recommended Structure

```
tests/
├── test-auth.ts           # Authentication utilities
├── test-client.ts         # HTTP client for functions
├── test-database.ts       # Database utilities
├── test-framework.ts      # Core test framework
├── test-utils.ts         # Validation and utilities
├── run-tests.ts          # Test runner CLI
├── cleanup-test-users.ts # Cleanup utility
├── admin-api.test.ts     # Admin API tests
├── internal-api.test.ts  # Internal API tests
├── omniscient.test.ts    # Omniscient system tests
└── README.md             # This file
```

## Configuration

### Environment Variables

The test runner automatically sets these for local testing:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
TEST_MODE=true  # Ensures we're in test environment
```

For local development with default Supabase CLI keys:

```bash
# Default local anon key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Default local service role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

### Test Configuration

```typescript
const config = {
  baseUrl: "http://localhost:54321/functions/v1", // Functions endpoint
  timeout: 30000, // Request timeout
  verbose: true, // Detailed logging
  pattern: "admin", // Run tests matching pattern
  suites: ["admin-api", "internal-api"], // Specific test suites
};
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use proper setup/teardown for test data
- Don't rely on state from other tests

### 2. Authentication Testing

- Test both authenticated and unauthenticated scenarios
- Test different user roles and permissions
- Verify proper error responses for auth failures

### 3. Data Management

- Always clean up test data
- Use meaningful test data that reflects real scenarios
- Register all created data for automatic cleanup

### 4. Error Testing

- Test error conditions and edge cases
- Verify proper HTTP status codes
- Test malformed requests and missing parameters

### 5. Performance

- Keep tests focused and fast
- Use parallel execution where possible
- Mock external dependencies when appropriate

## Troubleshooting

### Common Issues

1. **"Database not ready"**

   - Run `supabase start` before running tests
   - Check if all services are running with `supabase status`
   - Ensure environment variables are set before test utility initialization

2. **"Functions not ready"**

   - Ensure functions are being served with `supabase functions serve --env-file .env`
   - Check the functions URL in test configuration
   - The health check uses OPTIONS request to the functions endpoint

3. **Authentication failures**

   - Verify service role key is correct for local instance
   - Check user creation and token generation
   - Remember that JWT tokens are obtained via `signInWithPassword`, not generated

4. **Test data conflicts**

   - Run cleanup script: `deno run --allow-env --allow-net tests/cleanup-test-users.ts`
   - Ensure proper cleanup in teardown functions
   - Use unique identifiers for test data (uses timestamp + random string)

5. **"duplicate key value violates unique constraint"**

   - This often indicates a database trigger creating records
   - Check for `handle_new_user` or similar triggers
   - The framework handles this by updating existing records instead of inserting

6. **"Cannot read properties of undefined (reading 'replace')"**

   - Usually means an expected parameter is undefined
   - Check that test users are properly initialized in global setup
   - Verify the action you're calling exists in the edge function

7. **Response structure mismatches**
   - Admin API wraps responses in `{success, data, timestamp}` structure
   - Access actual data via `response.data.data`
   - Check actual response structure with `ctx.log(JSON.stringify(response.data))`

### Debugging Tests

```bash
# Run with verbose output
deno run --allow-all run-tests.ts -v

# Run specific failing test
deno run --allow-all admin-api.test.ts

# Check Supabase logs
supabase logs
```

## Contributing

When adding new tests:

1. Follow the existing patterns and conventions
2. Include proper setup/teardown for any test data
3. Test both success and error scenarios
4. Add meaningful assertions and error messages
5. Update this README if adding new utilities or patterns

## Examples

See the existing test files for comprehensive examples:

- `admin-api.test.ts` - Admin API testing with role verification
- `internal-api.test.ts` - User API testing with authentication
