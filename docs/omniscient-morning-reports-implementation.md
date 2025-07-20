# Omniscient Morning Reports Implementation Guide

## Overview

This document provides a complete implementation plan for the new omniscient morning reports system. This system will replace the deprecated `morning_reports` table and functions with a new approach that leverages the existing omniscient match analysis system.

## Background & Research Findings

### Current System Architecture

The codebase has a sophisticated omniscient system located in:
- **Core**: `supabase/functions/omniscient-system/`
- **Frontend Service**: `src/services/omniscient.service.ts`
- **Admin Dashboard**: `src/pages/OmniscientAdmin.tsx`

### Key Omniscient Tables
- `omniscient_matches` - Analyzed user pairs with notification flags
- `omniscient_conversations` - AI conversations between matched users
- `omniscient_insights` - Match insights and opportunities
- `omniscient_outcomes` - Conversation results and next steps
- `omniscient_processing_logs` - System activity tracking

### Deprecated Morning Reports System

The current system uses:
- **Table**: `morning_reports` (lines 444-455 in schema)
- **Functions**: `generate-morning-reports/index.ts` and `send-daily-reports/index.ts`
- **Frontend**: `MorningReportSection.tsx` and `MorningReportView.tsx`

**Key Issues with Current System:**
1. Based on outdated `agent_conversations` table
2. Duplicates logic that exists in omniscient system
3. Uses deprecated conversation structure
4. Manual synergy detection vs AI-driven analysis

### Omniscient Match Analysis System

**Critical Discovery**: The omniscient system already has notification logic built-in:

From `analyze-matches.ts` (lines 111-113):
```typescript
should_notify: analysis.notificationAssessment.shouldNotify,
notification_score: analysis.notificationAssessment.notificationScore,
notification_reasoning: analysis.notificationAssessment.reasoning,
```

**Match Data Structure** (from schema lines 510-535):
- `should_notify` boolean - Whether match warrants user notification
- `notification_score` numeric(3,2) - Notification priority (0-1)
- `notification_reasoning` text - Why user should be notified
- `introduction_rationale_for_user_a` text - Personalized intro for user A
- `introduction_rationale_for_user_b` text - Personalized intro for user B
- `agent_summaries_agent_a_to_human_a` text - Agent summary for user A
- `agent_summaries_agent_b_to_human_b` text - Agent summary for user B

## Implementation Plan

### Phase 1: Database Schema

Create new table `omniscient_morning_reports`:

```sql
-- Migration: create_omniscient_morning_reports.sql
CREATE TABLE IF NOT EXISTS "public"."omniscient_morning_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "match_notifications" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "match_summaries" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "agent_insights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notification_count" integer DEFAULT 0 NOT NULL,
    "total_opportunity_score" numeric(5,2) DEFAULT 0,
    "email_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Constraints
ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "omniscient_morning_reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "omniscient_morning_reports_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "unique_user_report_date" 
    UNIQUE ("user_id", "report_date");

-- Indexes
CREATE INDEX "idx_omniscient_morning_reports_user_date" 
    ON "public"."omniscient_morning_reports" 
    USING "btree" ("user_id", "report_date");

CREATE INDEX "idx_omniscient_morning_reports_email_sent" 
    ON "public"."omniscient_morning_reports" 
    USING "btree" ("email_sent", "report_date");

-- RLS Policies
ALTER TABLE "public"."omniscient_morning_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own morning reports" 
    ON "public"."omniscient_morning_reports" 
    FOR SELECT 
    TO "authenticated" 
    USING (("user_id" = ( SELECT "users"."id" FROM "public"."users" 
                         WHERE ("users"."auth_user_id" = "auth"."uid"()))));

CREATE POLICY "Admins can view all morning reports" 
    ON "public"."omniscient_morning_reports" 
    FOR SELECT 
    USING ("public"."is_admin"());

CREATE POLICY "System can manage morning reports" 
    ON "public"."omniscient_morning_reports" 
    TO "service_role" 
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER "update_omniscient_morning_reports_updated_at" 
    BEFORE UPDATE ON "public"."omniscient_morning_reports" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_omniscient_updated_at"();
```

### Phase 2: Edge Function Implementation

Create new action: `supabase/functions/omniscient-system/actions/generate-morning-reports.ts`

```typescript
import { ActionContext, ActionResponse } from '../types.ts';

export default async function generateMorningReports(context: ActionContext): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { date, userId } = params;

  const reportDate = date ? new Date(date) : new Date();
  const targetDate = reportDate.toISOString().split('T')[0];

  // Get matches that should notify users (created in last 24 hours)
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  let query = supabase
    .from('omniscient_matches')
    .select(`
      *,
      user_a:users!user_a_id(id, handle, email),
      user_b:users!user_b_id(id, handle, email),
      insights:omniscient_match_insights(
        id,
        relevance_score,
        insight:omniscient_insights(*)
      )
    `)
    .eq('should_notify', true)
    .gte('created_at', startOfDay.toISOString());

  if (userId) {
    query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  }

  const { data: notificationMatches, error } = await query;
  
  if (error) throw new Error(`Failed to fetch notification matches: ${error.message}`);

  if (!notificationMatches || notificationMatches.length === 0) {
    return {
      success: true,
      summary: { 
        message: 'No notification-worthy matches found', 
        date: targetDate,
        reportsGenerated: 0 
      }
    };
  }

  // Group matches by user
  const userReports = new Map();

  for (const match of notificationMatches) {
    // Process for user A
    if (!userReports.has(match.user_a_id)) {
      userReports.set(match.user_a_id, {
        user: match.user_a,
        notifications: [],
        totalOpportunityScore: 0
      });
    }
    
    userReports.get(match.user_a_id).notifications.push({
      match_id: match.id,
      other_user: {
        id: match.user_b.id,
        handle: match.user_b.handle,
        email: match.user_b.email
      },
      notification_score: match.notification_score,
      opportunity_score: match.opportunity_score,
      predicted_outcome: match.predicted_outcome,
      notification_reasoning: match.notification_reasoning,
      introduction_rationale: match.introduction_rationale_for_user_a,
      agent_summary: match.agent_summaries_agent_a_to_human_a,
      match_reasoning: match.match_reasoning,
      insights: match.insights || [],
      created_at: match.created_at
    });
    
    userReports.get(match.user_a_id).totalOpportunityScore += match.opportunity_score || 0;

    // Process for user B
    if (!userReports.has(match.user_b_id)) {
      userReports.set(match.user_b_id, {
        user: match.user_b,
        notifications: [],
        totalOpportunityScore: 0
      });
    }
    
    userReports.get(match.user_b_id).notifications.push({
      match_id: match.id,
      other_user: {
        id: match.user_a.id,
        handle: match.user_a.handle,
        email: match.user_a.email
      },
      notification_score: match.notification_score,
      opportunity_score: match.opportunity_score,
      predicted_outcome: match.predicted_outcome,
      notification_reasoning: match.notification_reasoning,
      introduction_rationale: match.introduction_rationale_for_user_b,
      agent_summary: match.agent_summaries_agent_b_to_human_b,
      match_reasoning: match.match_reasoning,
      insights: match.insights || [],
      created_at: match.created_at
    });
    
    userReports.get(match.user_b_id).totalOpportunityScore += match.opportunity_score || 0;
  }

  // Generate agent insights for each user report
  const reportsGenerated = [];
  
  for (const [userId, reportData] of userReports) {
    try {
      // Sort notifications by notification score
      reportData.notifications.sort((a, b) => (b.notification_score || 0) - (a.notification_score || 0));

      // Generate agent insights based on matches
      const agentInsights = await generateAgentInsights(reportData.notifications, supabase);

      // Create match summaries
      const matchSummaries = {
        total_matches: reportData.notifications.length,
        average_opportunity_score: reportData.totalOpportunityScore / reportData.notifications.length,
        top_outcomes: reportData.notifications.reduce((acc, notif) => {
          acc[notif.predicted_outcome] = (acc[notif.predicted_outcome] || 0) + 1;
          return acc;
        }, {}),
        highest_scoring_match: reportData.notifications[0]?.notification_score || 0
      };

      // Store the morning report
      const { data: report, error: reportError } = await supabase
        .from('omniscient_morning_reports')
        .upsert({
          user_id: userId,
          report_date: targetDate,
          match_notifications: reportData.notifications,
          match_summaries: matchSummaries,
          agent_insights: agentInsights,
          notification_count: reportData.notifications.length,
          total_opportunity_score: reportData.totalOpportunityScore,
          email_sent: false
        }, {
          onConflict: 'user_id,report_date'
        })
        .select()
        .single();

      if (reportError) {
        console.error(`Error creating report for user ${userId}:`, reportError);
        continue;
      }

      reportsGenerated.push(report);
      console.log(`✅ Generated omniscient morning report for user ${reportData.user.handle}`);

    } catch (userError) {
      console.error(`Error processing report for user ${userId}:`, userError);
      continue;
    }
  }

  return {
    success: true,
    summary: {
      date: targetDate,
      totalMatches: notificationMatches.length,
      usersWithReports: userReports.size,
      reportsGenerated: reportsGenerated.length,
      averageNotificationsPerUser: reportsGenerated.length > 0 
        ? reportsGenerated.reduce((sum, r) => sum + r.notification_count, 0) / reportsGenerated.length 
        : 0
    },
    data: reportsGenerated.slice(0, 5) // Return first 5 for preview
  };
}

// Helper function to generate AI insights
async function generateAgentInsights(notifications: any[], supabase: any) {
  if (notifications.length === 0) {
    return {
      patterns_observed: [],
      top_opportunities: [],
      recommended_actions: []
    };
  }

  // Extract patterns from the notifications
  const patterns = [];
  const outcomes = notifications.map(n => n.predicted_outcome);
  const uniqueOutcomes = [...new Set(outcomes)];
  
  if (uniqueOutcomes.length > 1) {
    patterns.push(`Diverse match types detected: ${uniqueOutcomes.join(', ').toLowerCase()}`);
  }
  
  const highScoreMatches = notifications.filter(n => n.notification_score > 0.8);
  if (highScoreMatches.length > 0) {
    patterns.push(`${highScoreMatches.length} high-priority matches identified`);
  }

  // Generate opportunities based on match reasoning
  const opportunities = notifications.slice(0, 3).map(notif => 
    `Explore collaboration with ${notif.other_user.handle} - ${notif.notification_reasoning?.slice(0, 60)}...`
  );

  // Generate recommended actions
  const actions = [
    'Review top-scoring matches first for immediate opportunities',
    'Schedule follow-up conversations with strong matches',
    'Update your profile to attract more high-quality matches'
  ];

  return {
    patterns_observed: patterns.slice(0, 3),
    top_opportunities: opportunities.slice(0, 3),
    recommended_actions: actions.slice(0, 3)
  };
}
```

### Phase 3: Service Layer Integration

Update `src/services/omniscient.service.ts`:

```typescript
// Add to existing OmniscientService class

// Morning Reports Operations
async generateMorningReports(date?: string): Promise<{
  summary: {
    date: string;
    totalMatches: number;
    usersWithReports: number;
    reportsGenerated: number;
    averageNotificationsPerUser: number;
  };
  reports: any[];
}> {
  return this.callFunction("generateMorningReports", { date }, true);
}

async getMorningReports(filters?: {
  userId?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
}): Promise<OmniscientMorningReport[]> {
  let query = supabase
    .from("omniscient_morning_reports")
    .select("*")
    .order("report_date", { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.dateRange) {
    query = query.gte("report_date", filters.dateRange.start);
    query = query.lte("report_date", filters.dateRange.end);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 10) - 1
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch morning reports: ${error.message}`);
  }

  return data || [];
}

async getUserMorningReport(userId: string, date?: string): Promise<OmniscientMorningReport | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from("omniscient_morning_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", targetDate)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user morning report: ${error.message}`);
  }

  return data;
}

// Add types
export interface OmniscientMorningReport {
  id: string;
  user_id: string;
  report_date: string;
  match_notifications: MatchNotification[];
  match_summaries: MatchSummaries;
  agent_insights: AgentInsights;
  notification_count: number;
  total_opportunity_score: number;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchNotification {
  match_id: string;
  other_user: {
    id: string;
    handle: string;
    email: string;
  };
  notification_score: number;
  opportunity_score: number;
  predicted_outcome: string;
  notification_reasoning: string;
  introduction_rationale: string;
  agent_summary: string;
  match_reasoning: string;
  insights: any[];
  created_at: string;
}

export interface MatchSummaries {
  total_matches: number;
  average_opportunity_score: number;
  top_outcomes: Record<string, number>;
  highest_scoring_match: number;
}

export interface AgentInsights {
  patterns_observed: string[];
  top_opportunities: string[];
  recommended_actions: string[];
}
```

### Phase 4: Frontend Updates

Update `src/components/dashboard/MorningReportSection.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Mail, ExternalLink, ChevronRight, Sun, User, MessageSquare, ArrowRight } from 'lucide-react';
import { omniscientService, OmniscientMorningReport, MatchNotification } from '@/services/omniscient.service';
import { toast } from 'sonner';

interface MorningReportSectionProps {
  userId: string;
  userStatus: string;
}

export const MorningReportSection: React.FC<MorningReportSectionProps> = ({ userId, userStatus }) => {
  const [latestReport, setLatestReport] = useState<OmniscientMorningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    if (userStatus === 'APPROVED') {
      fetchLatestReport();
    } else {
      setLoading(false);
      setShowSample(true);
    }
  }, [userId, userStatus]);

  const fetchLatestReport = async () => {
    try {
      const report = await omniscientService.getUserMorningReport(userId);
      
      if (report && report.match_notifications.length > 0) {
        setLatestReport(report);
        setShowSample(false);
      } else {
        setShowSample(true);
      }
    } catch (err) {
      console.error('Error fetching morning report:', err);
      setShowSample(true);
    } finally {
      setLoading(false);
    }
  };

  const getMatchTypeBadge = (outcome: string) => {
    switch (outcome) {
      case 'STRONG_MATCH':
        return <Badge className="bg-terminal-green/20 text-terminal-green border-terminal-green/30">Strong Match</Badge>;
      case 'EXPLORATORY':
        return <Badge className="bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30">Exploratory</Badge>;
      case 'FUTURE_POTENTIAL':
        return <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">Future Potential</Badge>;
      default:
        return <Badge variant="outline">Match</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-terminal-bg/50 border-terminal-cyan/30">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-terminal-bg-secondary rounded w-1/3"></div>
            <div className="h-4 bg-terminal-bg-secondary rounded w-2/3"></div>
            <div className="h-32 bg-terminal-bg-secondary rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notifications = showSample ? SAMPLE_NOTIFICATIONS : (latestReport?.match_notifications || []);
  const isPreview = showSample || !latestReport;

  return (
    <Card className="bg-terminal-bg/50 border-terminal-cyan/30 overflow-hidden">
      {/* Header */}
      <CardHeader className="relative pb-6">
        <div className="absolute top-4 right-4">
          {isPreview && (
            <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">
              Preview
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Sun className="w-6 h-6 text-terminal-yellow" />
          <CardTitle className="text-2xl font-mono text-terminal-green">
            Morning Report
          </CardTitle>
        </div>
        <p className="text-terminal-text-muted">
          {isPreview 
            ? "Here's what your morning reports will look like"
            : `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
          }
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        {/* Summary Stats */}
        {!isPreview && latestReport?.match_summaries && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20">
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-cyan">{latestReport.notification_count}</p>
              <p className="text-xs text-terminal-text-muted">New Matches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-green">
                {latestReport.match_summaries.average_opportunity_score.toFixed(1)}
              </p>
              <p className="text-xs text-terminal-text-muted">Avg Opportunity</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-yellow">
                {latestReport.match_summaries.highest_scoring_match.toFixed(1)}
              </p>
              <p className="text-xs text-terminal-text-muted">Top Score</p>
            </div>
          </div>
        )}

        {/* Match Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-mono text-terminal-cyan flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            New Opportunities
          </h3>
          
          {notifications.length > 0 ? (
            notifications.slice(0, 2).map((notification: MatchNotification, index: number) => (
              <div 
                key={notification.match_id || index} 
                className="p-5 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20 hover:border-terminal-cyan/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-terminal-cyan/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-terminal-cyan" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-terminal-text">{notification.other_user.handle}</p>
                        <span className="text-terminal-text-muted">•</span>
                        <p className="text-sm text-terminal-text-muted">
                          Score: {(notification.notification_score * 100).toFixed(0)}%
                        </p>
                      </div>
                      <p className="text-sm text-terminal-text-muted mt-0.5">
                        {notification.notification_reasoning}
                      </p>
                    </div>
                  </div>
                  {getMatchTypeBadge(notification.predicted_outcome)}
                </div>

                {/* Introduction Rationale */}
                <div className="p-3 bg-terminal-bg rounded border border-terminal-text/10 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-terminal-yellow" />
                    <span className="text-xs font-mono text-terminal-yellow">Why This Match Matters</span>
                  </div>
                  <p className="text-sm text-terminal-text-muted">
                    {notification.introduction_rationale}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono group-hover:scale-105 transition-transform"
                    disabled={isPreview}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Request Introduction
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                    disabled={isPreview}
                  >
                    View Match Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-terminal-text-muted">No new matches today. Check back tomorrow!</p>
            </div>
          )}
        </div>

        {/* Agent Insights */}
        {!isPreview && latestReport?.agent_insights && (
          <div className="p-4 bg-terminal-bg/60 rounded-lg border border-terminal-purple/20">
            <h4 className="text-sm font-mono text-terminal-purple mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Agent Insights
            </h4>
            {latestReport.agent_insights.top_opportunities.map((opportunity, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm mb-2">
                <ChevronRight className="w-4 h-4 text-terminal-purple mt-0.5 flex-shrink-0" />
                <span className="text-terminal-text-muted">{opportunity}</span>
              </div>
            ))}
          </div>
        )}

        {/* View Full Report Button */}
        <div className="pt-4">
          <Button 
            className="w-full bg-terminal-bg border-2 border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono group"
            disabled={isPreview}
          >
            View Full Morning Report
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          {isPreview && (
            <p className="text-center text-xs text-terminal-text-muted mt-2">
              Complete your profile setup to start receiving real morning reports
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sample data for preview
const SAMPLE_NOTIFICATIONS: MatchNotification[] = [
  {
    match_id: "sample-1",
    other_user: {
      id: "sample-user-1",
      handle: "@sarahchen",
      email: "sarah@example.com"
    },
    notification_score: 0.85,
    opportunity_score: 0.78,
    predicted_outcome: "STRONG_MATCH",
    notification_reasoning: "High compatibility in AI/ML collaboration",
    introduction_rationale: "Based on your shared interest in ethical AI development, this could be a valuable connection for your upcoming privacy-first AI project.",
    agent_summary: "Sarah brings complementary technical expertise in ML infrastructure.",
    match_reasoning: "Strong alignment in technical focus and collaboration style",
    insights: [],
    created_at: new Date().toISOString()
  }
];
```

### Phase 5: Integration with Omniscient System

Update `supabase/functions/omniscient-system/index.ts` to include the new action:

```typescript
// Add to existing imports
import generateMorningReports from "./actions/generate-morning-reports.ts";

// Add to actionHandlers object
const actionHandlers = {
  // ... existing actions
  generateMorningReports,
};
```

### Phase 6: Admin Dashboard Integration

Add morning reports management to the omniscient admin dashboard by updating `src/components/admin/omniscient/OmniscientDashboard.tsx`:

```typescript
// Add morning reports metrics to dashboard
const fetchMorningReportsStats = async () => {
  try {
    const reports = await omniscientService.getMorningReports({ limit: 100 });
    const todayReports = reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]);
    
    return {
      totalToday: todayReports.length,
      averageNotifications: todayReports.reduce((sum, r) => sum + r.notification_count, 0) / todayReports.length || 0,
      emailsSent: todayReports.filter(r => r.email_sent).length
    };
  } catch (error) {
    console.error('Error fetching morning reports stats:', error);
    return { totalToday: 0, averageNotifications: 0, emailsSent: 0 };
  }
};
```

## Migration Strategy

### Step 1: Data Migration (Optional)
If needed, migrate existing `morning_reports` data:

```sql
-- Optional: Migrate old morning reports data
INSERT INTO omniscient_morning_reports (
  user_id, 
  report_date, 
  match_notifications, 
  agent_insights,
  notification_count,
  email_sent,
  created_at
)
SELECT 
  user_id,
  report_date,
  discoveries as match_notifications,
  activity_summary as agent_insights,
  COALESCE(jsonb_array_length(discoveries), 0) as notification_count,
  email_sent,
  created_at
FROM morning_reports
WHERE discoveries IS NOT NULL;
```

### Step 2: Graceful Transition
1. Deploy new omniscient morning reports system
2. Run both systems in parallel for testing
3. Switch frontend to use new system
4. Deprecate old functions (keep for reference)

### Step 3: Cleanup
After successful transition:
1. Remove old morning reports frontend components
2. Add deprecation notices to old functions
3. Update documentation

## Testing Strategy

### Unit Tests
1. Test `generate-morning-reports.ts` action with various match scenarios
2. Test service layer methods with mock data
3. Test frontend components with sample data

### Integration Tests
1. Test end-to-end morning report generation
2. Test notification filtering logic
3. Test database constraints and policies

### Manual Testing Scenarios
1. User with no matches - should show empty state
2. User with multiple high-scoring matches - should prioritize correctly
3. User with low-scoring matches - should filter appropriately
4. Multiple users - should generate separate reports

## Monitoring & Analytics

### Key Metrics to Track
1. Reports generated per day
2. Average notifications per user
3. Match notification conversion rates
4. User engagement with morning reports
5. Email open rates (if email integration is added)

### Logging
- Morning report generation times
- Match filtering effectiveness
- User interaction patterns
- System errors and failures

## Future Enhancements

### Email Integration
- Adapt existing `send-daily-reports` function for new data structure
- Use omniscient morning reports table instead of old morning reports
- Leverage introduction rationales for better email content

### Real-time Updates
- WebSocket integration for live morning report updates
- Push notifications for high-priority matches

### AI Improvements
- Enhanced agent insights using LLM analysis
- Personalized introduction suggestions
- Dynamic notification scoring based on user behavior

## File Checklist

### Database
- [ ] Create migration file for `omniscient_morning_reports` table
- [ ] Add RLS policies
- [ ] Create indexes
- [ ] Add trigger for updated_at

### Backend
- [ ] Create `generate-morning-reports.ts` action
- [ ] Update omniscient system index.ts
- [ ] Test edge function locally

### Service Layer
- [ ] Add methods to `omniscient.service.ts`
- [ ] Add TypeScript interfaces
- [ ] Test service methods

### Frontend
- [ ] Update `MorningReportSection.tsx`
- [ ] Update `MorningReportView.tsx` (if needed)
- [ ] Test with sample data
- [ ] Update admin dashboard

### Documentation
- [ ] Update API documentation
- [ ] Add migration notes
- [ ] Update system architecture diagrams

## Summary

This implementation leverages the existing omniscient system's sophisticated match analysis to create a more intelligent and relevant morning reports system. By using the `should_notify` flag and `notification_score` from matches, we ensure users only receive notifications about truly valuable opportunities.

The new system provides:
- **Better relevance**: Uses AI-driven notification scoring
- **Richer data**: Includes introduction rationales and agent summaries
- **Consistency**: Integrates with existing omniscient architecture
- **Scalability**: Built on proven omniscient system patterns
- **Maintainability**: Single source of truth for match analysis

This approach eliminates the duplication between the old morning reports system and the omniscient system while providing users with more valuable and actionable morning insights.