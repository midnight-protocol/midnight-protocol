import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client"; // singleton client
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LocalStorageCache } from "@/lib/cache/local-storage";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isAdmin: boolean;
  signUp(
    email: string,
    password: string,
    handle: string
  ): Promise<{ error: AuthError | null }>;
  signIn(email: string, password: string): Promise<{ error: AuthError | null }>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /* state */
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  /* externals */
  const queryClient = useQueryClient();

  /* ───────── Check admin role (await OK here) ───────── */
  const checkAdminStatus = useCallback(async (authUserId: string) => {
    try {
      const { data, error } = await supabase // normal DB query
        .from("users")
        .select("role")
        .eq("auth_user_id", authUserId)
        .single();

      if (error) {
        // Ignore missing-row error code PGRST116 for new users
        if (error.code !== "PGRST116")
          toast.error("Failed to check admin status");
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data?.role === "admin");
    } catch (err) {
      if (err instanceof Error && !err.message.includes("Failed to fetch"))
        toast.error("Failed to verify admin privileges");
      setIsAdmin(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  /* ───────── Initialise session once on mount ───────── */
  useEffect(() => {
    const init = async () => {
      // getSession is safe to await outside the auth listener
      const {
        data: { session: initial },
      } = await supabase.auth.getSession();

      setSession(initial);
      setUser(initial?.user ?? null);
    };
    init();

    return () => {};
  }, []);

  /* ───────── Auth listener (NO awaits) ───────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // synchronous updates only
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ───────── When user id changes, check admin role ───────── */
  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    (async () => {
      await checkAdminStatus(user.id);
      if (cancelled) setIsAdmin(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [checkAdminStatus, user?.id]);

  // useEffect(() => {
  //   // Prevent concurrent initializations
  //   if (isInitializingRef.current) {
  //     console.log("[AuthContext] Already initializing, skipping...");
  //     return;
  //   }

  //   console.log("[AuthContext] Starting initialization...");
  //   isInitializingRef.current = true;
  //   mountedRef.current = true;

  //   let authSubscription: { unsubscribe: () => void } | undefined;

  //   const initializeAuth = async () => {
  //     try {
  //       console.log("[AuthContext] Starting auth initialization...");

  //       // Get initial session
  //       const {
  //         data: { session: initialSession },
  //         error,
  //       } = await supabase.auth.getSession();

  //       console.log("[AuthContext] getSession response:", {
  //         session: !!initialSession,
  //         error: !!error,
  //       });

  //       if (error) {
  //         console.error("[AuthContext] getSession error:", error);
  //         // Only show error for unexpected auth errors
  //         if (
  //           error.message &&
  //           !error.message.includes("refresh_token") &&
  //           !error.message.includes("JWT")
  //         ) {
  //           toast.error("Authentication error. Please sign in again.");
  //         }
  //         throw error;
  //       }

  //       if (!mountedRef.current) return;

  //       // Set initial state
  //       setSession(initialSession);
  //       setUser(initialSession?.user ?? null);

  //       // Check admin status if we have a user
  //       if (initialSession?.user) {
  //         await checkAdminStatus(initialSession.user.id);
  //       } else {
  //         setIsAdmin(false);
  //       }

  //       // Subscribe to auth changes AFTER initial setup
  //       const {
  //         data: { subscription },
  //       } = supabase.auth.onAuthStateChange(async (event, newSession) => {
  //         if (!mountedRef.current) return;

  //         // Skip if this is the same session to prevent loops
  //         if (
  //           session?.access_token === newSession?.access_token &&
  //           session?.refresh_token === newSession?.refresh_token
  //         ) {
  //           return;
  //         }

  //         setSession(newSession);
  //         setUser(newSession?.user ?? null);

  //         // Check admin status for new session
  //         if (newSession?.user) {
  //           await checkAdminStatus(newSession.user.id);
  //         } else {
  //           setIsAdmin(false);
  //         }
  //       });

  //       authSubscription = subscription;
  //     } catch (error) {
  //       console.error("[AuthContext] Auth initialization error:", error);
  //       if (mountedRef.current) {
  //         // Only show error if it's a critical auth failure
  //         if (
  //           error instanceof Error &&
  //           error.message &&
  //           !error.message.includes("refresh_token")
  //         ) {
  //           console.error("Auth initialization error:", error);
  //         }
  //         setSession(null);
  //         setUser(null);
  //         setIsAdmin(false);
  //       }
  //     } finally {
  //       console.log(
  //         "[AuthContext] Auth initialization complete, mounted:",
  //         mountedRef.current
  //       );
  //       if (mountedRef.current) {
  //         setLoading(false);
  //         setInitialized(true);
  //         isInitializingRef.current = false;
  //       }
  //     }
  //   };

  //   // Run initialization
  //   initializeAuth();

  //   // Cleanup function
  //   return () => {
  //     mountedRef.current = false;
  //     isInitializingRef.current = false;
  //     if (authSubscription) {
  //       authSubscription.unsubscribe();
  //     }
  //   };
  // }, []); // Only run once on mount

  /* ───────── Auth helpers (unchanged) ───────── */

  const signUp = async (email: string, password: string, handle: string) => {
    const redirectUrl = `${window.location.origin}/onboarding`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { handle } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut(); // ignore returned error – we reset anyway
    } finally {
      queryClient.clear(); // clear React Query cache
      LocalStorageCache.clear(); // custom cache clear
      // reset local state
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      setInitialized(true); // app stays boot‑strapped
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
    initialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
