import { ActionContext, ActionResponse } from '../types.ts';

export default async function generateReport(context: ActionContext): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { date } = params;

  const reportDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch completed conversations for the day
  const { data: conversations } = await supabase
    .from('omniscient_conversations')
    .select(`
      *,
      match:omniscient_matches!match_id(
        *,
        user_a:users!user_a_id(id, handle, email),
        user_b:users!user_b_id(id, handle, email)
      ),
      outcomes:omniscient_outcomes(*)
    `)
    .eq('status', 'completed')
    .gte('completed_at', startOfDay.toISOString())
    .lte('completed_at', endOfDay.toISOString());

  if (!conversations || conversations.length === 0) {
    return {
      success: true,
      summary: { message: 'No completed conversations found for the specified date', date: reportDate.toISOString() }
    };
  }

  // Group conversations by user
  const userReports = new Map();

  for (const conversation of conversations) {
    const userAId = conversation.match.user_a.id;
    const userBId = conversation.match.user_b.id;

    // Add to user A's report
    if (!userReports.has(userAId)) {
      userReports.set(userAId, {
        user: conversation.match.user_a,
        conversations: [],
        discoveries: [],
        activitySummary: {}
      });
    }
    userReports.get(userAId).conversations.push({
      ...conversation,
      partnerHandle: conversation.match.user_b.handle
    });

    // Add to user B's report
    if (!userReports.has(userBId)) {
      userReports.set(userBId, {
        user: conversation.match.user_b,
        conversations: [],
        discoveries: [],
        activitySummary: {}
      });
    }
    userReports.get(userBId).conversations.push({
      ...conversation,
      partnerHandle: conversation.match.user_a.handle
    });
  }

  // Generate discoveries and summaries for each user
  for (const [userId, reportData] of userReports) {
    const discoveries = reportData.conversations.map(conv => ({
      partnerHandle: conv.partnerHandle,
      outcome: conv.actual_outcome,
      qualityScore: conv.quality_score,
      summary: conv.conversation_summary,
      keyMoments: conv.key_moments || [],
      nextSteps: conv.outcomes?.[0]?.specific_next_steps || [],
      followUpRecommended: conv.outcomes?.[0]?.follow_up_recommended || false
    }));

    const activitySummary = {
      totalConversations: reportData.conversations.length,
      averageQuality: reportData.conversations.reduce((sum, conv) => sum + (conv.quality_score || 0), 0) / reportData.conversations.length,
      outcomes: reportData.conversations.reduce((acc, conv) => {
        acc[conv.actual_outcome] = (acc[conv.actual_outcome] || 0) + 1;
        return acc;
      }, {}),
      followUpsRecommended: reportData.conversations.filter(conv => conv.outcomes?.[0]?.follow_up_recommended).length
    };

    reportData.discoveries = discoveries;
    reportData.activitySummary = activitySummary;

    // Store morning report
    await supabase
      .from('morning_reports')
      .upsert({
        user_id: userId,
        report_date: reportDate.toISOString().split('T')[0],
        discoveries,
        activity_summary: activitySummary,
        email_sent: false
      });
  }

  return {
    success: true,
    summary: {
      date: reportDate.toISOString().split('T')[0],
      totalConversations: conversations.length,
      usersWithReports: userReports.size,
      reportsGenerated: userReports.size
    },
    data: Array.from(userReports.values()).slice(0, 5) // Return first 5 for preview
  };
}