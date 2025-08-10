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

### Authentication Strategy

The framework solves the authentication challenge by:

1. **Creating Real Users**: Uses Supabase Admin API to create actual auth users
2. **Database Records**: Creates corresponding records in your `users` table
3. **Token Generation**: Generates valid JWT tokens for authentication
4. **Role Management**: Supports different user roles (admin, user, test)
5. **Automatic Cleanup**: Removes test users and data after tests complete

## Getting Started

### Prerequisites

1. **Supabase CLI**: Install and configure Supabase CLI
2. **Local Supabase**: Run `supabase start` to start local instance
3. **Environment**: Ensure functions are served locally

### Running Tests

```bash
# Run all tests
deno run --allow-all tests/run-tests.ts

# Run specific test pattern
deno run --allow-all tests/run-tests.ts -p admin

# Run specific test suites
deno run --allow-all tests/run-tests.ts -s admin-api,internal-api

# Run with verbose output
deno run --allow-all tests/run-tests.ts -v

# Get help
deno run --allow-all tests/run-tests.ts --help
```

### Individual Test Files

```bash
# Run a specific test file
deno run --allow-all tests/admin-api.test.ts

# Run internal API tests
deno run --allow-all tests/internal-api.test.ts
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
  const adminUser = await testAuth.createTestUser("admin@test.com", "password", "admin");
  const regularUser = await testAuth.createTestUser("user@test.com", "password", "user");
});

// Global teardown
testFramework.setGlobalTeardown(async () => {
  await testAuth.cleanupAllTestUsers();
  await testDb.cleanupTestData();
});

// Test suite
testFramework.describe("My Function Tests")
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
ctx.assertResponse(response, 200);     // Check status code
ctx.assertSuccess(response);           // Check if response is successful
ctx.assertError(response);             // Check if response is an error

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
const response = await testClient.callFunctionUnauthenticated("function-name", payload);

// HTTP method helpers
await testClient.get("function-name", user);
await testClient.post("function-name", user, payload);
await testClient.put("function-name", user, payload);
await testClient.delete("function-name", user, payload);
```

### Database Test Data Management

```typescript
// Create test data (automatically registered for cleanup)
const testUser = await testDb.createTestRecord('users', {
  auth_user_id: 'test-auth-id',
  handle: 'test-user',
  role: 'user'
});

// Create multiple records
const testRecords = await testDb.createTestData('conversations', [
  { participants: ['user1', 'user2'] },
  { participants: ['user2', 'user3'] }
]);

// Get test data
const users = await testDb.getTestData('users', { role: 'test' });

// Execute raw SQL
await testDb.executeSql('UPDATE users SET status = $1 WHERE role = $2', ['active', 'test']);

// Create specific test data
const config = await testDb.createTestSystemConfig('test_key', 'test_value');
const conversation = await testDb.createTestConversation(['user1', 'user2']);
const match = await testDb.createTestMatch(['user1', 'user2']);
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
├── run-tests.ts          # Test runner CLI
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
```

### Test Configuration

```typescript
const config = {
  baseUrl: 'http://localhost:54321/functions/v1',  // Functions endpoint
  timeout: 30000,                                   // Request timeout
  verbose: true,                                    // Detailed logging
  pattern: 'admin',                                 // Run tests matching pattern
  suites: ['admin-api', 'internal-api']            // Specific test suites
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

2. **"Functions not ready"**
   - Ensure functions are being served with `supabase functions serve`
   - Check the functions URL in test configuration

3. **Authentication failures**
   - Verify service role key is correct for local instance
   - Check user creation and token generation

4. **Test data conflicts**
   - Ensure proper cleanup in teardown functions
   - Use unique identifiers for test data

### Debugging Tests

```bash
# Run with verbose output
deno run --allow-all tests/run-tests.ts -v

# Run specific failing test
deno run --allow-all tests/admin-api.test.ts

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