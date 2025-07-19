import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Shared types for omniscient system
export interface OmniscientRequest {
  action: string;
  params?: any;
  adminOverride?: boolean;
}

export interface AdminUser {
  id: string;
  role: string;
  handle: string;
  email?: string;
}

export interface ActivityLog {
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

export interface UserProfile {
  id: string;
  handle: string;
  timezone?: string;
  personal_stories: Array<{
    narrative: string;
    current_focus: string[];
    seeking_connections: string[];
    offering_expertise: string[];
  }>;
  agent_profiles: Array<{
    agent_name: string;
  }>;
}

export interface OmniscientAnalysisResult {
  opportunityScore: number;
  outcome: 'STRONG_MATCH' | 'EXPLORATORY' | 'FUTURE_POTENTIAL' | 'NO_MATCH';
  primaryOpportunities: Array<{
    title: string;
    description: string;
    valueProposition: string;
    feasibility: number;
    timeline: string;
  }>;
  synergies: Array<{
    type: string;
    description: string;
    potential: string;
  }>;
  nextSteps: string[];
  riskFactors: Array<{
    risk: string;
    mitigation: string;
  }>;
  hiddenAssets: Array<{
    asset: string;
    application: string;
  }>;
  networkEffects: Array<{
    connection: string;
    value: string;
  }>;
  reasoning: string;
}

export interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  summary?: any;
}

export interface ActionContext {
  supabase: SupabaseClient;
  openRouterApiKey: string;
  params: any;
  user?: AdminUser;
}

export type OmniscientAction = (
  context: ActionContext
) => Promise<ActionResponse>;