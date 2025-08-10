# User Journey Map - Midnight Protocol

## Overview
This document maps the complete user journey through the Midnight Protocol application, from initial signup through matchmaking and daily engagement. Each stage includes the specific Supabase edge functions called and the data flows involved.

## Journey Stages

### 1. Authentication & Signup
**Entry Point:** `/auth` page

#### Flow:
1. User lands on Auth page (`src/pages/Auth.tsx`)
2. User enters email, password, and handle for signup
3. Password validation runs client-side (`src/lib/password-validation.ts`)
4. User clicks "CREATE AGENT"

#### Function Calls:
- **Client:** `AuthContext.signUp()` (src/contexts/AuthContext.tsx:259)
  - Calls `supabase.auth.signUp()` with email, password, and handle in metadata
  - Sets email redirect to `/onboarding`
- **Database:** Creates entry in `auth.users` table (Supabase Auth)
- **Result:** User redirected to `/onboarding` after successful signup

---

### 2. Onboarding Process
**Entry Point:** `/onboarding` page (after signup or login)

#### Phase 2.1: Agent Personalization
**Component:** `AgentPersonalization` (src/components/AgentPersonalization.tsx)

##### Function Calls:
1. **Initial Load:** 
   - `internalAPIService.getOnboardingData()` → `internal-api` edge function
   - Action: `getOnboardingData`
   - Returns: User record, existing agent profile (if any)

2. **Save Personalization:**
   - `internalAPIService.saveAgentPersonalization()` → `internal-api` edge function
   - Action: `saveAgentPersonalization`
   - Data: Agent name, communication style
   - Creates/updates `agent_profiles` record

#### Phase 2.2: Onboarding Chat Interview
**Component:** `OnboardingChat` (src/components/OnboardingChat.tsx)

##### Function Calls:
1. **Initialize Chat:**
   - `internalAPIService.initializeOnboardingChat()` → `internal-api` edge function
   - Action: `initializeOnboardingChat`
   - Creates conversation record, returns initial agent message
   - Starts building personal story

2. **Each Message Exchange:**
   - `internalAPIService.sendOnboardingMessage()` → `internal-api` edge function
   - Action: `sendOnboardingMessage`
   - Parameters: conversationId, message, agentName, communicationStyle, turnCount
   - Returns: Agent response, essence data updates
   - Updates `personal_stories` table progressively

3. **Complete Onboarding:**
   - `internalAPIService.completeOnboarding()` → `internal-api` edge function
   - Action: `completeOnboarding`
   - Finalizes personal story
   - Sets user status to `PENDING` for admin approval
   - User redirected to `/dashboard`

---

### 3. Dashboard & Approval Wait
**Entry Point:** `/dashboard` page

#### Function Calls:
- **Load Dashboard:** 
  - `internalAPIService.getDashboardData()` → `internal-api` edge function
  - Action: `getDashboardData`
  - Returns: User record, agent profile, personal story, onboarding status

#### User Status States:
- **PENDING:** Awaiting admin approval (shows pending message)
- **APPROVED:** Full access to features
- **REJECTED:** Access denied message

---

### 4. Admin Approval Process
**Entry Point:** Admin accesses `/admin` dashboard

#### Function Calls:
1. **View Pending Users:**
   - `adminAPIService.getUsers()` → `admin-api` edge function
   - Action: `getUsers`
   - Filters: status='PENDING'
   
2. **Review User Details:**
   - `adminAPIService.getUserDetails()` → `admin-api` edge function
   - Action: `getUserDetails`
   - Returns: Full user profile, personal story, agent details

3. **Approve/Reject User:**
   - `adminAPIService.updateUserStatus()` → `admin-api` edge function
   - Action: `updateUserStatus`
   - Updates user status to 'APPROVED' or 'REJECTED'
   - If approved, user becomes eligible for matching

---

### 5. Matchmaking Process (Omniscient System)
**Trigger:** Automated or admin-initiated

#### Phase 5.1: Match Generation
##### Function Calls:
1. **Identify Potential Matches:**
   - `omniscientService.analyzeMatches()` → `omniscient-system` edge function
   - Action: `analyzeMatches`
   - Analyzes all approved users' personal stories
   - Uses AI to identify synergies and opportunities
   - Creates `omniscient_matches` records with:
     - opportunity_score
     - predicted_outcome
     - match_reasoning
     - should_notify flag

#### Phase 5.2: Match Conversation Simulation
##### Function Calls:
1. **Execute Agent Conversation:**
   - `omniscientService.executeConversation()` → `omniscient-system` edge function
   - Action: `executeConversation`
   - Simulates 6-turn conversation between matched agents
   - Uses personal stories and match insights to guide conversation
   - Creates records in:
     - `omniscient_conversations`
     - `omniscient_turns` (each message)
   - Analyzes conversation quality and outcome

---

### 6. Daily Morning Reports
**Trigger:** Scheduled (typically midnight/early morning)

#### Phase 6.1: Report Generation
##### Function Calls:
1. **Generate Reports:**
   - `omniscientService.generateMorningReports()` → `omniscient-system` edge function
   - Action: `generateMorningReports`
   - Processes matches with `should_notify=true`
   - Groups matches by user
   - Creates `omniscient_morning_reports` records containing:
     - match_notifications (new connections)
     - match_summaries (conversation insights)
     - agent_insights (personalized recommendations)
   - Marks processed matches as `status='reported'`

#### Phase 6.2: Email Delivery
##### Function Calls:
1. **Send Report Emails:**
   - `omniscientService.sendMorningReportEmails()` → `omniscient-system` edge function
   - Action: `sendMorningReportEmails`
   - For each morning report:
     - Fetches email template
     - Personalizes content with user's matches
     - Sends via email service (Resend)
   - Updates `email_sent` flag on reports

---

### 7. Ongoing User Engagement
**Entry Points:** Dashboard, email links

#### Dashboard Features:
1. **View Personal Story:**
   - `internalAPIService.getPersonalStory()` → `internal-api` edge function
   - Displays user's generated narrative

2. **View Conversations:**
   - `internalAPIService.getUserConversations()` → `internal-api` edge function
   - Shows past agent conversations and outcomes

3. **Update Agent Name:**
   - `internalAPIService.updateAgentName()` → `internal-api` edge function
   - Allows renaming agent after onboarding

4. **View Network Stats:**
   - `internalAPIService.getNetworkingStats()` → `internal-api` edge function
   - Shows match counts, conversation stats

---

## Key Database Tables

### User Journey Tables:
- `auth.users` - Supabase auth records
- `users` - Application user profiles (status, role, handle)
- `agent_profiles` - Agent personalization settings
- `personal_stories` - Generated user narratives
- `conversations` - Onboarding chat records
- `messages` - Individual chat messages

### Matching & Reports Tables:
- `omniscient_matches` - Potential match records
- `omniscient_insights` - Match opportunities/synergies
- `omniscient_conversations` - Simulated agent conversations
- `omniscient_turns` - Individual conversation messages
- `omniscient_morning_reports` - Daily report records
- `omniscient_outcomes` - Conversation analysis results

---

## Testing Considerations

### Critical Test Points:
1. **Signup Flow:**
   - Password validation
   - Handle uniqueness
   - Email verification

2. **Onboarding:**
   - Agent personalization saves correctly
   - Chat messages persist
   - Personal story generation
   - Completion status update

3. **Approval:**
   - Admin can view pending users
   - Status updates propagate correctly
   - Approved users become match-eligible

4. **Matching:**
   - Only approved users are matched
   - Match scoring algorithm
   - Conversation simulation completes
   - Insights are generated

5. **Reports:**
   - Reports generated for all matched users
   - Email delivery success
   - Report contains correct matches
   - Links in emails work

### Edge Cases:
- User abandons onboarding midway
- Multiple onboarding sessions
- Admin rejects then re-approves user
- User has no suitable matches
- Email delivery failures
- Concurrent matching processes

---

## API Service Architecture

### Service Layers:
1. **Frontend Services:**
   - `internal-api.service.ts` - User-facing operations
   - `admin-api.service.ts` - Admin operations
   - `omniscient.service.ts` - Matching system operations

2. **Edge Functions:**
   - `internal-api` - Handles all user operations
   - `admin-api` - Handles all admin operations
   - `omniscient-system` - Handles matching and reports

3. **Shared Utilities:**
   - `llm-service.ts` - AI model interactions
   - `email-service.ts` - Email delivery
   - `prompt-service.ts` - Prompt template management
   - `auth.ts` - Authentication/authorization

---

## Security & Permissions

### Row-Level Security:
- Users can only access their own data
- Admins have elevated permissions
- Agent conversations are isolated

### Function-Level Security:
- All edge functions verify authentication
- Admin functions check role='admin'
- Rate limiting on chat operations

---

## Performance Considerations

### Optimization Points:
- Lazy loading of dashboard components
- React Query caching for API calls
- Incremental morning report generation
- Batch processing for matches
- Connection pooling in edge functions

### Scalability:
- Matching algorithm runs in batches
- Reports generated incrementally
- Email sending queued and rate-limited
- Database indexes on key lookup fields