# Omniscient Conversation System Implementation Plan

Generated: 2025-07-12

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Edge Function Implementation](#edge-function-implementation)
5. [Frontend Service Implementation](#frontend-service-implementation)
6. [Admin Interface Components](#admin-interface-components)
7. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
8. [Testing Plan](#testing-plan)
9. [Migration Strategy](#migration-strategy)

## Overview

The Omniscient Conversation System represents a complete reimplementation of Midnight Protocol's conversation framework. It integrates deep AI analysis at every stage of the networking process, from initial matching through conversation execution to outcome tracking.

### Key Differences from Current System
- **Pre-conversation Analysis**: Every match undergoes deep opportunity analysis before scheduling
- **Guided Conversations**: AI agents receive specific insights about collaboration opportunities
- **Outcome Tracking**: Post-conversation analysis compares predictions to actual results
- **Actionable Insights**: Specific next steps and collaboration recommendations

### Architecture Principles
- Single "fat" edge function handling all omniscient operations
- Single comprehensive frontend service wrapping all API calls
- Action-based API design for flexibility and maintainability
- Complete separation from existing system (no dependencies)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Interface                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OmniscientAdmin.tsx (Main Container)               │   │
│  │  ├── OmniscientDashboard                           │   │
│  │  ├── OmniscientMatchManager                        │   │
│  │  ├── OmniscientConversationMonitor                 │   │
│  │  ├── OmniscientAnalytics                          │   │
│  │  └── OmniscientConfig                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Service Layer                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         omniscient.service.ts                       │   │
│  │  - Match Operations                                 │   │
│  │  - Conversation Operations                          │   │
│  │  - Analytics Operations                             │   │
│  │  - Admin Operations                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Edge Function                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      omniscient-system/index.ts                     │   │
│  │  Actions:                                           │   │
│  │  - analyzeMatches                                   │   │
│  │  - executeConversation                              │   │
│  │  - processUserMidnight                              │   │
│  │  - analyzeOutcome                                   │   │
│  │  - generateReport                                   │   │
│  │  - getMatchInsights                                 │   │
│  │  - getConversationDetails                           │   │
│  │  - getAnalytics                                     │   │
│  │  - manualMatch                                      │   │
│  │  - overrideInsights                                 │   │
│  │  - getSystemHealth                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tables:                                            │   │
│  │  - omniscient_matches                               │   │
│  │  - omniscient_conversations                         │   │
│  │  - omniscient_turns                                 │   │
│  │  - omniscient_insights                              │   │
│  │  - omniscient_outcomes                              │   │
│  │  - omniscient_processing_logs                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### SQL Migration File

Create a new migration file: `supabase/migrations/TIMESTAMP_create_omniscient_system.sql`

```sql
-- Create enum types for omniscient system
CREATE TYPE omniscient_match_status AS ENUM (
  'pending_analysis',
  'analyzed',
  'scheduled',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE omniscient_outcome AS ENUM (
  'STRONG_MATCH',
  'EXPLORATORY',
  'FUTURE_POTENTIAL',
  'NO_MATCH'
);

CREATE TYPE omniscient_insight_type AS ENUM (
  'opportunity',
  'synergy',
  'risk',
  'hidden_asset',
  'network_effect',
  'next_step'
);

-- Table 1: omniscient_insights
-- Stores detailed analysis results that can be referenced by matches and conversations
CREATE TABLE omniscient_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type omniscient_insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  score DECIMAL(3,2) CHECK (score >= 0 AND score <= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: omniscient_matches
-- Stores pre-analyzed matches with opportunity scores
CREATE TABLE omniscient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status omniscient_match_status DEFAULT 'pending_analysis',
  opportunity_score DECIMAL(3,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 1),
  predicted_outcome omniscient_outcome,
  analysis_summary TEXT,
  match_reasoning TEXT,
  scheduled_for TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure no duplicate matches
  CONSTRAINT unique_user_pair UNIQUE (user_a_id, user_b_id)
);

-- Table 3: omniscient_match_insights
-- Junction table linking matches to their insights
CREATE TABLE omniscient_match_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES omniscient_matches(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES omniscient_insights(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_match_insight UNIQUE (match_id, insight_id)
);

-- Table 4: omniscient_conversations
-- Enhanced conversation records with omniscient context
CREATE TABLE omniscient_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES omniscient_matches(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'failed')),
  actual_outcome omniscient_outcome,
  outcome_match_score DECIMAL(3,2), -- How well actual matched prediction
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  conversation_summary TEXT,
  key_moments JSONB DEFAULT '[]', -- Array of significant conversation moments
  deviation_analysis TEXT, -- How conversation deviated from predictions
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 5: omniscient_turns
-- Individual conversation turns with context awareness
CREATE TABLE omniscient_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES omniscient_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  speaker_user_id UUID NOT NULL REFERENCES users(id),
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('agent_a', 'agent_b')),
  message TEXT NOT NULL,
  guided_by_insights UUID[], -- Array of insight IDs that influenced this turn
  opportunity_alignment_score DECIMAL(3,2), -- How well turn aligned with opportunities
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_conversation_turn UNIQUE (conversation_id, turn_number)
);

-- Table 6: omniscient_outcomes
-- Post-conversation analysis and actionable next steps
CREATE TABLE omniscient_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES omniscient_conversations(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES omniscient_matches(id),
  outcome_analysis TEXT NOT NULL,
  collaboration_readiness_score DECIMAL(3,2),
  specific_next_steps JSONB DEFAULT '[]', -- Array of {step, priority, timeline}
  follow_up_recommended BOOLEAN DEFAULT false,
  follow_up_timeframe TEXT,
  actual_collaboration_tracked BOOLEAN DEFAULT false,
  collaboration_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 7: omniscient_processing_logs
-- Comprehensive audit trail for the omniscient pipeline
CREATE TABLE omniscient_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  target_id UUID, -- Could be match_id, conversation_id, etc.
  target_type TEXT, -- 'match', 'conversation', 'batch', etc.
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_omniscient_matches_status ON omniscient_matches(status);
CREATE INDEX idx_omniscient_matches_scheduled ON omniscient_matches(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_omniscient_matches_users ON omniscient_matches(user_a_id, user_b_id);
CREATE INDEX idx_omniscient_conversations_match ON omniscient_conversations(match_id);
CREATE INDEX idx_omniscient_conversations_status ON omniscient_conversations(status);
CREATE INDEX idx_omniscient_turns_conversation ON omniscient_turns(conversation_id);
CREATE INDEX idx_omniscient_outcomes_conversation ON omniscient_outcomes(conversation_id);
CREATE INDEX idx_omniscient_processing_logs_type ON omniscient_processing_logs(process_type, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_omniscient_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_omniscient_matches_updated_at
  BEFORE UPDATE ON omniscient_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

CREATE TRIGGER update_omniscient_conversations_updated_at
  BEFORE UPDATE ON omniscient_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

CREATE TRIGGER update_omniscient_outcomes_updated_at
  BEFORE UPDATE ON omniscient_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE omniscient_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_match_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_processing_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies (admins can see everything)
CREATE POLICY "Admins can view all omniscient data" ON omniscient_insights
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage omniscient matches" ON omniscient_matches
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view match insights" ON omniscient_match_insights
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage omniscient conversations" ON omniscient_conversations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view conversation turns" ON omniscient_turns
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage outcomes" ON omniscient_outcomes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view processing logs" ON omniscient_processing_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

-- User policies (users can see their own data)
CREATE POLICY "Users can view their matches" ON omniscient_matches
  FOR SELECT TO authenticated
  USING (
    user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can view their conversations" ON omniscient_conversations
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM omniscient_matches 
      WHERE user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their conversation turns" ON omniscient_turns
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT oc.id FROM omniscient_conversations oc
      JOIN omniscient_matches om ON oc.match_id = om.id
      WHERE om.user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR om.user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their outcomes" ON omniscient_outcomes
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM omniscient_matches 
      WHERE user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Service role policies (system operations)
CREATE POLICY "System can manage all omniscient data" ON omniscient_insights
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage all matches" ON omniscient_matches
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage match insights" ON omniscient_match_insights
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage conversations" ON omniscient_conversations
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage turns" ON omniscient_turns
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage outcomes" ON omniscient_outcomes
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage logs" ON omniscient_processing_logs
  FOR ALL TO service_role
  USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
```

## Edge Function Implementation

### File: `/supabase/functions/omniscient-system/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

// Types
interface OmniscientRequest {
  action: string;
  params?: any;
  adminOverride?: boolean;
}

interface OmniscientMatch {
  id: string;
  user_a_id: string;
  user_b_id: string;
  opportunity_score: number;
  predicted_outcome: string;
  insights: OmniscientInsight[];
}

interface OmniscientInsight {
  type: string;
  title: string;
  description: string;
  score: number;
}

// Action handlers
const actionHandlers = {
  // Match Analysis Operations
  analyzeMatches: async (supabase: any, params: any) => {
    // Implementation for batch user analysis
    // 1. Fetch all approved users
    // 2. Generate pairs based on intelligent matching
    // 3. Run omniscient analysis on each pair
    // 4. Store matches and insights
    // 5. Schedule conversations
  },

  // Conversation Operations
  executeConversation: async (supabase: any, params: any) => {
    // Implementation for omniscient-guided conversation
    // 1. Fetch match and insights
    // 2. Create conversation record
    // 3. Generate agent prompts with insights
    // 4. Execute turns with guidance
    // 5. Track alignment with opportunities
  },

  // Processing Operations
  processUserMidnight: async (supabase: any, params: any) => {
    // Implementation for midnight processing
    // 1. Find users at midnight
    // 2. Activate scheduled conversations
    // 3. Trigger conversation execution
  },

  // Outcome Analysis
  analyzeOutcome: async (supabase: any, params: any) => {
    // Implementation for post-conversation analysis
    // 1. Compare actual vs predicted outcomes
    // 2. Generate actionable next steps
    // 3. Track collaboration readiness
  },

  // Report Generation
  generateReport: async (supabase: any, params: any) => {
    // Implementation for enhanced morning reports
    // 1. Gather completed conversations
    // 2. Include insights and recommendations
    // 3. Format for email delivery
  },

  // Data Retrieval Operations
  getMatchInsights: async (supabase: any, params: any) => {
    // Fetch detailed match analysis
  },

  getConversationDetails: async (supabase: any, params: any) => {
    // Fetch conversation with all omniscient data
  },

  getAnalytics: async (supabase: any, params: any) => {
    // Generate analytics and metrics
  },

  // Admin Operations
  manualMatch: async (supabase: any, params: any) => {
    // Admin-triggered matching between specific users
  },

  overrideInsights: async (supabase: any, params: any) => {
    // Admin ability to adjust insights
  },

  getSystemHealth: async (supabase: any, params: any) => {
    // System health and monitoring data
  }
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { action, params, adminOverride } = await req.json() as OmniscientRequest;

    // Validate action
    if (!action || !actionHandlers[action]) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Check admin permissions for admin actions
    if (['manualMatch', 'overrideInsights'].includes(action) && !adminOverride) {
      // Verify admin role
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Authorization required');
      
      // Validate admin status
      // ... implementation
    }

    // Log the action
    await supabase.from('omniscient_processing_logs').insert({
      process_type: 'edge_function',
      action,
      status: 'started',
      metadata: { params }
    });

    // Execute action
    const startTime = Date.now();
    const result = await actionHandlers[action](supabase, params);
    const processingTime = Date.now() - startTime;

    // Log completion
    await supabase.from('omniscient_processing_logs').insert({
      process_type: 'edge_function',
      action,
      status: 'completed',
      processing_time_ms: processingTime,
      metadata: { params, result_summary: result.summary }
    });

    return corsSuccessResponse(req, {
      success: true,
      action,
      result,
      processingTime
    });

  } catch (error) {
    console.error('Error in omniscient-system:', error);
    
    // Log error
    try {
      await supabase.from('omniscient_processing_logs').insert({
        process_type: 'edge_function',
        action: req.action || 'unknown',
        status: 'failed',
        error_message: error.message,
        metadata: { error: error.toString() }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return corsErrorResponse(req, JSON.stringify({
      success: false,
      error: error.message
    }), 500);
  }
});

// Detailed implementation of analyzeMatches
async function analyzeMatchesImplementation(supabase: any, params: any) {
  const { batchSize = 200 } = params;
  
  // 1. Fetch all approved users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id,
      handle,
      timezone,
      personal_stories!inner(
        narrative,
        current_focus,
        seeking_connections,
        offering_expertise
      )
    `)
    .eq('status', 'APPROVED');

  if (usersError) throw usersError;

  // 2. Generate intelligent pairs using LLM
  const pairs = await generateIntelligentPairs(users, batchSize);

  // 3. Analyze each pair using omniscient analysis
  const matches = [];
  for (const pair of pairs) {
    const analysis = await performOmniscientAnalysis(pair.userA, pair.userB);
    
    // 4. Store match and insights
    const { data: match, error: matchError } = await supabase
      .from('omniscient_matches')
      .insert({
        user_a_id: pair.userA.id,
        user_b_id: pair.userB.id,
        opportunity_score: analysis.opportunityScore,
        predicted_outcome: analysis.outcome,
        analysis_summary: analysis.reasoning,
        status: 'analyzed',
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!matchError) {
      // Store insights
      for (const insight of analysis.insights) {
        const { data: insightData } = await supabase
          .from('omniscient_insights')
          .insert({
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            score: insight.score
          })
          .select()
          .single();

        if (insightData) {
          await supabase
            .from('omniscient_match_insights')
            .insert({
              match_id: match.id,
              insight_id: insightData.id,
              relevance_score: insight.relevance
            });
        }
      }

      matches.push(match);
    }
  }

  // 5. Schedule high-value conversations
  const highValueMatches = matches.filter(m => m.opportunity_score >= 0.7);
  for (const match of highValueMatches) {
    const scheduledTime = calculateNextMidnight(match.user_a_id, match.user_b_id);
    
    await supabase
      .from('omniscient_matches')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledTime
      })
      .eq('id', match.id);
  }

  return {
    summary: {
      totalUsers: users.length,
      matchesAnalyzed: matches.length,
      highValueMatches: highValueMatches.length,
      scheduled: highValueMatches.length
    },
    matches
  };
}
```

## Frontend Service Implementation

### File: `/src/services/omniscient.service.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

// Types
export interface OmniscientMatch {
  id: string;
  user_a_id: string;
  user_b_id: string;
  opportunity_score: number;
  predicted_outcome: string;
  status: string;
  scheduled_for?: string;
  analysis_summary?: string;
  insights?: OmniscientInsight[];
}

export interface OmniscientInsight {
  id: string;
  type: 'opportunity' | 'synergy' | 'risk' | 'hidden_asset' | 'network_effect' | 'next_step';
  title: string;
  description: string;
  score?: number;
  metadata?: any;
}

export interface OmniscientConversation {
  id: string;
  match_id: string;
  status: 'scheduled' | 'active' | 'completed' | 'failed';
  actual_outcome?: string;
  quality_score?: number;
  conversation_summary?: string;
  key_moments?: any[];
  turns?: OmniscientTurn[];
}

export interface OmniscientTurn {
  id: string;
  turn_number: number;
  speaker_user_id: string;
  speaker_role: string;
  message: string;
  guided_by_insights?: string[];
  opportunity_alignment_score?: number;
}

export interface OmniscientOutcome {
  id: string;
  conversation_id: string;
  outcome_analysis: string;
  collaboration_readiness_score: number;
  specific_next_steps: any[];
  follow_up_recommended: boolean;
}

export interface OmniscientAnalytics {
  totalMatches: number;
  averageOpportunityScore: number;
  conversionRate: number;
  topInsightTypes: { type: string; count: number }[];
  outcomeDistribution: { outcome: string; count: number }[];
  systemHealth: {
    processingBacklog: number;
    averageProcessingTime: number;
    errorRate: number;
  };
}

// Service implementation
class OmniscientService {
  private async callFunction(action: string, params?: any, adminOverride?: boolean) {
    const { data, error } = await supabase.functions.invoke('omniscient-system', {
      body: { action, params, adminOverride }
    });

    if (error) {
      console.error(`Omniscient function error (${action}):`, error);
      throw error;
    }

    return data;
  }

  // Match Operations
  async analyzeMatches(params?: { batchSize?: number }) {
    return this.callFunction('analyzeMatches', params, true);
  }

  async getMatches(filters?: {
    status?: string;
    minScore?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = supabase
      .from('omniscient_matches')
      .select(`
        *,
        user_a:users!user_a_id(id, handle),
        user_b:users!user_b_id(id, handle),
        insights:omniscient_match_insights(
          insight:omniscient_insights(*)
        )
      `);

    if (filters?.status) query.eq('status', filters.status);
    if (filters?.minScore) query.gte('opportunity_score', filters.minScore);
    if (filters?.userId) {
      query.or(`user_a_id.eq.${filters.userId},user_b_id.eq.${filters.userId}`);
    }
    if (filters?.limit) query.limit(filters.limit);
    if (filters?.offset) query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getMatchInsights(matchId: string) {
    return this.callFunction('getMatchInsights', { matchId });
  }

  // Conversation Operations
  async executeConversation(matchId: string) {
    return this.callFunction('executeConversation', { matchId }, true);
  }

  async getConversation(conversationId: string) {
    return this.callFunction('getConversationDetails', { conversationId });
  }

  async getConversations(filters?: {
    matchId?: string;
    status?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
  }) {
    const query = supabase
      .from('omniscient_conversations')
      .select(`
        *,
        match:omniscient_matches!match_id(
          *,
          user_a:users!user_a_id(id, handle),
          user_b:users!user_b_id(id, handle)
        ),
        turns:omniscient_turns(*)
      `);

    if (filters?.matchId) query.eq('match_id', filters.matchId);
    if (filters?.status) query.eq('status', filters.status);
    if (filters?.dateRange) {
      query.gte('created_at', filters.dateRange.start);
      query.lte('created_at', filters.dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async monitorConversation(conversationId: string) {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`omniscient-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'omniscient_turns',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Turn update:', payload);
        }
      )
      .subscribe();

    return subscription;
  }

  // Processing Operations
  async processMidnight(userId?: string) {
    return this.callFunction('processUserMidnight', { userId }, true);
  }

  async generateReports(date?: string) {
    return this.callFunction('generateReport', { date }, true);
  }

  // Analytics Operations
  async getAnalytics(dateRange?: { start: string; end: string }) {
    return this.callFunction('getAnalytics', { dateRange });
  }

  async getSystemHealth() {
    return this.callFunction('getSystemHealth');
  }

  async getProcessingLogs(filters?: {
    processType?: string;
    status?: string;
    limit?: number;
  }) {
    const query = supabase
      .from('omniscient_processing_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.processType) query.eq('process_type', filters.processType);
    if (filters?.status) query.eq('status', filters.status);
    if (filters?.limit) query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Admin Operations
  async manualMatch(userIdA: string, userIdB: string) {
    return this.callFunction('manualMatch', { userIdA, userIdB }, true);
  }

  async overrideInsights(matchId: string, insights: Partial<OmniscientInsight>[]) {
    return this.callFunction('overrideInsights', { matchId, insights }, true);
  }

  async getAdminDashboard() {
    const [analytics, recentMatches, activeConversations, systemHealth] = await Promise.all([
      this.getAnalytics(),
      this.getMatches({ limit: 10 }),
      this.getConversations({ status: 'active' }),
      this.getSystemHealth()
    ]);

    return {
      analytics,
      recentMatches,
      activeConversations,
      systemHealth
    };
  }

  // Outcome Operations
  async getOutcomes(filters?: {
    conversationId?: string;
    followUpRecommended?: boolean;
  }) {
    const query = supabase
      .from('omniscient_outcomes')
      .select(`
        *,
        conversation:omniscient_conversations(*)
      `);

    if (filters?.conversationId) query.eq('conversation_id', filters.conversationId);
    if (filters?.followUpRecommended !== undefined) {
      query.eq('follow_up_recommended', filters.followUpRecommended);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async analyzeOutcome(conversationId: string) {
    return this.callFunction('analyzeOutcome', { conversationId }, true);
  }
}

// Export singleton instance
export const omniscientService = new OmniscientService();
```

## Admin Interface Components

### File: `/src/pages/admin/OmniscientAdmin.tsx`

```tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Brain, Users, MessageSquare, BarChart3, Settings } from 'lucide-react';
import OmniscientDashboard from '@/components/admin/omniscient/OmniscientDashboard';
import OmniscientMatchManager from '@/components/admin/omniscient/OmniscientMatchManager';
import OmniscientConversationMonitor from '@/components/admin/omniscient/OmniscientConversationMonitor';
import OmniscientAnalytics from '@/components/admin/omniscient/OmniscientAnalytics';
import OmniscientConfig from '@/components/admin/omniscient/OmniscientConfig';

const OmniscientAdmin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Omniscient Conversation System
        </h1>
        <p className="text-gray-400">
          AI-powered conversation management with deep insights and analysis
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <OmniscientDashboard />
        </TabsContent>

        <TabsContent value="matches">
          <OmniscientMatchManager />
        </TabsContent>

        <TabsContent value="conversations">
          <OmniscientConversationMonitor />
        </TabsContent>

        <TabsContent value="analytics">
          <OmniscientAnalytics />
        </TabsContent>

        <TabsContent value="config">
          <OmniscientConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OmniscientAdmin;
```

### File: `/src/components/admin/omniscient/OmniscientDashboard.tsx`

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { omniscientService } from '@/services/omniscient.service';
import { Loader2, TrendingUp, Users, Brain, Activity } from 'lucide-react';

const OmniscientDashboard = () => {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['omniscient-dashboard'],
    queryFn: () => omniscientService.getAdminDashboard(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const { analytics, recentMatches, activeConversations, systemHealth } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalMatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg score: {(analytics?.averageOpportunityScore || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics?.conversionRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Matches to introductions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeConversations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.errorRate ? 
                `${(100 - systemHealth.errorRate * 100).toFixed(1)}%` : 
                '100%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent High-Value Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMatches?.map((match) => (
              <div key={match.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {match.user_a.handle} × {match.user_b.handle}
                  </p>
                  <p className="text-sm text-gray-500">
                    Score: {match.opportunity_score.toFixed(2)} | 
                    Outcome: {match.predicted_outcome}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {match.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insight Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Top Insight Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics?.topInsightTypes?.map((insight) => (
              <div key={insight.type} className="flex items-center justify-between">
                <span className="capitalize">{insight.type.replace('_', ' ')}</span>
                <span className="font-mono">{insight.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OmniscientDashboard;
```

## Step-by-Step Implementation Guide

### Phase 1: Database Setup

1. **Create Migration File**
   ```bash
   # Generate timestamp
   date +%Y%m%d%H%M%S
   
   # Create migration file
   touch supabase/migrations/TIMESTAMP_create_omniscient_system.sql
   ```

2. **Copy SQL Schema**
   - Copy the complete SQL schema from the Database Schema section above
   - Paste into the migration file

3. **Run Migration**
   ```bash
   supabase db push
   ```

4. **Verify Tables**
   - Check Supabase dashboard
   - Ensure all tables and policies are created

### Phase 2: Edge Function Implementation

1. **Create Function Directory**
   ```bash
   mkdir -p supabase/functions/omniscient-system
   ```

2. **Create Function File**
   ```bash
   touch supabase/functions/omniscient-system/index.ts
   ```

3. **Implement Function**
   - Copy the edge function code from above
   - Implement each action handler
   - Add proper error handling

4. **Test Locally**
   ```bash
   supabase functions serve omniscient-system
   ```

### Phase 3: Frontend Service

1. **Create Service File**
   ```bash
   touch src/services/omniscient.service.ts
   ```

2. **Implement Service**
   - Copy the service code from above
   - Add to existing services index if needed

3. **Create Types File**
   ```bash
   touch src/types/omniscient.types.ts
   ```

### Phase 4: Admin Interface

1. **Create Admin Page**
   ```bash
   mkdir -p src/pages/admin
   touch src/pages/admin/OmniscientAdmin.tsx
   ```

2. **Create Component Directory**
   ```bash
   mkdir -p src/components/admin/omniscient
   ```

3. **Implement Components**
   - OmniscientDashboard.tsx
   - OmniscientMatchManager.tsx
   - OmniscientConversationMonitor.tsx
   - OmniscientAnalytics.tsx
   - OmniscientConfig.tsx

4. **Add Route**
   ```tsx
   // In your router configuration
   {
     path: '/admin/omniscient',
     element: <OmniscientAdmin />,
     meta: { requiresAuth: true, requiresAdmin: true }
   }
   ```

5. **Update Navigation**
   ```tsx
   // Add to admin navigation
   {
     label: 'Omniscient System',
     icon: Brain,
     href: '/admin/omniscient'
   }
   ```

## Testing Plan

### Unit Tests

1. **Service Tests**
   ```typescript
   // omniscient.service.test.ts
   describe('OmniscientService', () => {
     it('should analyze matches', async () => {
       const result = await omniscientService.analyzeMatches();
       expect(result.summary.matchesAnalyzed).toBeGreaterThan(0);
     });
   });
   ```

2. **Component Tests**
   ```typescript
   // OmniscientDashboard.test.tsx
   describe('OmniscientDashboard', () => {
     it('should display metrics', () => {
       render(<OmniscientDashboard />);
       expect(screen.getByText('Total Matches')).toBeInTheDocument();
     });
   });
   ```

### Integration Tests

1. **End-to-End Flow**
   - Create test users
   - Run match analysis
   - Execute conversation
   - Verify outcome analysis

2. **Performance Tests**
   - Batch processing with 100+ users
   - Concurrent conversation execution
   - Real-time monitoring under load

### Manual Testing Checklist

- [ ] Database migrations successful
- [ ] Edge function responds to all actions
- [ ] Service methods return expected data
- [ ] Admin dashboard loads metrics
- [ ] Match manager displays matches
- [ ] Conversation monitor shows real-time updates
- [ ] Analytics charts render correctly
- [ ] Config changes persist
- [ ] Error handling works properly
- [ ] Loading states display correctly

## Migration Strategy

### Phase 1: Parallel Operation (Week 1-2)
1. Deploy omniscient system alongside existing
2. Run both systems in parallel
3. Compare outputs and metrics
4. Adjust algorithms based on results

### Phase 2: Gradual Rollout (Week 3-4)
1. Route 10% of new matches to omniscient
2. Monitor performance and user feedback
3. Increase to 50% if metrics improve
4. Full rollout if successful

### Phase 3: Deprecation (Week 5-6)
1. Move all new matches to omniscient
2. Maintain read-only access to old data
3. Migrate historical data if needed
4. Decommission old system

### Rollback Plan
1. Keep old system operational during migration
2. Feature flag for instant rollback
3. Data sync between systems
4. Clear rollback procedures documented

## Monitoring & Metrics

### Key Performance Indicators
- Match quality (opportunity scores)
- Conversation engagement scores
- Outcome prediction accuracy
- Introduction conversion rate
- User satisfaction metrics
- System performance (latency, errors)

### Alerts to Configure
- Failed match analysis (> 5 in 1 hour)
- Conversation execution errors
- Low opportunity scores (< 0.3 average)
- High processing times (> 30s)
- Database connection issues

### Dashboard Metrics
- Real-time conversation count
- Daily match generation rate
- Insight type distribution
- Outcome accuracy trending
- System resource usage

## Security Considerations

### Access Control
- Admin-only access to omniscient system
- RLS policies on all tables
- Service role for system operations
- Audit logging for all actions

### Data Privacy
- No PII in logs
- Encrypted storage for sensitive insights
- User consent for deep analysis
- GDPR compliance for data retention

### API Security
- Rate limiting on edge function
- Input validation on all parameters
- SQL injection prevention
- XSS protection in UI

## Future Enhancements

### Short Term (1-3 months)
1. Machine learning for outcome prediction
2. A/B testing framework
3. Automated insight generation
4. Mobile app integration

### Medium Term (3-6 months)
1. Multi-language support
2. Video conversation summaries
3. Integration with calendar systems
4. Advanced analytics dashboard

### Long Term (6+ months)
1. Predictive collaboration success
2. Network effect optimization
3. AI-powered follow-up automation
4. Cross-platform compatibility

## Conclusion

This implementation plan provides a complete blueprint for building the Omniscient Conversation System. The modular architecture ensures easy maintenance and future enhancements while the comprehensive testing plan ensures reliability. Follow the step-by-step guide for successful implementation, and use the monitoring tools to track system performance and user satisfaction.