import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { AdminUser } from '../../_shared/types.ts'

export interface EmailInterestFilters {
  search?: string;
  dateRange?: string;
  updatesConsent?: boolean;
  relatedInitiativesConsent?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function getEmailInterests(
  supabase: SupabaseClient,
  params: EmailInterestFilters = {},
  user?: AdminUser
) {
  const {
    search,
    dateRange,
    updatesConsent,
    relatedInitiativesConsent,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0
  } = params;

  let query = supabase
    .from('email_interests')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Apply consent filters
  if (updatesConsent !== undefined) {
    query = query.eq('updates_consent', updatesConsent);
  }

  if (relatedInitiativesConsent !== undefined) {
    query = query.eq('related_initiatives_consent', relatedInitiativesConsent);
  }

  // Apply date range filter
  if (dateRange) {
    let startDate: Date;
    const endDate = new Date();

    switch (dateRange) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // No filter
    }

    if (dateRange !== 'all') {
      query = query.gte('created_at', startDate.toISOString());
    }
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch email interests: ${error.message}`);
  }

  return {
    interests: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function getEmailInterestStats(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  const [
    totalInterests,
    todayInterests,
    weekInterests,
    monthInterests,
    updatesConsentTrue,
    relatedConsentTrue,
    bothConsentsTrue
  ] = await Promise.all([
    // Total count
    supabase.from('email_interests').select('count'),

    // Today
    supabase
      .from('email_interests')
      .select('count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

    // This week
    supabase
      .from('email_interests')
      .select('count')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // This month
    supabase
      .from('email_interests')
      .select('count')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

    // Updates consent breakdown
    supabase
      .from('email_interests')
      .select('count')
      .eq('updates_consent', true),

    // Related initiatives consent breakdown
    supabase
      .from('email_interests')
      .select('count')
      .eq('related_initiatives_consent', true),

    // Both consents true
    supabase
      .from('email_interests')
      .select('count')
      .eq('updates_consent', true)
      .eq('related_initiatives_consent', true)
  ]);

  // Get recent activity (last 7 days, grouped by day)
  const { data: recentActivity } = await supabase
    .from('email_interests')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  // Group by day for activity chart
  const activityByDay: Record<string, number> = {};
  recentActivity?.forEach(item => {
    const day = item.created_at.split('T')[0];
    activityByDay[day] = (activityByDay[day] || 0) + 1;
  });

  return {
    total: totalInterests.data?.[0]?.count || 0,
    today: todayInterests.data?.[0]?.count || 0,
    thisWeek: weekInterests.data?.[0]?.count || 0,
    thisMonth: monthInterests.data?.[0]?.count || 0,
    consent: {
      updates: updatesConsentTrue.data?.[0]?.count || 0,
      relatedInitiatives: relatedConsentTrue.data?.[0]?.count || 0,
      both: bothConsentsTrue.data?.[0]?.count || 0
    },
    recentActivity: activityByDay
  };
}

export async function exportEmailInterests(
  supabase: SupabaseClient,
  params: EmailInterestFilters & { format?: 'csv' | 'json' } = {},
  user?: AdminUser
) {
  const { format = 'csv', ...filterParams } = params;

  // Get all matching records (remove pagination for export)
  const exportParams = { ...filterParams, limit: 10000, offset: 0 };
  const result = await getEmailInterests(supabase, exportParams, user);

  if (format === 'json') {
    return {
      data: JSON.stringify(result.interests, null, 2),
      filename: `email-interests-${new Date().toISOString().split('T')[0]}.json`,
      contentType: 'application/json'
    };
  }

  // CSV format
  const headers = [
    'Name',
    'Email',
    'Updates Consent',
    'Related Initiatives Consent',
    'Created At'
  ];

  const csvRows = [
    headers.join(','),
    ...result.interests.map(interest => [
      `"${interest.name}"`,
      `"${interest.email}"`,
      interest.updates_consent ? 'Yes' : 'No',
      interest.related_initiatives_consent ? 'Yes' : 'No',
      interest.created_at
    ].join(','))
  ];

  return {
    data: csvRows.join('\n'),
    filename: `email-interests-${new Date().toISOString().split('T')[0]}.csv`,
    contentType: 'text/csv'
  };
}

export async function deleteEmailInterest(
  supabase: SupabaseClient,
  params: { interestId: string },
  user?: AdminUser
) {
  const { interestId } = params;

  if (!interestId) {
    throw new Error('Interest ID is required');
  }

  const { error } = await supabase
    .from('email_interests')
    .delete()
    .eq('id', interestId);

  if (error) {
    throw new Error(`Failed to delete email interest: ${error.message}`);
  }

  return { success: true };
}