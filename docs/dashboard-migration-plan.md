# Dashboard Migration Plan - Complete Implementation Guide

**Date:** July 20, 2025  
**Version:** 1.0  
**Scope:** Migration of Dashboard.tsx and NetworkingDashboard.tsx to internal-api service architecture

## Executive Summary

This document provides a complete implementation plan for migrating both dashboard components from direct Supabase SDK calls to the internal-api service layer, as mandated by the architecture guidelines. The migration addresses deprecated table usage, architectural compliance, and feature consolidation.

## Migration Overview

### Components in Scope

1. **Dashboard.tsx** + child components (AgentStatusCard, AgentNameModal)
2. **NetworkingDashboard.tsx** + dependencies (useNetworkingData hook)
3. **Service Layer Expansion** (internal-api.service.ts + edge function actions)

### Table Migration Status

| Table                      | Status            | Migration Action                          |
| -------------------------- | ----------------- | ----------------------------------------- |
| `users`                    | ✅ Current        | Keep - access via internal API            |
| `agent_profiles`           | ✅ Current        | Keep - access via internal API            |
| `onboarding_conversations` | ✅ Current        | Keep - access via internal API            |
| `personal_stories`         | ✅ Current        | Keep - access via internal API            |
| `agent_conversations`      | ❌ **DEPRECATED** | Replace with `omniscient_matches`         |
| `conversation_logs`        | ❌ **DEPRECATED** | Replace with `omniscient_matches` or mock |

## Schema Analysis

### Current Table Structures

#### omniscient_matches (Target Table)

```sql
CREATE TABLE omniscient_matches (
  id UUID PRIMARY KEY,
  user_a_id UUID REFERENCES users(id),
  user_b_id UUID REFERENCES users(id),
  status omniscient_match_status DEFAULT 'pending_analysis',
  opportunity_score DECIMAL(3,2),
  predicted_outcome omniscient_outcome,
  analysis_summary TEXT,
  match_reasoning TEXT,
  scheduled_for TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  conversation_transcript JSONB,
  actual_outcome omniscient_outcome,
  conversation_summary TEXT,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Deprecated Tables (For Reference)

```sql
-- DEPRECATED: agent_conversations
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY,
  agent_a_user_id UUID,
  agent_b_user_id UUID,
  conversation_transcript JSONB,
  outcome conversation_outcome,
  quality_score DECIMAL(3,2),
  match_type TEXT,
  synergies_discovered TEXT[],
  batch_date DATE,
  created_at TIMESTAMPTZ
);

-- DEPRECATED: conversation_logs
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY,
  agent_a_user_id UUID,
  agent_b_user_id UUID,
  conversation_data JSONB,
  match_type TEXT,
  compatibility_score DECIMAL(3,2),
  outcome TEXT,
  quality_score DECIMAL(3,2),
  conversation_summary TEXT,
  created_at TIMESTAMPTZ
);
```

## Phase 1: Internal API Service Expansion

### 1.1 Add Internal API Methods

**File:** `src/services/internal-api.service.ts`

```typescript
// Dashboard data consolidation
async getDashboardData(): Promise<{
  user: UserRecord;
  agentProfile: AgentProfile | null;
  personalStory: PersonalStory | null;
  onboardingComplete: boolean;
  agentStats: AgentStats;
}>;

// Agent operations
async updateAgentName(agentProfileId: string, newName: string): Promise<void>;

// User utilities
async getUserInternalId(authUserId: string): Promise<string>;

// Networking data (using omniscient_matches)
async getNetworkingStats(userId: string): Promise<{
  totalMatches: number;
  completedMatches: number;
  totalConversations: number;
  userConversations: number;
  lastMatchDate: string | null;
}>;

// Conversations from omniscient_matches
async getUserConversations(
  userId: string,
  options?: { offset?: number; limit?: number }
): Promise<ConversationData[]>;
```

### 1.2 Add Internal API Actions

**File:** `supabase/functions/internal-api/actions/users.ts`

```typescript
export async function getUserDashboardData(userId: string) {
  // Fetch user record
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", userId)
    .single();

  if (!user) throw new Error("User not found");

  // Fetch agent profile
  const { data: agentProfile } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Check onboarding completion
  const { data: onboardingData } = await supabase
    .from("onboarding_conversations")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();

  // Fetch personal story
  const { data: personalStory } = await supabase
    .from("personal_stories")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get agent stats from omniscient_matches
  const agentStats = await getAgentStatsFromMatches(user.id);

  return {
    user,
    agentProfile,
    personalStory,
    onboardingComplete: !!onboardingData,
    agentStats,
  };
}

export async function updateAgentName(agentProfileId: string, newName: string) {
  const { error } = await supabase
    .from("agent_profiles")
    .update({ agent_name: newName.trim() })
    .eq("id", agentProfileId);

  if (error) throw error;
  return { success: true };
}

export async function getUserInternalId(authUserId: string) {
  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (!userData) throw new Error("User not found");
  return userData.id;
}

async function getAgentStatsFromMatches(userId: string) {
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
}

export async function getNetworkingStats(userId: string) {
  return await getAgentStatsFromMatches(userId);
}

export async function getUserConversations(
  userId: string,
  offset = 0,
  limit = 10
) {
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
    .not("conversation_transcript", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}
```

### 1.3 Update Internal API Edge Function

**File:** `supabase/functions/internal-api/index.ts`

```typescript
// Add new action handlers
case 'getUserDashboardData':
  return await getUserDashboardData(userId);

case 'updateAgentName':
  const { agentProfileId, newName } = body;
  return await updateAgentName(agentProfileId, newName);

case 'getUserInternalId':
  return await getUserInternalId(userId);

case 'getNetworkingStats':
  return await getNetworkingStats(userId);

case 'getUserConversations':
  const { offset, limit } = body;
  return await getUserConversations(userId, offset, limit);
```

## Phase 2: Dashboard.tsx Migration

### 2.1 Replace fetchUserData Method

**File:** `src/pages/Dashboard.tsx`

```typescript
// REMOVE: All direct Supabase imports and calls
// REMOVE: generateAndStoreStorySummary function (no longer needed)

const fetchUserData = useCallback(async () => {
  if (!user) return;
  setLoading(true);

  try {
    // Single API call to get all dashboard data
    const dashboardData = await internalAPIService.getDashboardData();

    setUserRecord(dashboardData.user);
    setAgentProfile(dashboardData.agentProfile);
    setStory(dashboardData.personalStory);
    setOnboardingComplete(dashboardData.onboardingComplete);

    // Use story summary if available, otherwise truncated narrative
    if (dashboardData.personalStory?.summary) {
      setStorySummary(dashboardData.personalStory.summary);
    } else if (dashboardData.personalStory?.narrative) {
      setStorySummary(
        dashboardData.personalStory.narrative.substring(0, 150) + "..."
      );
    } else {
      setStorySummary("Your personal story is being processed...");
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    toast.error("Failed to load dashboard data. Please refresh the page.");
  } finally {
    setLoading(false);
  }
}, [user]);
```

### 2.2 Update Child Components

**File:** `src/components/dashboard/AgentStatusCard.tsx`

```typescript
// Replace fetchAgentStats with internal API call
const fetchAgentStats = useCallback(async () => {
  if (!userId) return;

  try {
    const stats = await internalAPIService.getNetworkingStats(userId);

    // Calculate next batch time (unchanged logic)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    setStats({
      totalConversations: stats.totalConversations,
      weeklyConnections: stats.userConversations, // Adjust as needed
      nextBatchTime: tomorrow,
    });
  } catch (error) {
    console.error("Error fetching agent stats:", error);
  }
}, [userId]);
```

**File:** `src/components/AgentNameModal.tsx`

```typescript
// Replace direct Supabase call with internal API
const handleUpdateName = useCallback(async () => {
  if (!newName.trim() || newName === currentName) return;

  setIsUpdating(true);
  try {
    await internalAPIService.updateAgentName(agentProfileId, newName.trim());
    onNameUpdated(newName.trim());
    toast.success("Agent name updated successfully!");
    onClose();
  } catch (error) {
    toast.error("Failed to update agent name");
  } finally {
    setIsUpdating(false);
  }
}, [newName, currentName, agentProfileId, onNameUpdated, onClose]);
```

## Phase 3: NetworkingDashboard.tsx Migration

### 3.1 Replace useNetworkingData Hook

**File:** `src/hooks/useNetworkingData.ts`

```typescript
export const useNetworkingData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.networkingStats(user?.id || ""),
    queryFn: async (): Promise<NetworkingStats> => {
      if (!user) throw new Error("No authenticated user");

      // Use internal API instead of direct Supabase calls
      const stats = await internalAPIService.getNetworkingStats(
        await internalAPIService.getUserInternalId(user.id)
      );

      return {
        totalCycles: 0, // No longer available - mock or remove
        completedCycles: 0, // No longer available - mock or remove
        totalConversations: stats.totalConversations,
        userConversations: stats.userConversations,
        lastCycleDate: stats.lastMatchDate,
      };
    },
    enabled: !!user,
    staleTime: CACHE_CONFIG.networkingData.staleTime,
    gcTime: CACHE_CONFIG.networkingData.cacheTime,
  });

  return {
    stats: query.data || {
      totalCycles: 0,
      completedCycles: 0,
      totalConversations: 0,
      userConversations: 0,
      lastCycleDate: null,
    },
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    invalidateNetworkingData: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.networkingStats(user?.id || ""),
      });
    },
  };
};
```

### 3.2 Update NetworkingDashboard.tsx

**File:** `src/pages/NetworkingDashboard.tsx`

```typescript
// Replace fetchUserInternalId with internal API
const [userInternalId, setUserInternalId] = useState<string | null>(null);

useEffect(() => {
  if (user) {
    fetchUserInternalId();
  }
}, [user]);

const fetchUserInternalId = async () => {
  if (!user) return;

  try {
    const internalId = await internalAPIService.getUserInternalId(user.id);
    setUserInternalId(internalId);
  } catch (err) {
    console.error("Error fetching user internal ID:", err);
  }
};

// Replace fetchConversations with internal API
const fetchConversations = async (offset: number, limit: number) => {
  if (!userInternalId) return [];

  try {
    return await internalAPIService.getUserConversations(userInternalId, {
      offset,
      limit,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};
```

## Phase 4: Cleanup and Optimization

### 4.1 Remove Deprecated Code

**Files to Clean:**

- Remove all direct `supabase` imports from dashboard components
- Remove `generateAndStoreStorySummary` function from Dashboard.tsx
- Remove direct database queries from useNetworkingData.ts
- Update imports to only use internal API service

### 4.2 Add TypeScript Types

**File:** `src/types/dashboard.ts`

```typescript
export interface DashboardData {
  user: UserRecord;
  agentProfile: AgentProfile | null;
  personalStory: PersonalStory | null;
  onboardingComplete: boolean;
  agentStats: AgentStats;
}

export interface AgentStats {
  totalMatches: number;
  completedMatches: number;
  totalConversations: number;
  userConversations: number;
  lastMatchDate: string | null;
}

export interface ConversationData {
  id: string;
  user_a_id: string;
  user_b_id: string;
  conversation_summary: string | null;
  quality_score: number | null;
  actual_outcome: string | null;
  created_at: string;
  user_a: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
  user_b: {
    id: string;
    handle: string;
    agent_profiles: { agent_name: string }[];
  };
}
```

### 4.3 Error Handling Standardization

Ensure all components use consistent error handling patterns matching the internal API service conventions.

## Implementation Timeline

### Week 1: Internal API Foundation

- [ ] Day 1-2: Add internal API methods and actions
- [ ] Day 3-4: Update edge function handlers
- [ ] Day 5: Test internal API endpoints

### Week 2: Dashboard Migration

- [ ] Day 1-2: Migrate Dashboard.tsx core functionality
- [ ] Day 3: Update AgentStatusCard and AgentNameModal
- [ ] Day 4-5: Test and debug dashboard migration

### Week 3: NetworkingDashboard Migration

- [ ] Day 1-2: Update useNetworkingData hook
- [ ] Day 3-4: Migrate NetworkingDashboard.tsx
- [ ] Day 5: Handle conversation display (mock vs migrate)

### Week 4: Cleanup and Testing

- [ ] Day 1-2: Remove deprecated code and imports
- [ ] Day 3-4: Add TypeScript types and error handling
- [ ] Day 5: Final testing and documentation

## Risk Mitigation

### High Risk Items

1. **Data Schema Differences**: Carefully map fields between deprecated tables and `omniscient_matches`
2. **Performance**: Monitor query performance with new table structure
3. **Feature Gaps**: Some data may not be available in `omniscient_matches`

### Mitigation Strategies

1. **Incremental Migration**: Migrate one component at a time
2. **Feature Flags**: Use environment variables to toggle between old/new implementations during transition
3. **Fallback UI**: Prepare mock/placeholder UI for unavailable data
4. **Comprehensive Testing**: Test all user flows before deploying

---

**Migration Owner:** Development Team  
**Approval Required:** Architecture Review, QA Sign-off  
**Go-Live Date:** TBD based on testing completion
