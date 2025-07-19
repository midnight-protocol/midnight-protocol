# Critical Development Guidelines

## Must Follow Rules
1. **Never run development server without asking** - Always ask user to run `bun run dev`
2. **Never run Supabase commands directly** - Ask user to run them
3. **SQL Migrations**: Ask user to create migration files, provide SQL content only
4. **Edge Functions**: Use shared utilities from _shared folder
5. **Path Imports**: Use `@/` alias for src imports
6. **Error Handling**: Always include proper error boundaries
7. **TypeScript**: Maintain strict typing despite relaxed tsconfig

## Environment Variables
All configured via Supabase secrets (not .env files):
- OPENROUTER_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- BATCH_SIZE
- BATCH_DELAY_MS

## Common Patterns
1. **State Management**: TanStack Query for server state
2. **Forms**: React Hook Form + Zod validation
3. **Styling**: Tailwind CSS only, terminal theme classes
4. **Components**: Follow shadcn/ui conventions
5. **Lazy Loading**: Use for route components

## Security
- Never expose or log secrets and keys
- Never commit secrets to repository
- All tables have Row Level Security (RLS) enabled
- Use Supabase Auth for authentication

## Performance
- Lazy loading for routes
- Chunked data loading for large datasets
- Virtual lists for long lists
- Centralized cache configuration