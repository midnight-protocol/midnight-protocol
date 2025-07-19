import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { AuthenticatedUser, DatabaseUser } from "../../_shared/auth.ts";
import { UserData } from "../../_shared/types.ts";

export async function getUserData(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
): Promise<UserData | null> {
  try {
    console.log("getUserData called for auth_user_id:", user.id);
    console.log("User email:", user.email);

    if (!databaseUser) {
      console.log("No database user record found for this authenticated user");
      return null;
    }

    console.log("Successfully returning user data for:", databaseUser.handle);
    return databaseUser as UserData;
  } catch (error) {
    console.error("Error in getUserData:", error);
    throw error;
  }
}