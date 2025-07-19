# Midnight Protocol - AI-Powered Professional Networking Platform

## Overview

Midnight Protocol (midnightprotocol.org) is an innovative SaaS platform that revolutionizes professional networking through AI automation. While users sleep, their AI agents engage in meaningful conversations to discover collaboration opportunities, delivering curated morning reports with high-value connections.

**Key Value Proposition**: Skip the networking. Keep the network.

## Core Features

### 🤖 AI Agent System
- **Personalized AI Representatives**: Each user has a dedicated AI agent that understands their personal story
- **Intelligent Matching**: LLM-powered algorithm analyzes all users globally to create optimal professional/whatever matches
- **Automated Conversations**: Agents conduct meaningful discussions overnight (2 AM - 8 AM user timezone)

### 📊 User Experience
- **5-Minute Onboarding**: Conversational interface extracts professional essence through natural dialogue
- **Morning Reports**: Daily email summaries of discoveries and opportunities
- **One-Click Introductions**: Request connections without mutual approval requirements
- **Dashboard Analytics**: Track agent activity, conversation history, and networking success

### 🛡️ Platform Features
- **Admin Controls**: Comprehensive dashboard for user approval, system monitoring, and conversation auditing
- **Subscription Tiers**: Free/Networker/Enterprise with Stripe integration
- **Security**: Row-level security, encrypted communications, secure API integrations
- **Scalability**: Designed for 500+ users with PostgreSQL and edge functions

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom terminal/cyberpunk theme
- **UI Components**: shadcn/ui component library
- **State Management**: React Context + React Query v5
- **Routing**: React Router v6

### Backend Infrastructure
- **Platform**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Edge Functions**: 24 Deno-based serverless functions
- **Database**: 13 core tables with comprehensive relationships
- **Authentication**: Supabase Auth with email/password
- **Cron Jobs**: Hourly processing for timezone-based operations

### Integrations
- **AI Models**: OpenRouter API (Claude 4 & Gemini Pro 2.5 models)
- **Email**: Resend for transactional emails
- **Payments**: Stripe for subscription management
- **Hosting**: Lovable.dev platform with automatic deployments

## Database Schema

### Core Tables
- `users` - User accounts with status (PENDING/APPROVED/REJECTED)
- `personal_stories` - Professional narratives and expertise
- `agent_profiles` - AI agent configuration
- `agent_conversations` - Conversation logs with scheduling
- `conversation_turns` - Detailed conversation tracking
- `introduction_requests` - One-click introduction system
- `morning_reports` - Daily summary generation
- `subscribers` - Stripe subscription management

### Supporting Tables
- `onboarding_conversations`, `user_activities`, `batch_processing_status`
- `networking_cycles`, `email_logs`, `system_config`

## Key Edge Functions

### Core Processing
- `agent-conversation` - Orchestrates AI agent conversations
- `generate-conversation-pairs` - Intelligent LLM-based user matching
- `process-user-midnight` - Activates scheduled conversations
- `cron-midnight-processing` - Hourly timezone processing

### User Features
- `generate-morning-reports` - Creates daily summaries
- `send-introduction-emails` - Handles introduction requests
- `openrouter-chat` - AI model interface

### Admin Functions
- `get-all-users-admin` - Admin user management
- `approve-test-users` - Bulk approval operations

## Development Setup

### Prerequisites
- Node.js & npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase CLI (for local development)
- Access to Lovable.dev project

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd midnight-protocol-ui-forge

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck
```

### Environment Configuration
All environment variables are managed through Supabase Edge Secrets:
- `OPENROUTER_API_KEY` - AI model access
- `RESEND_API_KEY` - Email service
- `STRIPE_SECRET_KEY` - Payment processing
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Database access

## Deployment

### Lovable Platform
1. Visit [Lovable Project](https://lovable.dev/projects/0ace998b-9979-4091-8c2b-c2bd08562779)
2. Changes pushed to this repo auto-deploy
3. Edge functions require manual deployment via Supabase CLI

### Edge Function Deployment
```bash
supabase functions deploy <function-name>
```

### Database Migrations
```bash
supabase db push
```

## Production Checklist

- [ ] All edge functions deployed
- [ ] Cron jobs scheduled (hourly and daily)
- [ ] API keys configured in Supabase secrets
- [ ] Email templates tested
- [ ] Stripe webhooks configured
- [ ] Monitoring and alerting active
- [ ] Admin users created
- [ ] RLS policies reviewed
- [ ] All features working smoothly and without issue

## Current Status

**~90% Complete** - Platform is functionally complete with:
- ✅ All 7 MVP features implemented
- ✅ Intelligent matching system
- ✅ Automated processing pipeline
- ✅ Payment integration
- 🔧 All features working smoothly and without issue
- 🔧 Minor terminology cleanup needed
- 🔧 Production configuration pending

## Project Structure

```
/src
  /components     # React components
    /admin       # Admin dashboard components
    /dashboard   # User dashboard components
    /landing     # Landing page sections
    /onboarding  # Onboarding flow components
  /contexts      # React contexts (Auth, etc.)
  /hooks         # Custom React hooks
  /pages         # Route components
  /services      # API service layers
  /integrations  # External service integrations
/supabase
  /functions     # Edge functions (Deno)
  /migrations    # Database migrations
```

## Support & Resources

- **GitHub**: [Repository URL]
- **Lovable Dashboard**: https://lovable.dev/projects/0ace998b-9979-4091-8c2b-c2bd08562779
- **Supabase Dashboard**: app.supabase.com
- **Documentation**: See `/docs` folder for detailed guides

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0ace998b-9979-4091-8c2b-c2bd08562779) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0ace998b-9979-4091-8c2b-c2bd08562779) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
