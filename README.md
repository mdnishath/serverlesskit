# ServerlessKit

Open-source, serverless-first data management system with a WordPress-like dashboard. Define your data schema, get auto-generated REST APIs, granular RBAC, and deploy to any serverless platform.

## Features

- **Schema-driven** — Define collections with typed fields; APIs and UI are auto-generated
- **Serverless-first** — Zero cost at rest, wakes on demand (Vercel, Cloudflare, AWS Lambda, Node.js)
- **Role-based access control** — Granular permissions down to field level
- **Plugin system** — Extend with hooks, custom routes, and dashboard pages
- **Multi-platform** — Deploy anywhere via platform adapters
- **Type-safe end-to-end** — Schema to DB to API to client, all TypeScript

## Quick Start

```bash
# Clone and install
git clone https://github.com/mdnishath/serverlesskit.git
cd serverlesskit
pnpm install

# Build all packages
pnpm build

# Start the dashboard in dev mode
pnpm --filter @serverlesskit/dashboard dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+, TypeScript 5.5+ (strict) |
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Database | Turso (libSQL/SQLite), Drizzle ORM |
| Auth | Better-Auth v1 |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Linting | Biome |

## Monorepo Structure

```
serverlesskit/
  apps/
    dashboard/         — Next.js admin dashboard
  packages/
    core/              — Schema, CRUD, validation engine
    db/                — Database layer (Drizzle + Turso)
    auth/              — Authentication + RBAC
    api/               — Auto-generated REST API
    ui/                — Shared UI components
    shared/            — Shared utilities and types
    plugin-sdk/        — Plugin development kit
    adapters/          — Platform adapters (Vercel, Node.js)
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Schema Definition](docs/schema.md)
- [REST API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Plugin Development](docs/plugins.md)

## Scripts

```bash
pnpm build       # Build all packages
pnpm dev         # Start dev servers
pnpm test        # Run all tests
pnpm lint        # Lint all packages
pnpm typecheck   # Type-check all packages
pnpm format      # Format with Biome
pnpm test:e2e    # Run Playwright E2E tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
