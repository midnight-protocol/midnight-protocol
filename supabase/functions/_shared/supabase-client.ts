import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS and should be used for server-side operations
 * where you need direct database access after verifying authentication
 */
export function createServiceRoleClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a Supabase client with anon key
 * This respects RLS policies and should be used when you want
 * to enforce row-level security
 */
export function createAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}