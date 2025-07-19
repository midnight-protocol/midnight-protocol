# Project Structure

## Frontend Structure
```
/src
├── components/
│   ├── admin/          # Admin dashboard components
│   ├── dashboard/      # User dashboard components
│   ├── landing/        # Landing page sections
│   ├── onboarding/     # User onboarding flow
│   ├── skeletons/      # Loading skeleton components
│   └── ui/             # shadcn/ui component library (50+ components)
├── contexts/           # React Context providers (AuthContext)
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/cache/          # Cache configuration for TanStack Query
├── pages/              # Route components (lazy loaded)
├── services/           # API service layers
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Backend Structure
```
/supabase
├── functions/          # Edge functions (Deno runtime)
│   ├── _shared/        # Shared utilities (CORS, validation)
│   ├── admin-api/      # Admin endpoints
│   ├── omniscient-*/   # AI matching system functions
│   └── [other functions]
└── migrations/         # Database migrations
```

## Key Routes
- `/` - Landing page
- `/auth` - Authentication
- `/dashboard` - User dashboard (protected)
- `/onboarding` - User onboarding (protected)
- `/admin` - Admin dashboard (admin role only)
- `/networking` - Networking dashboard (protected)
- `/omniscient` - Omniscient admin (admin role only)

## Database Tables (13 core tables)
- users (with role-based access: USER/ADMIN)
- personal_stories
- agent_profiles
- agent_conversations
- conversation_turns
- introduction_requests
- morning_reports
- subscribers
- omniscient_* tables (AI matching system)