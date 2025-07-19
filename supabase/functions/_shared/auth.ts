import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  aud: string;
  role?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  new_email?: string;
  invited_at?: string;
  action_link?: string;
  created_at: string;
  updated_at?: string;
  is_anonymous?: boolean;
}

export interface DatabaseUser {
  id: string;
  auth_user_id: string;
  handle: string;
  role: 'user' | 'admin' | 'moderator' | 'test';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at?: string;
  updated_at?: string;
  email?: string;
  full_name?: string;
  username?: string;
  timezone?: string;
}

export interface AdminUser extends DatabaseUser {
  role: 'admin';
}

/**
 * Verifies user authentication and returns the authenticated user from auth.users
 */
export async function verifyAuthentication(
  supabase: SupabaseClient,
  authHeader: string
): Promise<{ user: AuthenticatedUser; isAuthenticated: boolean }> {
  try {
    // Extract token from Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error("Authentication error:", error);
      return { user: null as any, isAuthenticated: false };
    }

    console.log("Authenticated user:", user.id);
    
    return { 
      user: user as AuthenticatedUser, 
      isAuthenticated: true 
    };
  } catch (error) {
    console.error("Error verifying user:", error);
    return { user: null as any, isAuthenticated: false };
  }
}

/**
 * Gets user data from the users table for an authenticated user
 */
export async function getUserFromDatabase(
  supabase: SupabaseClient,
  authUserId: string
): Promise<DatabaseUser | null> {
  try {
    console.log("Fetching user data for auth_user_id:", authUserId);

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId);

    if (error) {
      console.error("Error querying users table:", error);
      throw new Error(`Failed to query user data: ${error.message}`);
    }

    console.log(`Found ${userData?.length || 0} user records for auth_user_id:`, authUserId);

    if (!userData || userData.length === 0) {
      console.log("No user record found in users table for this auth user");
      return null;
    }

    if (userData.length > 1) {
      console.warn("Multiple user records found for the same auth_user_id:", userData.length);
      // Return the first one
      return userData[0] as DatabaseUser;
    }

    console.log("Successfully fetched user data for:", userData[0].handle);
    return userData[0] as DatabaseUser;
  } catch (error) {
    console.error("Error in getUserFromDatabase:", error);
    throw error;
  }
}

/**
 * Verifies admin authentication and returns admin user data
 * Compatible with existing admin-api patterns
 */
export async function verifyAdmin(
  supabase: SupabaseClient, 
  authHeader: string
): Promise<{ user: AdminUser; isAdmin: boolean }> {
  try {
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from auth token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!authUser) {
      throw new Error('No authenticated user found');
    }
    
    // Get user data with role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, handle')
      .eq('auth_user_id', authUser.id)
      .single();
      
    if (userError) {
      console.error('User lookup error:', userError);
      // If user not found, check if we should create them (development only)
      if (userError.code === 'PGRST116') {
        throw new Error(`User not found in database. Auth ID: ${authUser.id}, Email: ${authUser.email}. Please ensure user exists in users table.`);
      }
      throw new Error(`Database error: ${userError.message}`);
    }
    
    if (!userData) {
      throw new Error('User data is empty');
    }
    
    const isAdmin = userData.role === 'admin';
    
    return { 
      user: userData as AdminUser, 
      isAdmin 
    };
  } catch (error) {
    console.error('verifyAdmin error:', error);
    throw error;
  }
}

/**
 * Verifies user authentication and returns database user data
 * For internal-api and other user-focused operations
 */
export async function verifyUser(
  supabase: SupabaseClient,
  authHeader: string
): Promise<{ user: AuthenticatedUser; databaseUser: DatabaseUser | null; isAuthenticated: boolean }> {
  try {
    // First verify authentication
    const { user: authUser, isAuthenticated } = await verifyAuthentication(supabase, authHeader);
    
    if (!isAuthenticated || !authUser) {
      return { user: null as any, databaseUser: null, isAuthenticated: false };
    }

    // Then get database user data
    const databaseUser = await getUserFromDatabase(supabase, authUser.id);

    return {
      user: authUser,
      databaseUser,
      isAuthenticated: true
    };
  } catch (error) {
    console.error("Error in verifyUser:", error);
    return { user: null as any, databaseUser: null, isAuthenticated: false };
  }
}