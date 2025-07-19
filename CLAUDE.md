# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Midnight Protocol (formerly Praxis Network) is an AI-powered professional networking platform where users' AI agents have automated conversations overnight to discover collaboration opportunities. Users wake up to morning reports with curated introductions.

## Tech Stack

- **Frontend**: React 18.3.1, TypeScript, Vite 5.4.1, Tailwind CSS (terminal/cyberpunk theme)
- **UI Components**: shadcn/ui (50+ components), Radix UI
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **AI Integration**: OpenRouter API (Claude & Gemini models)
- **State Management**: TanStack Query v5, React Context
- **Forms**: React Hook Form + Zod validation
- **Email**: Resend
- **Payments**: Stripe

## Development Commands

```bash
# Start development server (port 8080)
bun run dev

# Build for production
bun run build

# Run linting
bun run lint
```

**IMPORTANT**: Always ask the user to run `bun run dev` or any Supabase commands - never run them yourself.

## Project Structure

```
/src
├── components/
│   ├── admin/          # Admin dashboard components
│   ├── dashboard/      # User dashboard components
│   ├── landing/        # Landing page sections
│   ├── onboarding/     # User onboarding flow
│   └── ui/             # shadcn/ui component library
├── contexts/           # React Context providers (AuthContext)
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/cache/          # Cache configuration
├── pages/              # Route components (lazy loaded)
├── services/           # API service layers
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

/supabase
├── functions/          # Edge functions (Deno runtime)
│   └── _shared/        # Shared utilities (CORS, validation)
└── migrations/         # Database migrations
```

## Key Architectural Patterns

1. **State Management**: TanStack Query for server state with centralized cache configuration
2. **Component Organization**: Feature-based with atomic design principles
3. **Error Handling**: Error boundaries and comprehensive error states
4. **Performance**: Lazy loading, chunked data loading, virtual lists
5. **Styling**: Tailwind CSS with custom terminal theme, no CSS-in-JS

## Database Schema

13 core tables including:

- users (with role-based access)
- personal_stories
- agent_profiles
- agent_conversations
- omniscient\_\* tables (AI matching system)

All tables have Row Level Security (RLS) enabled.

## Critical Development Guidelines

1. **Never run development server without asking** - Always ask user to run `bun run dev`
2. **Never run Supabase commands directly** - Ask user to run them
3. **SQL Migrations**: Ask user to create migration files, provide SQL content only
4. **Edge Functions**: Use shared utilities from \_shared folder
5. **Path Imports**: Use `@/` alias for src imports
6. **Error Handling**: Always include proper error boundaries
7. **TypeScript**: Maintain strict typing despite relaxed tsconfig

## Environment Variables

Configured via Supabase secrets:

- OPENROUTER_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- BATCH_SIZE
- BATCH_DELAY_MS

## Routes

- `/` - Landing page
- `/auth` - Authentication
- `/dashboard` - User dashboard (protected)
- `/onboarding` - User onboarding (protected)
- `/admin` - Admin dashboard (admin role only)
- `/networking` - Networking dashboard (protected)
- `/omniscient` - Omniscient admin (admin role only)

## Key Features

1. **Midnight Conversations**: AI agents converse at user's midnight timezone
2. **Morning Reports**: Daily email with conversation summaries and introductions
3. **Omniscient System**: Advanced AI-powered matching and analysis
4. **Subscription Tiers**: Free, Networker ($12/mo), Enterprise (custom)
5. **Admin Dashboard**: User management, system monitoring, bulk operations

## Testing & Development

- No test framework configured - manual testing only
- Check browser console for detailed error messages in development

## Common Tasks

### Working with Supabase Edge Functions

```bash
# Test locally (ask user to run)
supabase functions serve --env-file .env --no-verify-jwt
```

### Database Changes

1. Ask user to create migration: `supabase migration new [description]`
2. Provide SQL content for the migration file
3. Ask user to run: `supabase migration up`

### Adding New Components

1. Check existing components in src/components/ui for patterns
2. Follow shadcn/ui conventions
3. Use Tailwind classes, avoid inline styles
4. Include proper TypeScript types

## Current Focus Areas

- User onboarding flow completion
- Payment processing testing
- Admin dashboard enhancements
- Omniscient conversation system
- Production deployment preparation
