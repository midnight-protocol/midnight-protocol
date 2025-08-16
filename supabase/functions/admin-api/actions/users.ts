import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { UserFilters, AdminUser } from "../../_shared/types.ts";
import { PromptService } from "../../_shared/prompt-service.ts";

export async function getUserStats(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  const [
    totalUsers,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    activeToday,
    newThisWeek,
  ] = await Promise.all([
    supabase.from("users").select("count"),
    supabase.from("users").select("count").eq("status", "PENDING"),
    supabase.from("users").select("count").eq("status", "APPROVED"),
    supabase.from("users").select("count").eq("status", "REJECTED"),
    supabase
      .from("user_activities")
      .select("count")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("users")
      .select("count")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  return {
    total: totalUsers.data?.[0]?.count || 0,
    pending: pendingUsers.data?.[0]?.count || 0,
    approved: approvedUsers.data?.[0]?.count || 0,
    rejected: rejectedUsers.data?.[0]?.count || 0,
    activeToday: activeToday.data?.[0]?.count || 0,
    newThisWeek: newThisWeek.data?.[0]?.count || 0,
  };
}

export async function searchUsers(
  supabase: SupabaseClient,
  params: UserFilters,
  user?: AdminUser
) {
  const {
    search,
    status,
    dateRange,
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 50,
    offset = 0,
  } = params;

  let query = supabase.from("users").select(`
      *,
      personal_stories(
        narrative,
        current_focus,
        seeking_connections,
        offering_expertise,
        completeness_score
      ),
      agent_profiles(
        agent_name,
        communication_style
      )
    `);

  // Apply filters
  if (search) {
    query = query.or(`handle.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (dateRange) {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    query = query.gte("created_at", startDate.toISOString());
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }

  return {
    users: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  };
}

export async function getUserDetails(
  supabase: SupabaseClient,
  params: { userId: string },
  user?: AdminUser
) {
  const { userId } = params;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      `
      *,
      personal_stories(
        id,
        narrative,
        current_focus,
        seeking_connections,
        offering_expertise,
        completeness_score,
        summary,
        created_at,
        updated_at
      ),
      agent_profiles(
        agent_name,
        communication_style
      )
    `
    )
    .eq("id", userId)
    .single();

  if (userError) {
    throw new Error(`Failed to get user details: ${userError.message}`);
  }

  // Get user activity stats
  const [conversationCount, introductionCount, referralCount, lastActivity] =
    await Promise.all([
      supabase
        .from("agent_conversations")
        .select("count")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      supabase
        .from("introduction_requests")
        .select("count")
        .eq("user_id", userId),
      supabase.from("user_referrals").select("count").eq("referrer_id", userId),
      supabase
        .from("user_activities")
        .select("activity_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  return {
    ...userData,
    stats: {
      conversations: conversationCount.data?.[0]?.count || 0,
      introductions: introductionCount.data?.[0]?.count || 0,
      referrals: referralCount.data?.[0]?.count || 0,
      lastActivity: lastActivity.data?.[0] || null,
    },
  };
}

export async function updateUserStatus(
  supabase: SupabaseClient,
  params: { userId: string; status: "PENDING" | "APPROVED" | "REJECTED" },
  user?: AdminUser
) {
  const { userId, status } = params;

  const { data, error } = await supabase
    .from("users")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }

  return data;
}

export async function bulkUserOperation(
  supabase: SupabaseClient,
  params: { userIds: string[]; operation: "approve" | "reject" },
  user?: AdminUser
) {
  const { userIds, operation } = params;

  if (!userIds || userIds.length === 0) {
    throw new Error("No users selected");
  }

  const newStatus = operation === "approve" ? "APPROVED" : "REJECTED";

  const { data, error } = await supabase
    .from("users")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .in("id", userIds)
    .select();

  if (error) {
    throw new Error(`Failed to ${operation} users: ${error.message}`);
  }

  return {
    updated: data?.length || 0,
    userIds,
    operation,
    newStatus,
  };
}

export async function createTestUsers(
  supabase: SupabaseClient,
  params: {
    count?: number;
    generation_mode?: "random" | "guided";
    input_data?: string;
  },
  user?: AdminUser
) {
  const { count = 10, generation_mode = "random", input_data } = params;

  if (count < 1 || count > 100) {
    throw new Error("Count must be between 1 and 100");
  }

  if (generation_mode === "guided" && !input_data?.trim()) {
    throw new Error('input_data is required when generation_mode is "guided"');
  }

  const promptService = new PromptService(supabase);
  const createdUsers = [];
  const generatedProfiles = [];

  try {
    // Generate AI profiles for each user
    for (let i = 0; i < count; i++) {
      const response = await promptService.executePromptTemplate(
        {
          templateName: "generate_test_users",
          variables: {
            generation_mode,
            input_data: input_data || "no guidance, random generation",
          },
          maxTokens: 2000,
        },
        {
          edgeFunction: "admin-api/createTestUsers",
          userId: user?.id,
          requestId: `test-user-gen-${Date.now()}-${i}`,
        }
      );

      try {
        const profile = JSON.parse(response.response);

        // Validate required fields
        if (!profile.handle || !profile.narrative || !profile.agent_name) {
          throw new Error("Generated profile missing required fields");
        }

        // Ensure handle is unique by adding random number
        const randomNumber = Math.floor(Math.random() * 1000000);
        profile.handle = profile.handle + randomNumber;

        generatedProfiles.push(profile);
      } catch (parseError) {
        console.error("Failed to parse AI response:", response.response);
        throw new Error(
          `Failed to parse AI-generated profile ${i + 1}: ${parseError.message}`
        );
      }
    }

    console.log("Generated profiles:", generatedProfiles);

    // Create users from generated profiles
    const testUsers = generatedProfiles.map((profile) => ({
      handle: profile.handle,
      role: "test",
      status: "APPROVED",
      timezone: "America/Los_Angeles",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Bulk insert users
    const { data: insertedUsers, error: usersError } = await supabase
      .from("users")
      .insert(testUsers)
      .select();

    if (usersError) {
      throw new Error(`Failed to create test users: ${usersError.message}`);
    }

    createdUsers.push(...insertedUsers);

    // Create agent profiles with AI-generated data
    const agentProfiles = insertedUsers.map((user, index) => {
      const profile = generatedProfiles[index];
      return {
        user_id: user.id,
        agent_name: profile.agent_name,
        communication_style:
          profile.communication_style || "warm_conversational",
      };
    });

    const { error: profilesError } = await supabase
      .from("agent_profiles")
      .insert(agentProfiles);

    if (profilesError) {
      // Rollback by deleting created users
      await supabase
        .from("users")
        .delete()
        .in(
          "id",
          insertedUsers.map((u) => u.id)
        );

      throw new Error(
        `Failed to create agent profiles: ${profilesError.message}`
      );
    }

    // Create personal stories with AI-generated data
    const personalStories = insertedUsers.map((user, index) => {
      const profile = generatedProfiles[index];
      return {
        user_id: user.id,
        narrative: profile.narrative,
        current_focus: profile.current_focus || [],
        seeking_connections: profile.seeking_connections || [],
        offering_expertise: profile.offering_expertise || [],
        completeness_score: 0.85, // Higher score for AI-generated profiles
        summary: profile.summary,
      };
    });

    const { error: storiesError } = await supabase
      .from("personal_stories")
      .insert(personalStories);

    if (storiesError) {
      // Rollback by deleting created users (cascades to agent_profiles)
      await supabase
        .from("users")
        .delete()
        .in(
          "id",
          insertedUsers.map((u) => u.id)
        );

      throw new Error(
        `Failed to create personal stories: ${storiesError.message}`
      );
    }

    return {
      created: createdUsers.length,
      users: createdUsers,
      generation_mode,
      profiles_generated: generatedProfiles.length,
    };
  } catch (error) {
    // Clean up any partially created users
    if (createdUsers.length > 0) {
      await supabase
        .from("users")
        .delete()
        .in(
          "id",
          createdUsers.map((u) => u.id)
        );
    }

    throw error;
  }
}

// Helper function to ensure unique handles
async function ensureUniqueHandle(
  supabase: SupabaseClient,
  baseHandle: string
): Promise<string> {
  let handle = baseHandle;
  let attempt = 0;

  while (attempt < 10) {
    // Prevent infinite loops
    const { data, error } = await supabase
      .from("users")
      .select("handle")
      .eq("handle", handle)
      .single();

    if (error && error.code === "PGRST116") {
      // No user found with this handle - it's unique
      return handle;
    }

    if (error) {
      throw new Error(`Error checking handle uniqueness: ${error.message}`);
    }

    // Handle exists, try with timestamp
    attempt++;
    const timestamp = Date.now();
    handle = `${baseHandle}_${timestamp}`;
  }

  throw new Error("Could not generate unique handle after 10 attempts");
}

export async function deleteAllTestUsers(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  // First get count of test users
  const { count } = await supabase
    .from("users")
    .select("count", { count: "exact", head: true })
    .eq("role", "test");

  if (!count || count === 0) {
    return {
      deleted: 0,
      message: "No test users found",
    };
  }

  // Delete all test users - everything else cascades automatically!
  const { error } = await supabase.from("users").delete().eq("role", "test");

  if (error) {
    throw new Error(`Failed to delete test users: ${error.message}`);
  }

  return {
    deleted: count,
    message: `Successfully deleted ${count} test users`,
  };
}

export async function getTestUsers(
  supabase: SupabaseClient,
  params: { limit?: number; offset?: number },
  user?: AdminUser
) {
  const { limit = 50, offset = 0 } = params;

  const { data, error, count } = await supabase
    .from("users")
    .select("*", { count: "exact" })
    .eq("role", "test")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch test users: ${error.message}`);
  }

  return {
    users: data || [],
    total: count || 0,
    limit,
    offset,
  };
}

export async function getUserMatches(
  supabase: SupabaseClient,
  params: { userId: string; limit?: number; offset?: number },
  user?: AdminUser
) {
  const { userId, limit = 50, offset = 0 } = params;

  // Fetch matches where the user is either user_a or user_b
  const { data, error, count } = await supabase
    .from("omniscient_matches")
    .select(
      `
      *,
      user_a:user_a_id(
        id,
        handle,
        status,
        agent_profiles(agent_name)
      ),
      user_b:user_b_id(
        id,
        handle,
        status,
        agent_profiles(agent_name)
      )
    `,
      { count: "exact" }
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order("opportunity_score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch user matches: ${error.message}`);
  }

  // Transform the data to include the matched user info
  const transformedData =
    data?.map((match) => {
      const isUserA = match.user_a_id === userId;
      const matchedUser = isUserA ? match.user_b : match.user_a;

      return {
        ...match,
        matched_user: matchedUser,
        is_user_a: isUserA,
      };
    }) || [];

  return {
    matches: transformedData,
    total: count || 0,
    limit,
    offset,
  };
}

export async function getMatchInsights(
  supabase: SupabaseClient,
  params: { matchId: string },
  user?: AdminUser
) {
  const { matchId } = params;

  // Fetch match insights with the actual insight details
  const { data, error } = await supabase
    .from("omniscient_match_insights")
    .select(
      `
      *,
      insight:insight_id(
        *
      )
    `
    )
    .eq("match_id", matchId)
    .order("relevance_score", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch match insights: ${error.message}`);
  }

  return {
    insights: data || [],
  };
}

export async function getUserConversations(
  supabase: SupabaseClient,
  params: { userId: string; limit?: number; offset?: number },
  user?: AdminUser
) {
  const { userId, limit = 50, offset = 0 } = params;

  // First get the match IDs for this user
  const { data: matches, error: matchError } = await supabase
    .from("omniscient_matches")
    .select("id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (matchError) {
    throw new Error(`Failed to fetch user matches: ${matchError.message}`);
  }

  const matchIds = matches?.map((m) => m.id) || [];

  if (matchIds.length === 0) {
    return {
      conversations: [],
      total: 0,
      limit,
      offset,
    };
  }

  // Fetch conversations for these matches
  const { data, error, count } = await supabase
    .from("omniscient_conversations")
    .select(
      `
      *,
      match:match_id(
        id,
        user_a_id,
        user_b_id,
        opportunity_score,
        user_a:user_a_id(
          id,
          handle,
          status,
          agent_profiles(agent_name)
        ),
        user_b:user_b_id(
          id,
          handle,
          status,
          agent_profiles(agent_name)
        )
      )
    `,
      { count: "exact" }
    )
    .in("match_id", matchIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  // Transform data to include other user info
  const transformedData =
    data?.map((conversation) => {
      const isUserA = conversation.match?.user_a_id === userId;
      const otherUser = isUserA
        ? conversation.match?.user_b
        : conversation.match?.user_a;

      return {
        ...conversation,
        other_user: otherUser,
        is_user_a: isUserA,
      };
    }) || [];

  return {
    conversations: transformedData,
    total: count || 0,
    limit,
    offset,
  };
}

export async function getConversationTurns(
  supabase: SupabaseClient,
  params: { conversationId: string },
  user?: AdminUser
) {
  const { conversationId } = params;

  // Fetch conversation turns with speaker details
  const { data, error } = await supabase
    .from("omniscient_turns")
    .select(
      `
      *,
      speaker:speaker_user_id(
        id,
        handle,
        agent_profiles(agent_name)
      )
    `
    )
    .eq("conversation_id", conversationId)
    .order("turn_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch conversation turns: ${error.message}`);
  }

  return {
    turns: data || [],
  };
}
