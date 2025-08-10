#!/usr/bin/env -S deno run --allow-env --allow-net

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  { auth: { persistSession: false } }
);

console.log("🧹 Cleaning up test users...");

// Clean database users
const { data: dbUsers, error: dbError } = await supabase
  .from('users')
  .select('*')
  .like('handle', '%test%');

console.log(`Found ${dbUsers?.length || 0} test users in database`);

if (dbUsers && dbUsers.length > 0) {
  const { error } = await supabase
    .from('users')
    .delete()
    .like('handle', '%test%');
  
  if (error) {
    console.error("Error deleting database users:", error);
  } else {
    console.log("✅ Deleted database test users");
  }
}

// Clean auth users
const { data: authData, error: listError } = await supabase.auth.admin.listUsers();

if (listError) {
  console.error("Error listing auth users:", listError);
} else {
  const testAuthUsers = authData.users.filter(u => 
    u.email?.includes('test.com') || 
    u.email?.includes('test@') ||
    u.user_metadata?.handle?.includes('test')
  );
  
  console.log(`Found ${testAuthUsers.length} test auth users`);
  
  for (const user of testAuthUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`Failed to delete auth user ${user.email}:`, error);
    } else {
      console.log(`✅ Deleted auth user: ${user.email}`);
    }
  }
}

console.log("🎉 Cleanup complete!");