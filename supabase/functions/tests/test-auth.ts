import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createServiceRoleClient } from "../_shared/supabase-client.ts";
import { validateInput, ValidationSchema, withTimeout, generateTestId } from "./test-utils.ts";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'test';
  handle: string;
  authToken?: string;
  databaseId?: string;
}

export class TestAuth {
  private serviceRoleClient: SupabaseClient | null = null;
  private testUsers: Map<string, TestUser> = new Map();
  
  constructor() {
    // Lazy initialization to allow environment variables to be set
  }
  
  private getClient(): SupabaseClient {
    if (!this.serviceRoleClient) {
      this.serviceRoleClient = createServiceRoleClient();
    }
    return this.serviceRoleClient;
  }

  /**
   * Creates a test user with authentication and database records
   */
  async createTestUser(
    email: string, 
    password: string, 
    role: 'admin' | 'user' | 'test' = 'test',
    handle?: string
  ): Promise<TestUser> {
    // Input validation
    const schema: ValidationSchema = {
      email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      password: { type: 'string', required: true, minLength: 6 },
      role: { type: 'string', required: true, enum: ['admin', 'user', 'test'] }
    };
    
    validateInput({ email, password, role }, schema);
    try {
      const userHandle = handle || generateTestId(`test-${role}`);
      console.log(`Attempting to create user with handle: ${userHandle}`);
      
      // 1. Create auth user using service role client
      // Note: We don't include handle in metadata because a trigger auto-creates the user
      const { data: authData, error: authError } = await this.getClient().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          test_user: true  // Mark as test user
        }
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      // 2. Update the auto-created database user record
      // The handle_new_user trigger auto-creates a user, so we need to update it
      const { data: dbUser, error: dbError } = await this.getClient()
        .from('users')
        .update({
          handle: userHandle,
          role,
          status: 'APPROVED'
        })
        .eq('auth_user_id', authData.user.id)
        .select()
        .single();

      if (dbError) {
        console.error(`Database update failed for handle ${userHandle}:`, dbError);
        // Cleanup auth user if database update fails
        console.log(`Cleaning up auth user ${authData.user.id}`);
        const { error: deleteError } = await this.getClient().auth.admin.deleteUser(authData.user.id);
        if (deleteError) {
          console.error(`Failed to cleanup auth user:`, deleteError);
        }
        throw new Error(`Failed to update database user: ${dbError.message}`);
      }

      // 3. Sign in to get real auth token
      const token = await this.signInAndGetToken(email, password);

      const testUser: TestUser = {
        id: authData.user.id,
        email,
        password,
        role,
        handle: userHandle,
        authToken: token,
        databaseId: dbUser.id
      };

      this.testUsers.set(testUser.id, testUser);
      
      console.log(`Created test user: ${userHandle} (${role}) with ID: ${authData.user.id}`);
      return testUser;
      
    } catch (error) {
      console.error("Error creating test user:", error);
      throw error;
    }
  }

  /**
   * Generates a JWT token for a user - simplified approach for testing
   */
  private async generateTokenForUser(userId: string): Promise<string> {
    try {
      // For local testing, we'll use a placeholder token
      // In a real test environment, you should use proper auth flow
      console.warn("⚠️  Using simplified token generation for testing");
      console.warn("For production tests, implement proper authentication flow");
      
      // Get user data to include in token
      const { data: userData, error: userError } = await this.getClient().auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        throw new Error(`Failed to get user data: ${userError?.message}`);
      }

      // For now, return a placeholder that test client can use
      // The actual authentication will happen through signInAndGetToken method
      return `test-token-${userId}`;
      
    } catch (error) {
      console.error("Error generating token:", error);
      throw error;
    }
  }


  /**
   * Alternative approach: Sign in existing user and get real token
   */
  async signInAndGetToken(email: string, password: string): Promise<string> {
    try {
      // Create a regular client (not service role) for sign in
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
      
      const regularClient = new SupabaseClient(supabaseUrl, anonKey);

      const { data, error } = await regularClient.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.session) {
        throw new Error(`Sign in failed: ${error?.message}`);
      }

      return data.session.access_token;
      
    } catch (error) {
      console.error("Error signing in user:", error);
      throw error;
    }
  }

  /**
   * Get test user by ID
   */
  getTestUser(id: string): TestUser | undefined {
    return this.testUsers.get(id);
  }

  /**
   * Get all test users
   */
  getAllTestUsers(): TestUser[] {
    return Array.from(this.testUsers.values());
  }

  /**
   * Clean up a specific test user with proper error handling
   */
  async cleanupTestUser(userId: string): Promise<void> {
    const testUser = this.testUsers.get(userId);
    if (!testUser) {
      console.log(`Test user ${userId} not found in registry`);
      return;
    }

    const errors: string[] = [];

    // Step 1: Delete related data (conversations, matches, etc.)
    // Skip if tables don't exist
    try {
      // Try to delete user's conversations if the table exists
      const { error: convError } = await this.getClient()
        .from('conversations')
        .delete()
        .contains('participants', [userId]);
      
      if (convError && !convError.message.includes('does not exist')) {
        errors.push(`Failed to delete conversations: ${convError.message}`);
      }
    } catch (error) {
      // Only log if it's not a "table doesn't exist" error
      const errorMsg = String(error);
      if (!errorMsg.includes('does not exist')) {
        errors.push(`Error deleting related data: ${error}`);
      }
    }

    // Step 2: Clean up admin_activity_logs if user is admin
    if (testUser.databaseId && testUser.role === 'admin') {
      try {
        const { error } = await this.getClient()
          .from('admin_activity_logs')
          .delete()
          .eq('admin_user_id', testUser.databaseId);
          
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Could not clean up admin_activity_logs: ${error.message}`);
        }
      } catch (error) {
        console.warn(`Error cleaning admin_activity_logs: ${error}`);
      }
    }
    
    // Step 3: Delete database user record
    if (testUser.databaseId) {
      try {
        const { error } = await this.getClient()
          .from('users')
          .delete()
          .eq('id', testUser.databaseId);
          
        if (error) {
          errors.push(`Failed to delete database user: ${error.message}`);
        }
      } catch (error) {
        errors.push(`Error deleting database user: ${error}`);
      }
    }

    // Step 4: Delete auth user (last to avoid orphaned records)
    try {
      const { error } = await this.getClient().auth.admin.deleteUser(userId);
      if (error) {
        errors.push(`Failed to delete auth user: ${error.message}`);
      }
    } catch (error) {
      errors.push(`Error deleting auth user: ${error}`);
    }

    // Remove from registry regardless of errors
    this.testUsers.delete(userId);
    
    if (errors.length > 0) {
      console.error(`Cleanup errors for user ${testUser.handle}:`, errors);
      throw new Error(`Cleanup failed with ${errors.length} errors`);
    } else {
      console.log(`Successfully cleaned up test user: ${testUser.handle}`);
    }
  }

  /**
   * Clean up all test users with proper sequencing
   */
  async cleanupAllTestUsers(): Promise<void> {
    console.log(`Cleaning up ${this.testUsers.size} test users...`);
    
    const errors: Error[] = [];
    
    // Clean up users sequentially to avoid dependency issues
    for (const userId of Array.from(this.testUsers.keys())) {
      try {
        await withTimeout(
          this.cleanupTestUser(userId),
          5000,
          `Cleanup user ${userId}`
        );
      } catch (error) {
        console.error(`Failed to cleanup user ${userId}:`, error);
        errors.push(error as Error);
      }
    }
    
    // Clean up any remaining test users in database
    try {
      const { error } = await this.getClient()
        .from('users')
        .delete()
        .like('handle', 'test-%');
        
      if (error) {
        console.error('Error cleaning up remaining test users:', error);
        errors.push(error);
      }
    } catch (error) {
      console.error('Error during final cleanup:', error);
      errors.push(error as Error);
    }
    
    console.log(`Test user cleanup completed with ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.warn('Cleanup errors:', errors);
    }
  }
}