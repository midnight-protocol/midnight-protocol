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

## Development Setup

### Prerequisites

- Node.js & npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)) - v20.19.0 or higher
- Docker (for local development) [docker](https://docs.docker.com/get-docker/)
- Supabase CLI (for local development) [supabase cli](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Deno (for running tests) [deno](https://docs.deno.com/runtime/getting_started/installation/)

### Local Development

#### Checking out the project

```bash
git clone https://github.com/midnight-protocol/midnight-protocol.git
cd midnight-protocol
```

#### Setting up docker

- First Install Docker if needed
- Open the Docker Desktop app
- Click on the "Settings" icon in the top right corner
- Click on the "Resources -> File Sharing" tab
- Add the path to the project where it was cloned to the list of shared folders
- Click on the "Apply & Restart" button

#### Setting up the environment variables

```bash
cp .env.example .env
```

#### Running the backend locally

```bash
supabase start # starts the backend locally
supabase status # checks the status of the backend

# run the edge functions locally
supabase functions serve --env-file .env
```

#### Running the website locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

### Linking the backend to the cloud

```bash
supabase link # select the project you want to link to the cloud
```

### Edge Function Deployment

```bash
supabase functions deploy <function-name>
```

### Database Migrations

```bash
supabase db push
```

### Frontend Deployment

Merge updates into the deploy branch, it will be automatically deployed to the website via netlify.
