# Dashboard Data Migration Audit Report

**Date:** July 20, 2025  
**Scope:** Dashboard.tsx and all child components  
**Purpose:** Identify direct Supabase calls and deprecated patterns for migration to internal-api service

## Executive Summary

The Dashboard.tsx page and its child components are currently using a mix of direct Supabase SDK calls and edge function invocations. Per the architecture guidelines, all data calls should be migrated to use `src/services/internal-api.service.ts` which wraps calls to the `supabase/functions/internal-api/` edge function.

## Current State Analysis

### Dashboard.tsx Direct Issues

#### ❌ Direct Supabase SDK Calls (Lines 41-94)
```typescript
// DEPRECATED: Direct database calls that need migration
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id)
  .single();

const { data: agentData } = await supabase
  .from('agent_profiles')
  .select('*')
  .eq('user_id', userData.id)
  .single();

const { data: onboardingData } = await supabase
  .from('onboarding_conversations')
  .select('status')
  .eq('user_id', userData.id)
  .eq('status', 'completed')
  .maybeSingle();

const { data: storyData } = await supabase
  .from('personal_stories')
  .select('*')
  .eq('user_id', userData.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

#### ❌ Direct Edge Function Call (Lines 133-161)
```typescript
// DEPRECATED: Direct function call that should go through internal-api
const { data, error } = await supabase.functions.invoke('generate-story-summary', {
  body: { story: storyData }
});

// DEPRECATED: Direct database update
const { error: updateError } = await supabase
  .from('personal_stories')
  .update({ summary: data.summary })
  .eq('id', storyData.id);
```

#### ✅ Testing Internal API (Lines 109-128)
The Dashboard already has test code for the internal API service, indicating migration awareness:
```typescript
const userData = await internalAPIService.getUserData();
```

### Child Components Analysis

#### AgentStatusCard.tsx ❌ (Lines 27-51)
- **Direct Supabase Calls:** `agent_conversations` table queries
- **Tables Used:** `agent_conversations`
- **Impact:** Statistics fetching for conversation counts and weekly connections

#### DashboardHeader.tsx ✅ 
- **Status:** No data calls - purely presentational component
- **Migration Required:** None

#### PersonalStoryCard.tsx ✅
- **Status:** No data calls - receives data via props
- **Migration Required:** None

#### RecentActivityCard.tsx ❌ (Lines 58-86)
- **Direct Supabase Calls:** Placeholder for activity fetching (currently empty array)
- **Tables Used:** None currently (TODO comment indicates incomplete implementation)
- **Impact:** Activity feed functionality

#### FullStoryModal.tsx ✅
- **Status:** No data calls - purely presentational component
- **Migration Required:** None

#### AgentNameModal.tsx ❌ (Lines 39-43)
- **Direct Supabase Calls:** Updates `agent_profiles` table
- **Tables Used:** `agent_profiles`
- **Impact:** Agent name updates

## Database Tables Assessment

### Current Tables in Use
- `users` - Core user records
- `agent_profiles` - Agent configuration data
- `onboarding_conversations` - Onboarding completion status
- `personal_stories` - User narrative data
- `agent_conversations` - Agent interaction logs

### Migration Status
All tables appear to be current based on recent migration files. No obviously deprecated tables identified.

## Edge Functions Assessment

### Current Direct Function Calls
- `generate-story-summary` - Story summarization (Dashboard.tsx:133)

### Available Internal API Functions
Based on `supabase/functions/internal-api/actions/`:
- `users.ts` - User data operations
- `onboarding.ts` - Onboarding flow operations  
- `email-interest.ts` - Email interest management

### Missing Internal API Coverage
- Story summary generation
- Agent profile updates
- Agent conversation statistics
- Activity feed data

## Migration Recommendations

### High Priority (Breaking Architecture Guidelines)

1. **Dashboard.tsx fetchUserData() method**
   - Replace all direct Supabase calls with `internalAPIService.getUserData()`
   - Migrate story summary generation to internal API
   - Consolidate all user data fetching into single API call

2. **AgentNameModal.tsx**
   - Create `internalAPIService.updateAgentName()` method
   - Add corresponding action in `internal-api/actions/users.ts`

3. **AgentStatusCard.tsx**
   - Create `internalAPIService.getAgentStats()` method
   - Add corresponding action for conversation statistics

### Medium Priority (Incomplete Features)

4. **RecentActivityCard.tsx**
   - Implement activity feed functionality via internal API
   - Create `internalAPIService.getUserActivity()` method

### Required Internal API Additions

The following methods need to be added to `src/services/internal-api.service.ts`:

```typescript
// User data (consolidate existing)
async getUserDashboardData(): Promise<DashboardData>

// Agent operations
async updateAgentName(agentProfileId: string, newName: string): Promise<void>
async getAgentStats(userId: string): Promise<AgentStats>

// Story operations  
async generateStorySummary(storyId: string): Promise<string>

// Activity operations
async getUserActivity(userId: string, offset?: number, limit?: number): Promise<Activity[]>
```

## Implementation Plan

### Phase 1: Core Data Migration
1. Extend `internal-api/actions/users.ts` to return comprehensive dashboard data
2. Replace Dashboard.tsx `fetchUserData()` with single API call
3. Update AgentNameModal to use internal API

### Phase 2: Feature Completion
1. Implement agent statistics endpoint
2. Complete activity feed functionality
3. Migrate story summary generation

### Phase 3: Cleanup
1. Remove all direct Supabase imports from Dashboard components
2. Add TypeScript types for all new API responses
3. Update error handling to match internal API patterns

## Risk Assessment

- **Low Risk:** Most changes are isolated to data fetching logic
- **Medium Risk:** Story summary generation migration may need edge function refactoring
- **Breaking Change Risk:** None - all changes are internal implementation details

## Testing Requirements

- Verify all dashboard functionality works with new API calls
- Test error handling scenarios
- Validate agent name updates
- Confirm activity feed displays correctly (once implemented)

---

**Next Steps:** Proceed with Phase 1 implementation, starting with the core user data consolidation in the internal API service.