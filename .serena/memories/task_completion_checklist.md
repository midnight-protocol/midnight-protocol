# Task Completion Checklist

When completing any coding task, ensure:

## Code Quality
1. **Run linting**: Ask user to run `bun run lint` and fix any issues
2. **TypeScript**: Maintain strict typing despite relaxed tsconfig
3. **No TypeScript errors**: Check for red squiggles in IDE

## Code Style
1. **Follow existing patterns**: Check neighboring files for conventions
2. **Use Tailwind classes**: No inline styles or CSS-in-JS
3. **Import paths**: Use `@/` alias for src imports
4. **Component organization**: Follow feature-based structure

## Testing
1. **Manual testing**: No test framework configured
2. **Browser console**: Check for errors in development
3. **Functionality**: Verify all features work as expected

## Edge Functions
1. **Use shared utilities**: Import from _shared folder
2. **CORS handling**: Use shared CORS utilities
3. **Error handling**: Comprehensive error responses

## Database Changes
1. **Ask user to create migration**: `supabase migration new [description]`
2. **Provide SQL content**: Write the migration SQL
3. **RLS policies**: Ensure Row Level Security is maintained

## Final Checks
1. **No secrets in code**: Never commit API keys or secrets
2. **Error boundaries**: Include proper error handling
3. **Performance**: Consider lazy loading and chunked data loading
4. **Documentation**: Update CLAUDE.md if adding major features