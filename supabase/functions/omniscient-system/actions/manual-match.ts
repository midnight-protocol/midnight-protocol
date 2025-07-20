import { ActionContext, ActionResponse } from "../types.ts";
import { runMatchOnUsers } from "../omniscientAnalysis.ts";

export default async function manualMatch(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, openRouterApiKey, params } = context;
  const { userIdA, userIdB } = params;

  // Fetch users
  const { data: users } = await supabase
    .from("users")
    .select(
      `
      id, handle,
      personal_stories(*),
      agent_profiles(*)
    `
    )
    .in("id", [userIdA, userIdB]);

  if (!users || users.length !== 2) {
    throw new Error("Failed to fetch both users");
  }

  const [userA, userB] = users;
  const { match, analysis } = await runMatchOnUsers(userA, userB, supabase);

  return {
    success: true,
    data: { match, analysis },
  };
}
