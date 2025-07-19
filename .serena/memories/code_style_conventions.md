# Code Style & Conventions

## TypeScript Configuration
- Strict mode enabled with some relaxations
- `noImplicitAny`: false
- Path alias: `@/` for src imports
- Maintain strict typing despite relaxed tsconfig

## React Components
- Functional components with TypeScript interfaces
- Props interface named `Props` or more descriptive names
- Error boundaries for comprehensive error handling
- Lazy loading for route components

## File Organization
- Feature-based organization with atomic design principles
- Components grouped by feature (admin/, dashboard/, landing/, etc.)
- Shared UI components in ui/ directory following shadcn/ui conventions

## Styling
- Tailwind CSS classes only - no inline styles or CSS-in-JS
- Custom terminal/cyberpunk theme
- Consistent use of theme variables (terminal-bg, terminal-text, etc.)

## Imports
- Use `@/` alias for src imports
- Group imports: React first, then external packages, then local imports

## State Management
- TanStack Query for server state with centralized cache configuration
- React Context for auth and global state
- Custom hooks in hooks/ directory

## Error Handling
- Always include proper error boundaries
- Comprehensive error states in components
- Clear error messages for development