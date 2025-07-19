# Suggested Commands

## Development Commands
```bash
# Start development server (port 8080)
bun run dev

# Build for production
bun run build

# Build for development mode
bun run build:dev

# Run ESLint for code linting
bun run lint

# Preview production build
bun run preview
```

## Supabase Commands (Ask user to run)
```bash
# Test edge functions locally
supabase functions serve --env-file .env --no-verify-jwt

# Deploy edge function
supabase functions deploy <function-name>

# Create new database migration
supabase migration new [description]

# Apply database migrations
supabase migration up

# Push database changes
supabase db push
```

## Git Commands
```bash
# Check status
git status

# Stage changes
git add .

# Commit changes
git commit -m "message"

# Push changes
git push
```

## System Commands (Darwin/macOS)
- `ls` - List files
- `cd` - Change directory
- `pwd` - Print working directory
- `find` - Find files (macOS version)
- `grep` - Search in files (prefer ripgrep `rg` if available)

## Important Notes
- **NEVER** run `bun run dev` or Supabase commands directly - always ask the user
- All environment variables are managed through Supabase secrets
- Use Bun instead of npm for all package management tasks