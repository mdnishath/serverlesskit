# Getting Started

## Prerequisites

- **Node.js** 20.0.0 or later
- **pnpm** 9.0.0 or later (`npm install -g pnpm`)
- **Git**

## Installation

```bash
git clone https://github.com/mdnishath/serverlesskit.git
cd serverlesskit
pnpm install
```

## Build

Build all packages before running:

```bash
pnpm build
```

## Environment Configuration

Create a `.env` file in `apps/dashboard/`:

```env
# Database — Turso (production) or local SQLite (development)
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# Auth
AUTH_SECRET=your-secret-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production with Turso Cloud:

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

## Development Server

```bash
pnpm --filter @serverlesskit/dashboard dev
```

Open [http://localhost:3000](http://localhost:3000).

## Creating Your First Collection

Collections define your data structure. Create one programmatically:

```typescript
import { defineCollection, field } from '@serverlesskit/core';

export const blogPosts = defineCollection({
  name: 'Blog Posts',
  fields: {
    title: field.text({ required: true, min: 3, max: 200 }),
    content: field.richtext(),
    status: field.select({ options: ['draft', 'published'], default: 'draft' }),
    publishedAt: field.datetime({ required: false }),
  },
  timestamps: true,
  softDelete: true,
});
```

Or use the dashboard UI at `/collections/new` to create collections visually with the field builder.

## Running Tests

```bash
pnpm test          # All unit and integration tests
pnpm test:e2e      # Playwright E2E tests (requires dashboard running)
```

## Next Steps

- [Schema Definition](schema.md) — All field types and options
- [REST API](api.md) — Auto-generated API endpoints
- [Deployment](deployment.md) — Deploy to production
