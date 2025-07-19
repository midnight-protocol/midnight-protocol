import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { AdminUser } from '../types.ts';

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