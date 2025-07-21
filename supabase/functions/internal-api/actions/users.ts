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

export async function getDashboardData(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
) {
  try {
    if (!databaseUser) {
      throw new Error("User not found");
    }

    // Fetch agent profile
    const { data: agentProfile } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", databaseUser.id)
      .maybeSingle();

    // Check onboarding completion
    const { data: onboardingData } = await supabase
      .from("onboarding_conversations")
      .select("status")
      .eq("user_id", databaseUser.id)
      .eq("status", "completed")
      .maybeSingle();

    // Fetch personal story
    const { data: personalStory } = await supabase
      .from("personal_stories")
      .select("*")
      .eq("user_id", databaseUser.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get agent stats from omniscient_matches
    const agentStats = await getAgentStatsFromMatches(
      supabase,
      databaseUser.id
    );

    return {
      user: databaseUser,
      agentProfile,
      personalStory,
      onboardingComplete: !!onboardingData,
      agentStats,
    };
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    throw error;
  }
}

export async function updateAgentName(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
) {
  try {
    const { agentProfileId, newName } = params;

    if (!agentProfileId || !newName) {
      throw new Error("Missing required parameters: agentProfileId, newName");
    }

    const { error } = await supabase
      .from("agent_profiles")
      .update({ agent_name: newName.trim() })
      .eq("id", agentProfileId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error in updateAgentName:", error);
    throw error;
  }
}

export async function getUserInternalId(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
) {
  try {
    const { authUserId } = params;

    if (!authUserId) {
      throw new Error("Missing required parameter: authUserId");
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (!userData) throw new Error("User not found");
    return userData.id;
  } catch (error) {
    console.error("Error in getUserInternalId:", error);
    throw error;
  }
}

async function getAgentStatsFromMatches(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    // Get total matches where user is participant
    const { count: totalMatches } = await supabase
      .from("omniscient_matches")
      .select("*", { count: "exact", head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    // Get completed matches (those with actual_outcome)
    const { count: completedMatches } = await supabase
      .from("omniscient_matches")
      .select("*", { count: "exact", head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .not("actual_outcome", "is", null);

    // Get conversations (matches with conversation_transcript)
    const { count: totalConversations } = await supabase
      .from("omniscient_matches")
      .select("*", { count: "exact", head: true })
      .not("conversation_transcript", "is", null);

    const { count: userConversations } = await supabase
      .from("omniscient_matches")
      .select("*", { count: "exact", head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .not("conversation_transcript", "is", null);

    // Get most recent match date
    const { data: lastMatch } = await supabase
      .from("omniscient_matches")
      .select("created_at")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      totalMatches: totalMatches || 0,
      completedMatches: completedMatches || 0,
      totalConversations: totalConversations || 0,
      userConversations: userConversations || 0,
      lastMatchDate: lastMatch?.created_at || null,
    };
  } catch (error) {
    console.error("Error getting agent stats from matches:", error);
    // Return empty stats instead of throwing to prevent dashboard failure
    return {
      totalMatches: 0,
      completedMatches: 0,
      totalConversations: 0,
      userConversations: 0,
      lastMatchDate: null,
    };
  }
}

export async function getNetworkingStats(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
) {
  try {
    const { userId } = params;

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    return await getAgentStatsFromMatches(supabase, userId);
  } catch (error) {
    console.error("Error in getNetworkingStats:", error);
    throw error;
  }
}

export async function getUserConversations(
  supabase: SupabaseClient,
  params: any,
  user: AuthenticatedUser,
  databaseUser: DatabaseUser | null
) {
  try {
    const { userId, offset = 0, limit = 10 } = params;

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    console.log("userId", userId);

    const { data, error } = await supabase
      .from("omniscient_matches")
      .select(
        `
        *,
        user_a:users!omniscient_matches_user_a_id_fkey(
          id,
          handle,
          agent_profiles(agent_name)
        ),
        user_b:users!omniscient_matches_user_b_id_fkey(
          id,
          handle,
          agent_profiles(agent_name)
        )
      `
      )
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    console.log("data", data);

    // Map the data to match the expected format
    const mappedData = (data || []).map((item) => ({
      ...item,
      agent_a: item.user_a,
      agent_b: item.user_b,
      match_type: item.predicted_outcome || "unknown",
      outcome: item.actual_outcome || item.predicted_outcome || "unknown",
    }));

    return mappedData;
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    throw error;
  }
}
