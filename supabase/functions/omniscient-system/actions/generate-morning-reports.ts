import { ActionContext, ActionResponse } from "../types.ts";

export default async function generateMorningReports(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { date, userId, forceRegenerate = false } = params;

  const reportDate = date ? new Date(date) : new Date();
  const targetDate = reportDate.toISOString().split("T")[0];

  console.log(
    `🌅 Generating morning reports for ${targetDate}, forceRegenerate: ${forceRegenerate}`
  );

  // Get matches that should notify users
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);

  let query = supabase
    .from("omniscient_matches")
    .select(
      `
      *,
      user_a:users!user_a_id(id, handle, auth_user_id),
      user_b:users!user_b_id(id, handle, auth_user_id),
      insights:omniscient_match_insights(
        id,
        relevance_score,
        insight:omniscient_insights(*)
      )
    `
    )
    .eq("should_notify", true)
    .gte("created_at", startOfDay.toISOString());

  // Incremental processing: only get matches that haven't been reported yet
  if (!forceRegenerate) {
    query = query.neq("status", "reported");
  }

  if (userId) {
    query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  }

  const { data: notificationMatches, error } = await query;

  if (error)
    throw new Error(`Failed to fetch notification matches: ${error.message}`);

  if (!notificationMatches || notificationMatches.length === 0) {
    return {
      success: true,
      summary: {
        message: forceRegenerate
          ? "No notification-worthy matches found for regeneration"
          : "No new notification-worthy matches found",
        date: targetDate,
        reportsGenerated: 0,
        newMatches: 0,
        isIncremental: !forceRegenerate,
      },
    };
  }

  console.log(
    `Found ${notificationMatches.length} ${
      forceRegenerate ? "total" : "new"
    } notification matches`
  );

  // Get emails for all users involved in matches
  const userAuthIds = new Set();
  for (const match of notificationMatches) {
    userAuthIds.add(match.user_a.auth_user_id);
    userAuthIds.add(match.user_b.auth_user_id);
  }

  // Fetch emails from auth.users table
  const { data: authUsers, error: authError } = await supabase
    .from("auth.users")
    .select("id, email")
    .in("id", Array.from(userAuthIds));

  if (authError) {
    console.error("Warning: Failed to fetch user emails:", authError);
  }

  // Create a map of auth_user_id to email
  const emailMap = new Map();
  if (authUsers) {
    for (const authUser of authUsers) {
      emailMap.set(authUser.id, authUser.email);
    }
  }

  // Get existing reports for the day to merge with new matches
  const existingReportsMap = new Map();
  if (!forceRegenerate) {
    const { data: existingReports } = await supabase
      .from("omniscient_morning_reports")
      .select("*")
      .eq("report_date", targetDate);

    if (existingReports) {
      for (const report of existingReports) {
        existingReportsMap.set(report.user_id, report);
      }
    }
  }

  // Group matches by user
  const userReports = new Map();

  for (const match of notificationMatches) {
    // Process for user A
    if (!userReports.has(match.user_a_id)) {
      const existingReport = existingReportsMap.get(match.user_a_id);
      userReports.set(match.user_a_id, {
        user: match.user_a,
        notifications: existingReport
          ? [...existingReport.match_notifications]
          : [],
        totalOpportunityScore: existingReport
          ? existingReport.total_opportunity_score
          : 0,
        emailSent: existingReport ? existingReport.email_sent : false,
      });
    }

    const newNotificationA = {
      match_id: match.id,
      other_user: {
        id: match.user_b.id,
        handle: match.user_b.handle,
        email: emailMap.get(match.user_b.auth_user_id) || "",
      },
      notification_score: match.notification_score,
      opportunity_score: match.opportunity_score,
      predicted_outcome: match.predicted_outcome,
      notification_reasoning: match.notification_reasoning,
      introduction_rationale: match.introduction_rationale_for_user_a,
      agent_summary: match.agent_summaries_agent_a_to_human_a,
      match_reasoning: match.match_reasoning,
      insights: match.insights || [],
      created_at: match.created_at,
    };

    // Check if this match is already in the report (avoid duplicates)
    const existingNotifications = userReports.get(
      match.user_a_id
    ).notifications;
    if (!existingNotifications.some((n) => n.match_id === match.id)) {
      userReports.get(match.user_a_id).notifications.push(newNotificationA);
      userReports.get(match.user_a_id).totalOpportunityScore +=
        match.opportunity_score || 0;
    }

    // Process for user B
    if (!userReports.has(match.user_b_id)) {
      const existingReport = existingReportsMap.get(match.user_b_id);
      userReports.set(match.user_b_id, {
        user: match.user_b,
        notifications: existingReport
          ? [...existingReport.match_notifications]
          : [],
        totalOpportunityScore: existingReport
          ? existingReport.total_opportunity_score
          : 0,
        emailSent: existingReport ? existingReport.email_sent : false,
      });
    }

    const newNotificationB = {
      match_id: match.id,
      other_user: {
        id: match.user_a.id,
        handle: match.user_a.handle,
        email: emailMap.get(match.user_a.auth_user_id) || "",
      },
      notification_score: match.notification_score,
      opportunity_score: match.opportunity_score,
      predicted_outcome: match.predicted_outcome,
      notification_reasoning: match.notification_reasoning,
      introduction_rationale: match.introduction_rationale_for_user_b,
      agent_summary: match.agent_summaries_agent_b_to_human_b,
      match_reasoning: match.match_reasoning,
      insights: match.insights || [],
      created_at: match.created_at,
    };

    // Check if this match is already in the report (avoid duplicates)
    const existingNotificationsB = userReports.get(
      match.user_b_id
    ).notifications;
    if (!existingNotificationsB.some((n) => n.match_id === match.id)) {
      userReports.get(match.user_b_id).notifications.push(newNotificationB);
      userReports.get(match.user_b_id).totalOpportunityScore +=
        match.opportunity_score || 0;
    }
  }

  // Generate reports for each user
  const reportsGenerated = [];
  const matchIdsToMarkAsReported = new Set();

  for (const [userId, reportData] of userReports) {
    try {
      // Sort notifications by notification score
      reportData.notifications.sort(
        (a, b) => (b.notification_score || 0) - (a.notification_score || 0)
      );

      // Generate agent insights based on all matches (existing + new)
      const agentInsights = await generateAgentInsights(
        reportData.notifications,
        supabase
      );

      // Create match summaries
      const matchSummaries = {
        total_matches: reportData.notifications.length,
        average_opportunity_score:
          reportData.notifications.length > 0
            ? reportData.totalOpportunityScore / reportData.notifications.length
            : 0,
        top_outcomes: reportData.notifications.reduce((acc, notif) => {
          acc[notif.predicted_outcome] =
            (acc[notif.predicted_outcome] || 0) + 1;
          return acc;
        }, {}),
        highest_scoring_match:
          reportData.notifications[0]?.notification_score || 0,
      };

      // Store/update the morning report
      const { data: report, error: reportError } = await supabase
        .from("omniscient_morning_reports")
        .upsert(
          {
            user_id: userId,
            report_date: targetDate,
            match_notifications: reportData.notifications,
            match_summaries: matchSummaries,
            agent_insights: agentInsights,
            notification_count: reportData.notifications.length,
            total_opportunity_score: reportData.totalOpportunityScore,
            email_sent: reportData.emailSent, // Preserve existing email status
          },
          {
            onConflict: "user_id,report_date",
          }
        )
        .select()
        .single();

      if (reportError) {
        console.error(`Error creating report for user ${userId}:`, reportError);
        continue;
      }

      // Collect match IDs to mark as reported
      for (const notification of reportData.notifications) {
        matchIdsToMarkAsReported.add(notification.match_id);
      }

      reportsGenerated.push(report);
      console.log(
        `✅ ${
          forceRegenerate ? "Regenerated" : "Updated"
        } omniscient morning report for user ${reportData.user.handle}`
      );
    } catch (userError) {
      console.error(`Error processing report for user ${userId}:`, userError);
      continue;
    }
  }

  // Mark processed matches as 'reported'
  if (matchIdsToMarkAsReported.size > 0) {
    const { error: updateError } = await supabase
      .from("omniscient_matches")
      .update({ status: "reported" })
      .in("id", Array.from(matchIdsToMarkAsReported));

    if (updateError) {
      console.error("Error marking matches as reported:", updateError);
      // Don't fail the entire operation, just log the error
    } else {
      console.log(
        `📝 Marked ${matchIdsToMarkAsReported.size} matches as 'reported'`
      );
    }
  }

  return {
    success: true,
    summary: {
      date: targetDate,
      totalMatches: notificationMatches.length,
      usersWithReports: userReports.size,
      reportsGenerated: reportsGenerated.length,
      matchesMarkedAsReported: matchIdsToMarkAsReported.size,
      isIncremental: !forceRegenerate,
      forceRegenerate,
      averageNotificationsPerUser:
        reportsGenerated.length > 0
          ? reportsGenerated.reduce((sum, r) => sum + r.notification_count, 0) /
            reportsGenerated.length
          : 0,
    },
    data: reportsGenerated.slice(0, 5), // Return first 5 for preview
  };
}

// Helper function to generate AI insights
async function generateAgentInsights(notifications: any[], supabase: any) {
  if (notifications.length === 0) {
    return {
      patterns_observed: [],
      top_opportunities: [],
      recommended_actions: [],
    };
  }

  // Extract patterns from the notifications
  const patterns = [];
  const outcomes = notifications.map((n) => n.predicted_outcome);
  const uniqueOutcomes = [...new Set(outcomes)];

  if (uniqueOutcomes.length > 1) {
    patterns.push(
      `Diverse match types detected: ${uniqueOutcomes.join(", ").toLowerCase()}`
    );
  }

  const highScoreMatches = notifications.filter(
    (n) => n.notification_score > 0.8
  );
  if (highScoreMatches.length > 0) {
    patterns.push(
      `${highScoreMatches.length} high-priority matches identified`
    );
  }

  // Generate opportunities based on match reasoning
  const opportunities = notifications.slice(0, 3).map(
    (notif) => `Explore collaboration with ${notif.other_user.handle}` // - ${notif.notification_reasoning?.slice(0, 60)}...`
  );

  // Generate recommended actions
  const actions = [
    "Review top-scoring matches first for immediate opportunities",
    "Schedule follow-up conversations with strong matches",
    "Update your profile to attract more high-quality matches",
  ];

  return {
    patterns_observed: patterns.slice(0, 3),
    top_opportunities: opportunities.slice(0, 3),
    recommended_actions: actions.slice(0, 3),
  };
}
