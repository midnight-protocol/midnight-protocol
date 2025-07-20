# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Commands
- `npm run dev` - Start Vite development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run lint` - Run ESLint on all TypeScript/TSX files
- `npm run preview` - Preview production build locally
- **IMPORTANT**: never try to run the dev server with npm run dev, it is already running

### Supabase Edge Functions
- `supabase start` - Start local Supabase instance (requires Docker)
- `supabase status` - Check status of local Supabase services
- `supabase functions serve --env-file .env` - Serve edge functions locally
- `supabase functions deploy <function-name>` - Deploy specific edge function
- `supabase db push` - Push database migrations to cloud
- `supabase link` - Link project to Supabase cloud instance

## Architecture Overview

### Frontend Architecture
The frontend is a React 18 SPA using Vite, structured as follows:

- **Component Structure**: Uses shadcn/ui components with Radix UI primitives and custom styling
- **State Management**: React Context (AuthContext) + React Query v5 for server state
- **Routing**: React Router v6 with lazy-loaded pages and protected routes
- **Styling**: Tailwind CSS with custom terminal/cyberpunk theme
- **Authentication**: Supabase Auth with role-based access control (admin/user)

### Backend Architecture (Supabase)
- **24 Edge Functions**: Deno-based serverless functions handling business logic
- **Core Functions**:
  - `admin-api`: Comprehensive admin dashboard operations
  - `omniscient-system`: AI matching and conversation orchestration
  - `internal-api`: User-facing API operations
  - Email functions: `send-*` functions for transactional emails
  - Cron jobs: `generate-morning-reports`, `send-daily-reports`

### Key Technical Patterns
- **Error Boundaries**: `AuthErrorBoundary` wraps the app for auth error handling
- **Lazy Loading**: All pages are lazy-loaded for performance
- **Protected Routes**: `ProtectedRoute` component handles authentication/authorization
- **Configuration Validation**: Startup validation in `main.tsx` with `config-validator.ts`
- **Cache Management**: LocalStorageCache for client-side caching, React Query for server state

### Database Structure
- PostgreSQL with 13+ core tables
- Row-level security enabled
- Key tables: `users`, `conversations`, `matches`, `personal_stories`, `system_configs`
- Admin oversight through audit logs and activity tracking

## Code Conventions

### Component Organization
- Page components in `src/pages/`
- Reusable components in `src/components/` with subdirectories:
  - `ui/` - shadcn/ui components
  - `admin/` - Admin dashboard components
  - `dashboard/` - User dashboard components
  - `landing/` - Landing page sections
  - `skeletons/` - Loading skeleton components

### Service Layer
- `src/services/` contains API service modules
- Edge functions in `supabase/functions/` with shared utilities in `_shared/`
- Type definitions in `src/types/` and function-specific types in edge functions

### Import Conventions
- Use `@/` alias for src imports (configured in vite.config.ts and tsconfig.json)
- Prefer named imports over default imports where possible
- Group imports: React/external libs, internal components, types, utilities

### TypeScript Configuration
- Strict mode enabled with specific overrides:
  - `noImplicitAny: false` - Allows implicit any types
  - `@typescript-eslint/no-unused-vars: off` - Disabled in ESLint
  - `@typescript-eslint/no-explicit-any: off` - Allows explicit any types

## Environment Configuration

### Required Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Configuration Validation
The app validates configuration on startup through `config-validator.ts`. In development mode, configuration errors display a red overlay with specific error details.

## Development Notes

### AI/LLM Integration
- Uses OpenRouter API for AI model access (Claude 4, Gemini Pro 2.5)
- LLM service abstraction in `supabase/functions/_shared/llm-service.ts`
- Prompt management system with versioning and templates

### Admin System
The comprehensive admin system includes:
- User management with test user capabilities
- System health monitoring and alerts
- LLM conversation logs and analytics
- Omniscient system for AI-driven matching
- Email delivery tracking and bulk operations

### Performance Considerations
- Lazy loading for all routes
- React Query with stale-while-revalidate pattern
- LocalStorage caching for frequently accessed data
- Optimized bundle splitting through Vite

### Security Implementation
- Row-level security in Supabase
- Admin role verification in edge functions
- CORS handling in all edge functions
- Rate limiting capabilities in shared utilities

## API Service Architecture Notes
- All admin functionality uses `src/services/admin-api.service.ts` which wraps calls to the `supabase/functions/admin-api/` edge function
- All omniscient functions use `src/services/omniscient.service.ts` and `supabase/functions/omniscient-system/` edge function
- All other frontend functionality should call `src/services/internal-api.service.ts` which wraps calls to the `@supabase/functions/internal-api/` edge function
- Existing edge functions being deprecated should not be extended
- No new functions should be created unless explicitly requested
- Deprecating all direct Supabase SDK calls from pages and components
- All calls must eventually use one of the appropriate API services
- API services should always invoke edge functions and never make database calls directly from the Supabase SDK

## Claude Code Guidelines
- Always ask the user to run Supabase CLI commands for you, never run them directly
- Dont try to check linting after implementing a feature