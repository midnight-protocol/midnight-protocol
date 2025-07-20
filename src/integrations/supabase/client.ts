import { createClient } from "@supabase/supabase-js";

// For local development, use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log(
  "[Supabase Client] Initializing with URL:",
  supabaseUrl ? "URL present" : "URL missing"
);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
