import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// In Lovable, these are injected automatically when a Supabase project is connected
// For local development, use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Client] Initializing with URL:', supabaseUrl ? 'URL present' : 'URL missing');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please ensure your Supabase project is connected in Lovable.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);