# Test User Management Implementation Plan

## Overview
This document outlines the complete implementation plan for:
1. Refactoring the User Management tab from AdminDashboard.tsx into its own component
2. Implementing bulk test user creation and management functionality

## Phase 1: Database Schema Update

### 1.1 Update User Role Constraint
Create a new migration to add 'test' as a valid role in the users table.

**Migration SQL:**
```sql
-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;

-- Add new constraint including 'test' role
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'moderator'::text, 'test'::text]));

-- Create index for efficient test user queries
CREATE INDEX idx_users_test_role ON users(role) WHERE role = 'test';
```

## Phase 2: Backend Implementation

### 2.1 Update Edge Function Actions (supabase/functions/admin-api/actions/users.ts)

Add the following functions:

#### createTestUsers Function
```typescript
export async function createTestUsers(
  supabase: SupabaseClient,
  params: { count?: number },
  user?: AdminUser
) {
  const { count = 10 } = params;
  
  if (count < 1 || count > 100) {
    throw new Error('Count must be between 1 and 100');
  }

  const testUsers = [];
  const timestamp = Date.now();
  
  // Generate test users
  for (let i = 0; i < count; i++) {
    const randomId = Math.floor(Math.random() * 1000000);
    testUsers.push({
      handle: `test_user_${randomId}`,
      role: 'test',
      status: 'APPROVED',
      timezone: 'America/Los_Angeles',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Bulk insert
  const { data, error } = await supabase
    .from('users')
    .insert(testUsers)
    .select();

  if (error) {
    throw new Error(`Failed to create test users: ${error.message}`);
  }

  return {
    created: data.length,
    users: data
  };
}
```

#### deleteAllTestUsers Function
```typescript
export async function deleteAllTestUsers(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  // First get count of test users
  const { count } = await supabase
    .from('users')
    .select('count')
    .eq('role', 'test')
    .single();

  if (!count || count === 0) {
    return {
      deleted: 0,
      message: 'No test users found'
    };
  }

  // Delete all test users
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('role', 'test');

  if (error) {
    throw new Error(`Failed to delete test users: ${error.message}`);
  }

  return {
    deleted: count,
    message: `Successfully deleted ${count} test users`
  };
}
```

#### getTestUsers Function
```typescript
export async function getTestUsers(
  supabase: SupabaseClient,
  params: { limit?: number, offset?: number },
  user?: AdminUser
) {
  const { limit = 50, offset = 0 } = params;

  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('role', 'test')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch test users: ${error.message}`);
  }

  return {
    users: data || [],
    total: count || 0,
    limit,
    offset
  };
}
```

### 2.2 Update Edge Function Index (supabase/functions/admin-api/index.ts)

Add the new functions to the actions map:
```typescript
import {
  // ... existing imports
  createTestUsers,
  deleteAllTestUsers,
  getTestUsers,
} from "./actions/users.ts";

const actions: Record<string, Function> = {
  // ... existing actions
  
  // Test User Management
  createTestUsers,
  deleteAllTestUsers,
  getTestUsers,
};
```

## Phase 3: Frontend Service Layer

### 3.1 Update Admin API Service (src/services/admin-api.service.ts)

Add the following methods:

```typescript
// Test User Management
async createTestUsers(count: number = 10): Promise<{
  created: number;
  users: any[];
}> {
  return this.callAdminAPI("createTestUsers", { count });
}

async deleteAllTestUsers(): Promise<{
  deleted: number;
  message: string;
}> {
  return this.callAdminAPI("deleteAllTestUsers");
}

async getTestUsers(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  users: any[];
  total: number;
  limit: number;
  offset: number;
}> {
  return this.callAdminAPI("getTestUsers", params || {});
}
```

## Phase 4: Frontend Component Refactoring

### 4.1 Extract User Management Tab Component

Create new file: `src/components/admin/UserManagementPanel.tsx`

This component will contain:
- All state related to user management
- User stats cards
- Pending users table
- User detail modal
- Integration with the existing UserManagementTable component
- Test user management button

**Component Structure:**
```typescript
import React, { useState, useEffect } from "react";
// ... imports

interface UserManagementPanelProps {
  // Props passed from AdminDashboard
  allUsers: User[];
  usersLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  allUsers,
  usersLoading,
  hasMore,
  onLoadMore,
  onRefresh,
}) => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ /* ... */ });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showTestUserModal, setShowTestUserModal] = useState(false);

  // All the user management logic from AdminDashboard
  // ...

  return (
    <>
      {/* Stats Cards */}
      {/* Pending Users Table */}
      {/* Test User Management Button */}
      <Button onClick={() => setShowTestUserModal(true)}>
        Manage Test Users
      </Button>
      {/* User Management Table */}
      {/* User Detail Modal */}
      {/* Test User Management Modal */}
      {showTestUserModal && (
        <TestUserManagementModal
          open={showTestUserModal}
          onClose={() => setShowTestUserModal(false)}
          onUsersCreated={onRefresh}
        />
      )}
    </>
  );
};
```

### 4.2 Create Test User Management Modal

Create new file: `src/components/admin/TestUserManagementModal.tsx`

**Component Features:**
- Input field for number of users to create (min: 1, max: 100, default: 10)
- Create Test Users button
- Delete All Test Users button with confirmation dialog
- List of recently created test users
- Loading states for all operations
- Success/error notifications

**Component Structure:**
```typescript
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// ... other imports

interface TestUserManagementModalProps {
  open: boolean;
  onClose: () => void;
  onUsersCreated: () => void;
}

export const TestUserManagementModal: React.FC<TestUserManagementModalProps> = ({
  open,
  onClose,
  onUsersCreated,
}) => {
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [testUsers, setTestUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch test users on mount
  useEffect(() => {
    if (open) {
      fetchTestUsers();
    }
  }, [open]);

  const fetchTestUsers = async () => {
    try {
      const result = await adminAPIService.getTestUsers({ limit: 20 });
      setTestUsers(result.users);
    } catch (error) {
      toast.error("Failed to load test users");
    }
  };

  const handleCreateUsers = async () => {
    setLoading(true);
    try {
      const result = await adminAPIService.createTestUsers(count);
      toast.success(`Created ${result.created} test users`);
      await fetchTestUsers();
      onUsersCreated(); // Refresh parent data
    } catch (error) {
      toast.error("Failed to create test users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    setLoading(true);
    try {
      const result = await adminAPIService.deleteAllTestUsers();
      toast.success(result.message);
      setTestUsers([]);
      onUsersCreated(); // Refresh parent data
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error("Failed to delete test users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test User Management</DialogTitle>
            <DialogDescription>
              Create and manage test users for development and testing purposes.
            </DialogDescription>
          </DialogHeader>

          {/* Create Test Users Section */}
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="user-count">Number of users to create</Label>
                <Input
                  id="user-count"
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                />
              </div>
              <Button
                onClick={handleCreateUsers}
                disabled={loading}
                className="bg-terminal-green text-terminal-bg"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  "Create Test Users"
                )}
              </Button>
            </div>

            {/* Delete All Button */}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || testUsers.length === 0}
              >
                Delete All Test Users ({testUsers.length})
              </Button>
            </div>

            {/* Test Users List */}
            <div className="border rounded-lg p-4">
              <h4 className="font-mono text-terminal-green mb-3">
                Recent Test Users
              </h4>
              {testUsers.length === 0 ? (
                <p className="text-terminal-text-muted text-center py-4">
                  No test users found
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center p-2 bg-terminal-bg/30 rounded"
                    >
                      <span className="font-mono">@{user.handle}</span>
                      <span className="text-terminal-text-muted text-sm">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Test Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {testUsers.length} test users.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllUsers}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
```

### 4.3 Update AdminDashboard.tsx

1. Import the new UserManagementPanel component
2. Replace the entire User Management TabsContent with:
```typescript
<TabsContent value="users" className="space-y-6">
  <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
    <UserManagementPanel
      allUsers={allUsers}
      usersLoading={usersLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onRefresh={refreshUsers}
    />
  </Suspense>
</TabsContent>
```
3. Remove all user management related state and functions from AdminDashboard

## Phase 5: Testing Plan

### 5.1 Backend Testing
1. Test constraint update migration
2. Test createTestUsers with various counts (1, 10, 100, edge cases)
3. Test deleteAllTestUsers with no users and with users
4. Test getTestUsers pagination
5. Verify admin-only access

### 5.2 Frontend Testing
1. Test UserManagementPanel extraction works correctly
2. Test TestUserManagementModal:
   - Creating users with different counts
   - Delete confirmation flow
   - Loading states
   - Error handling
   - Auto-refresh of user lists
3. Test integration between components

### 5.3 End-to-End Testing
1. Create test users and verify they appear in the main user list
2. Verify test users have correct role and status
3. Test bulk operations don't affect test users unintentionally
4. Verify cleanup works properly

## Implementation Order

1. **Database Migration** - Update role constraint
2. **Backend Functions** - Implement edge function actions
3. **Service Layer** - Update admin-api.service.ts
4. **Component Extraction** - Create UserManagementPanel component
5. **Test User Modal** - Create TestUserManagementModal component
6. **Integration** - Update AdminDashboard.tsx
7. **Testing** - Comprehensive testing of all features

## Security Considerations

1. **Admin-Only Access**: All test user operations require admin role
2. **Rate Limiting**: Consider adding rate limits for bulk operations
3. **Audit Trail**: All operations are logged via the existing activity logging
4. **Validation**: Strict validation on user count (1-100)
5. **No Auth Users**: Test users are database-only, no auth accounts created

## Future Enhancements

1. **Test Data Generation**: Add ability to generate realistic test data (stories, profiles)
2. **Bulk Operations**: Select and delete specific test users
3. **Export**: Export test user data for analysis
4. **Templates**: Save test user templates for consistent testing
5. **Automated Testing**: Integration with automated test suites