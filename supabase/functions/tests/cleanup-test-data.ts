#!/usr/bin/env -S deno run --allow-net --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = "http://localhost:54321";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("🧹 Cleaning up test data...");

// Get all test user IDs first
const { data: testUsers } = await supabase
  .from("users")
  .select("id")
  .like("handle", "test-%");

// Clean up admin_activity_logs for test users
if (testUsers && testUsers.length > 0) {
  const { error: logsError } = await supabase
    .from("admin_activity_logs")
    .delete()
    .in("admin_user_id", testUsers.map(u => u.id));
  
  console.log("Cleaned up admin_activity_logs:", logsError ? logsError.message : "Success");
} else {
  // Fallback: Clean up recent admin_activity_logs
  const { error: logsError } = await supabase
    .from("admin_activity_logs")
    .delete()
    .gte("created_at", new Date(Date.now() - 24*60*60*1000).toISOString());

  console.log("Cleaned up recent admin_activity_logs:", logsError ? logsError.message : "Success");
}

// Clean up test users from database
const { error: dbError } = await supabase
  .from("users")
  .delete()
  .like("handle", "test-%");

console.log("Cleaned up database users:", dbError ? dbError.message : "Success");

// Clean up auth users
const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
if (authUsers && !listError) {
  let count = 0;
  for (const user of authUsers.users) {
    if (user.email?.includes("@test.com") || user.email?.includes("test-")) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (!error) {
        count++;
        console.log(`Deleted auth user: ${user.email}`);
      } else {
        console.error(`Failed to delete ${user.email}:`, error.message);
      }
    }
  }
  console.log(`✅ Deleted ${count} test auth users`);
}

console.log("✅ Cleanup complete!");