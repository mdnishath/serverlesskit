# Contributing to ServerlessKit

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm build`
4. Run tests: `pnpm test`

## Project Structure

This is a Turborepo monorepo with pnpm workspaces. Packages are in `packages/`, the dashboard app is in `apps/dashboard/`.

## Code Style

- **Formatter/Linter**: Biome (not ESLint/Prettier)
- **Indentation**: Tabs
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: Required

Run `pnpm format` to auto-format and `pnpm lint` to check.

## TypeScript Rules

- Strict mode enabled with `noUncheckedIndexedAccess`
- No `any` type — use `unknown` with type guards
- No default exports (except Next.js pages/layouts and config files)
- No barrel files (`index.ts` re-exports)
- All functions must have JSDoc with `@param` and `@returns`
- Max 150 lines per file

## Commit Convention

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
- `feat(schema): add field validation`
- `fix(api): handle null relations`
- `test(auth): add RBAC edge cases`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style above
3. Add tests for new functionality
4. Ensure all checks pass: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
5. Submit a PR with a clear description

## Testing

- **Unit tests**: Vitest, located in `__tests__/` within each package
- **Integration tests**: In `__tests__/integration/` directories
- **E2E tests**: Playwright, in the root `e2e/` directory

Run a specific package's tests:

```bash
pnpm --filter @serverlesskit/core test
pnpm --filter @serverlesskit/auth test
```

## Architecture Principles

1. **DRY** — Extract shared logic into `packages/shared`
2. **Single Responsibility** — Each file does one thing, max 150 lines
3. **Server-first** — Default to React Server Components
4. **Type-safe end-to-end** — Schema to DB to API to client
5. **Zero vendor lock-in** — Platform code behind adapters
6. **Result pattern** — Business logic returns `Result<T>`, never throws
