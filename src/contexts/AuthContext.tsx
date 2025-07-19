import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LocalStorageCache } from '@/lib/cache/local-storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, handle: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();
  
  // Use a simple ref to track if we're currently initializing
  const isInitializingRef = useRef(false);
  const mountedRef = useRef(true);

  // Memoize checkAdminStatus to prevent recreation
  const checkAdminStatus = useCallback(async (authUserId: string) => {
    if (!mountedRef.current) return;
    
    try {
      
      // Otherwise check the database role field
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        // Don't show error for missing users table entry - this is expected for new users
        if (error.code !== 'PGRST116') {
          toast.error('Failed to check admin status');
        }
        setIsAdmin(false);
        return;
      }

      setIsAdmin(userData?.role === 'admin');
    } catch (error) {
      // Only show error if it's not a network issue
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        toast.error('Failed to verify admin privileges');
      }
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    // Prevent concurrent initializations
    if (isInitializingRef.current) {
      console.log('[AuthContext] Already initializing, skipping...');
      return;
    }

    console.log('[AuthContext] Starting initialization...');
    isInitializingRef.current = true;
    mountedRef.current = true;

    let authSubscription: { unsubscribe: () => void } | undefined;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Starting auth initialization...');
        
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        console.log('[AuthContext] getSession response:', { session: !!initialSession, error: !!error });
        
        if (error) {
          console.error('[AuthContext] getSession error:', error);
          // Only show error for unexpected auth errors
          if (error.message && !error.message.includes('refresh_token') && !error.message.includes('JWT')) {
            toast.error('Authentication error. Please sign in again.');
          }
          throw error;
        }
        
        if (!mountedRef.current) return;


        // Set initial state
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Check admin status if we have a user
        if (initialSession?.user) {
          await checkAdminStatus(initialSession.user.id);
        } else {
          setIsAdmin(false);
        }

        // Subscribe to auth changes AFTER initial setup
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            
            if (!mountedRef.current) return;
            
            // Skip if this is the same session to prevent loops
            if (session?.access_token === newSession?.access_token && 
                session?.refresh_token === newSession?.refresh_token) {
              return;
            }
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            // Check admin status for new session
            if (newSession?.user) {
              await checkAdminStatus(newSession.user.id);
            } else {
              setIsAdmin(false);
            }
          }
        );
        
        authSubscription = subscription;
        
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        if (mountedRef.current) {
          // Only show error if it's a critical auth failure
          if (error instanceof Error && error.message && !error.message.includes('refresh_token')) {
            console.error('Auth initialization error:', error);
          }
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        console.log('[AuthContext] Auth initialization complete, mounted:', mountedRef.current);
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          isInitializingRef.current = false;
        }
      }
    };

    // Run initialization
    initializeAuth();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      isInitializingRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Only run once on mount

  const signUp = async (email: string, password: string, handle: string) => {
    const redirectUrl = `${window.location.origin}/onboarding`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          handle: handle
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    
    try {
      // Clear local state immediately to prevent UI delays
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Log the error but continue with logout
        console.warn('Logout error (continuing anyway):', error);
      }
      
      // Clear state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setInitialized(false);
      
      // Clear any localStorage items
      try {
        localStorage.removeItem('supabase.auth.token');
        // Clear all supabase related items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // Clear our custom cache
        LocalStorageCache.clear();
      } catch (e) {
        // Silently ignore localStorage errors
      }
      
      // Clear all React Query caches
      queryClient.clear();
      
      
    } catch (error) {
      // Show error but ensure logout completes
      toast.error('Logout completed with warnings');
      console.error('Error during logout:', error);
    } finally {
      // Ensure we're always in a clean state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setLoading(false);
      setInitialized(true); // Keep initialized true so the app doesn't get stuck
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    initialized
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
