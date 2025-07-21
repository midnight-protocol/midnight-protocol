# Networking Dashboard Data Migration Audit Report

**Date:** July 20, 2025  
**Scope:** NetworkingDashboard.tsx and all child components/hooks  
**Purpose:** Identify direct Supabase calls and deprecated patterns for migration to internal-api service

## Executive Summary

The NetworkingDashboard.tsx page and its dependencies are heavily using direct Supabase SDK calls and mix of deprecated/current tables. Unlike the main Dashboard, this component uses both deprecated tables (`agent_conversations`) and newer tables (`conversation_logs`), while the child component MorningReportView correctly uses the omniscient service layer. Significant migration work is needed to align with architecture guidelines.

## Current State Analysis

### NetworkingDashboard.tsx Direct Issues

#### ❌ Direct Supabase SDK Calls (Lines 53-57)
```typescript
// DEPRECATED: Direct database call that needs migration
const { data: userData } = await supabase
  .from("users")
  .select("id")
  .eq("auth_user_id", user.id)
  .single();
```

#### ❌ Direct Complex Query (Lines 70-95)
```typescript
// MIXED: Uses newer conversation_logs table but direct Supabase call
const { data, error } = await supabase
  .from("conversation_logs")  // ✅ CURRENT TABLE
  .select(`
    *,
    agent_a:users!conversation_logs_agent_a_user_id_fkey(
      id,
      handle,
      agent_profiles(agent_name)
    ),
    agent_b:users!conversation_logs_agent_b_user_id_fkey(
      id,
      handle,
      agent_profiles(agent_name)
    )
  `)
  .or(`agent_a_user_id.eq.${userInternalId},agent_b_user_id.eq.${userInternalId}`)
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);
```

### Hook Dependencies Analysis

#### useNetworkingData.ts ❌ (Lines 24-52)
- **Direct Supabase Calls:** Multiple deprecated table queries
- **Tables Used:** 
  - `users` ✅ (lines 24-28)
  - `agent_conversations` ❌ **DEPRECATED** (lines 38-50)
- **Issues:** 
  - Using deprecated `agent_conversations` table for stats
  - Should migrate to `omniscient_matches` table
  - Complex logic that should be in internal API

#### useChunkedData.ts ✅
- **Status:** Generic data loading utility - no direct database calls
- **Migration Required:** None (utility function)

#### MorningReportView.tsx ✅ (Lines 44-53)
- **Status:** **CORRECTLY IMPLEMENTED** - Uses omniscient service layer
- **Architecture Compliance:** ✅ Already follows guidelines
- **Migration Required:** None

## Database Tables Assessment

### Current Tables in Use
- `users` - Core user records ✅
- `agent_conversations` - Agent interaction logs ❌ **DEPRECATED**
- `conversation_logs` - New conversation system ✅ **CURRENT**
- `omniscient_matches` - Match system (used via omniscient service) ✅ **CURRENT**

### Table Migration Status
**CRITICAL MIGRATION NEEDED:**
- `agent_conversations` → Replace with `omniscient_matches` in useNetworkingData hook
- `conversation_logs` is current but accessed directly instead of through internal API

## Architecture Compliance Analysis

### ✅ Compliant Components
1. **MorningReportView.tsx** - Uses `omniscientService` correctly
2. **useChunkedData.ts** - Generic utility, no database access

### ❌ Non-Compliant Components  
1. **NetworkingDashboard.tsx** - Direct Supabase calls for user lookup and conversation fetching
2. **useNetworkingData.ts** - Direct Supabase calls using deprecated table

### Mixed Compliance
- NetworkingDashboard uses `conversation_logs` (correct table) but bypasses service layer

## Service Layer Usage

### Current Service Usage
- **omniscientService** ✅ - Used correctly in MorningReportView
- **internalAPIService** ❌ - Not used at all in networking dashboard

### Missing Service Methods
The following methods need to be added to `internalAPIService`:

```typescript
// Networking data
async getNetworkingStats(userId: string): Promise<NetworkingStats>
async getUserConversations(userId: string, offset?: number, limit?: number): Promise<ConversationLog[]>

// User lookup (utility)
async getUserInternalId(authUserId: string): Promise<string>
```

## Migration Recommendations

### High Priority (Architecture Violations)

1. **useNetworkingData.ts Hook**
   - ⚠️ **CRITICAL:** Replace `agent_conversations` with `omniscient_matches` 
   - Create `internalAPIService.getNetworkingStats()` method
   - Add corresponding action in `internal-api/actions/`

2. **NetworkingDashboard.tsx fetchUserInternalId()**
   - Create `internalAPIService.getUserInternalId()` method
   - Replace direct user lookup

3. **NetworkingDashboard.tsx fetchConversations()**
   - Create `internalAPIService.getUserConversations()` method
   - Migrate complex join query to internal API

### Medium Priority (Optimization)

4. **Data Consolidation**
   - Consider combining user ID lookup with conversation fetching
   - Optimize to reduce multiple API calls

## Implementation Plan

### Phase 1: Critical Table Migration
1. **Update useNetworkingData hook:**
   - Replace `agent_conversations` queries with `omniscient_matches`
   - May need to coordinate with omniscient service patterns
   - Create internal API endpoint for networking stats

2. **NetworkingDashboard conversation display:**
   - `conversation_logs` table is **DEPRECATED**
   - **Option A:** Migrate to `omniscient_matches` if conversation data exists there
   - **Option B:** Mock/disable the conversation display section until new system is available

### Phase 2: Service Layer Migration  
1. **Add internal API methods:**
   ```typescript
   // In internal-api/actions/users.ts
   async function getUserInternalId(authUserId: string)
   async function getNetworkingStats(userId: string)
   async function getUserConversations(userId: string, options?) // MAY BE MOCKED if conversation_logs deprecated
   ```

2. **Update NetworkingDashboard:**
   - Replace `fetchUserInternalId()` with service call
   - Replace `fetchConversations()` with service call
   - Update useChunkedData to use service layer

### Phase 3: Optimization
1. Consolidate multiple API calls where possible
2. Add proper TypeScript types for all responses
3. Implement consistent error handling

## Data Flow Comparison

### Current (Non-Compliant)
```
NetworkingDashboard → Direct Supabase SDK → Database Tables
     ↓
useNetworkingData → Direct Supabase SDK → agent_conversations (DEPRECATED)
     ↓  
MorningReportView → omniscientService ✅ → Omniscient API → Database
```

### Target (Compliant)
```
NetworkingDashboard → internalAPIService → Internal API → Database
     ↓
useNetworkingData → internalAPIService → Internal API → omniscient_matches
     ↓
MorningReportView → omniscientService ✅ → Omniscient API → Database
```

## Risk Assessment

- **High Risk:** Table migration from `agent_conversations` to `omniscient_matches` requires understanding data schema differences
- **Medium Risk:** Conversation display may need to be mocked if `omniscient_matches` doesn't contain equivalent data
- **Low Risk:** User ID lookup migration is straightforward
- **Breaking Change Risk:** Low - changes are internal implementation details

## Special Considerations

### Mixed Service Architecture
- NetworkingDashboard should use **internalAPIService** for user data
- MorningReportView correctly uses **omniscientService** for match data
- This creates a clear separation between user/conversation data vs. omniscient/matching data

### Table Alignment
- `conversation_logs` table is **DEPRECATED** - determine if conversation display should:
  - Use `omniscient_matches` data (if available)
  - Be mocked/disabled until replacement system exists
- `omniscient_matches` table should continue to be accessed via omniscient service
- Need to determine which service owns conversation statistics

## Testing Requirements

- Verify networking stats display correctly with new table
- Test conversation loading with service layer
- Confirm morning reports continue working (should be unaffected)
- Validate user ID lookup functionality
- Performance testing for conversation queries

---

**Next Steps:** 
1. Coordinate with omniscient service team on `agent_conversations` → `omniscient_matches` migration
2. **DECISION NEEDED:** For conversation display section - migrate to `omniscient_matches` or mock until replacement?
3. Implement internal API endpoints for networking dashboard data
4. Update useNetworkingData hook to use new table and service layer