import { ActionContext, ActionResponse } from "../types.ts";

export default async function getMorningReports(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { userId, dateRange, limit = 50, offset = 0 } = params;

  console.log(`📊 Fetching morning reports with filters:`, {
    userId,
    dateRange,
    limit,
    offset,
  });

  // Build base query with user join
  let query = supabase
    .from("omniscient_morning_reports")
    .select(
      `
      *,
      user:users!user_id(id, handle)
    `
    )
    .order("report_date", { ascending: false });

  // Apply filters
  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (dateRange) {
    if (dateRange.start) {
      query = query.gte("report_date", dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte("report_date", dateRange.end);
    }
  }

  // Apply pagination
  if (limit) {
    query = query.limit(limit);
  }

  if (offset && offset > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  console.log("query", query);

  const { data: reports, error } = await query;

  if (error) {
    console.error("Error fetching morning reports:", error);
    throw new Error(`Failed to fetch morning reports: ${error.message}`);
  }

  console.log(
    `✅ Successfully fetched ${reports?.length || 0} morning reports`
  );

  return {
    success: true,
    data: reports || [],
    summary: {
      totalRecords: reports?.length || 0,
      filters: {
        userId,
        dateRange,
        limit,
        offset,
      },
      dateRange:
        reports?.length > 0
          ? {
              earliest: reports[reports.length - 1]?.report_date,
              latest: reports[0]?.report_date,
            }
          : null,
    },
  };
}
