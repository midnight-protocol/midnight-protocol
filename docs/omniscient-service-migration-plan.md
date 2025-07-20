# Omniscient Service Database Query Migration Plan

## Overview
The `omniscient.service.ts` currently makes direct Supabase queries from the frontend, but the architecture requires all database operations to run through edge functions under service role scope. This migration plan addresses the immediate issue where the Recent Reports section is empty due to insufficient permissions, and establishes proper architectural patterns.

## Current State Analysis

### Direct Database Queries Found (Need Migration)
These methods in `omniscient.service.ts` make direct Supabase queries that need to be moved to edge functions:

1. **`getMatches()`** - Lines 253-304
   - Complex filtered query on omniscient_matches table
   - Includes user relations and insights
   - Supports status, minScore, userId, limit, offset filtering

2. **`getMatch()`** - Lines 310-333
   - Single match query with related user/insight data
   - Used for detailed match views

3. **`getConversation()`** - Lines 346-371
   - Single conversation with turns and outcomes
   - Complex nested relations query

4. **`getConversations()`** - Lines 373-421
   - Filtered conversations query
   - Supports matchId, status, userId, dateRange, limit, offset filtering

5. **`getMorningReports()`** - Lines 513-547 🚨 **PRIMARY ISSUE**
   - Filtered morning reports query
   - **This is why Recent Reports section is empty!**
   - Supports userId, dateRange, limit, offset filtering

6. **`getUserMorningReport()`** - Lines 549-564
   - Single user report query by userId and date

7. **`getMorningReportEmailStatus()`** - Lines 566-597
   - Email status aggregation with calculations
   - Returns totalReports, emailsSent, emailsPending, successRate

8. **`getProcessingLogs()`** - Lines 613-639
   - Filtered processing logs query
   - Supports processType, status, limit filtering

9. **`getOutcomes()`** - Lines 689-721
   - Filtered outcomes query with conversation/match relations
   - Supports conversationId, followUpRecommended, limit filtering

### Methods to Keep on Frontend
These methods should remain in the service as they handle real-time subscriptions:
- `monitorConversation()` - Real-time conversation updates
- `subscribeToMatches()` - Real-time match updates  
- `subscribeToConversations()` - Real-time conversation updates

### Methods Already Using Edge Functions ✅
These methods correctly use `callFunction()` and don't need migration:
- `analyzeMatches()`
- `getMatchInsights()`
- `executeConversation()`
- `processMidnight()`
- `generateReports()`
- `generateMorningReports()`
- `sendMorningReportEmails()`
- `getAnalytics()`
- `getSystemHealth()`
- `manualMatch()`
- `overrideInsights()`
- `analyzeOutcome()`

## Migration Implementation Plan

### Phase 1: Create Edge Function Actions (9 new actions)

#### Priority 1: Critical for Admin Interface
1. **`get-morning-reports.ts`** 
   - **URGENT**: Fixes empty Recent Reports section
   - Implements filtering by userId, dateRange, limit, offset
   - Returns array of OmniscientMorningReport objects

2. **`get-matches.ts`**
   - Core admin dashboard functionality
   - Complex filtering: status, minScore, userId, limit, offset
   - Includes user relations and insights

3. **`get-conversations.ts`**
   - Admin conversations view
   - Filtering: matchId, status, userId, dateRange, limit, offset
   - Includes match relations

#### Priority 2: Additional Admin Features
4. **`get-match.ts`**
   - Single match detailed view
   - Includes full user and insight relations

5. **`get-conversation.ts`**
   - Single conversation view (check if get-conversation-details.ts covers this)
   - Includes turns and outcomes

6. **`get-user-morning-report.ts`**
   - User-specific morning report lookup
   - Used in user dashboard

#### Priority 3: Supporting Features
7. **`get-morning-report-email-status.ts`**
   - Email delivery statistics
   - Aggregation calculations for admin dashboard

8. **`get-processing-logs.ts`**
   - System monitoring and debugging
   - Filtered by processType, status, limit

9. **`get-outcomes.ts`**
   - Outcome analysis and tracking
   - Filtered by conversationId, followUpRecommended, limit

### Phase 2: Update Edge Function Registry
Update `supabase/functions/omniscient-system/index.ts`:
```typescript
// Add imports
import getMorningReports from "./actions/get-morning-reports.ts";
import getMatches from "./actions/get-matches.ts";
import getConversations from "./actions/get-conversations.ts";
// ... other imports

// Add to actionHandlers
const actionHandlers = {
  // ... existing handlers
  getMorningReports,
  getMatches,
  getConversations,
  // ... other new handlers
};
```

### Phase 3: Update Service Layer
Convert each method in `omniscient.service.ts`:

**Before (Direct Query):**
```typescript
async getMorningReports(filters?: {...}): Promise<OmniscientMorningReport[]> {
  let query = supabase.from("omniscient_morning_reports")...
  const { data, error } = await query;
  return data || [];
}
```

**After (Edge Function Call):**
```typescript
async getMorningReports(filters?: {...}): Promise<OmniscientMorningReport[]> {
  const result = await this.callFunction("getMorningReports", filters);
  return result.data || [];
}
```

### Phase 4: Verification & Testing
1. **Immediate Fix Verification**
   - Recent Reports section shows morning reports data
   - Filtering by date works correctly

2. **Admin Dashboard Testing**
   - All match views load correctly
   - Conversation lists display properly
   - Filtering and pagination work

3. **User Dashboard Testing**
   - User morning reports display correctly
   - No permission errors in console

## Technical Implementation Details

### Edge Function Action Pattern
Each new action should follow this pattern:

```typescript
import { ActionContext, ActionResponse } from "../types.ts";

export default async function getDataAction(
  context: ActionContext
): Promise<ActionResponse> {
  const { supabase, params } = context;
  const { /* destructure filters */ } = params;

  // Build query with filtering logic
  let query = supabase.from("table_name").select("...");
  
  // Apply filters
  if (params.filter) {
    query = query.eq("field", params.filter);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }

  return {
    success: true,
    data: data || [],
    summary: {
      totalRecords: data?.length || 0,
      filters: params
    }
  };
}
```

### Error Handling
- Consistent error messages across all actions
- Proper logging for debugging
- Graceful fallback to empty arrays where appropriate

### Performance Considerations
- Maintain existing pagination and limiting
- Preserve efficient select statements with proper relations
- Avoid N+1 queries through proper joins

## Migration Checklist

### Phase 1: Documentation ✅
- [x] Create migration plan document
- [x] Identify all direct database queries
- [x] Prioritize implementation order

### Phase 2: Edge Function Actions
- [ ] `get-morning-reports.ts` (PRIORITY 1)
- [ ] `get-matches.ts` (PRIORITY 1) 
- [ ] `get-conversations.ts` (PRIORITY 1)
- [ ] `get-match.ts`
- [ ] `get-conversation.ts`
- [ ] `get-user-morning-report.ts`
- [ ] `get-morning-report-email-status.ts`
- [ ] `get-processing-logs.ts`
- [ ] `get-outcomes.ts`

### Phase 3: System Integration
- [ ] Update omniscient-system index.ts registry
- [ ] Update omniscient.service.ts method implementations
- [ ] Remove direct Supabase query imports

### Phase 4: Testing & Verification
- [ ] Recent Reports section displays data
- [ ] Admin dashboard fully functional
- [ ] All filtering and pagination works
- [ ] No console errors or permission issues
- [ ] User dashboard functionality preserved

## Success Metrics
1. **Immediate Fix**: Recent Reports section shows morning report data
2. **Architecture**: All database queries run through edge functions with service role
3. **Functionality**: No regression in existing admin or user features
4. **Performance**: Query response times remain acceptable
5. **Security**: All queries run with proper service role permissions

## Rollback Plan
If issues arise during migration:
1. Revert service method changes to direct queries
2. Remove new edge function actions from registry
3. Test that original functionality is restored
4. Address issues before re-attempting migration

---

**Next Steps**: Begin with Phase 2, starting with `get-morning-reports.ts` to immediately fix the Recent Reports empty issue.