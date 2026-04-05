# Deployment Guide

ServerlessKit supports multiple deployment targets via platform adapters.

## Vercel

The default and recommended deployment target.

### Setup

1. Install the Vercel CLI: `npm i -g vercel`
2. Configure your project:

```typescript
// serverlesskit.config.ts
export default defineConfig({
  adapter: 'vercel',
  database: {
    provider: 'turso',
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

3. Deploy:

```bash
pnpm build
vercel deploy
```

### Environment Variables

Set these in your Vercel project settings:

- `TURSO_DATABASE_URL` — Your Turso database URL
- `TURSO_AUTH_TOKEN` — Turso auth token
- `AUTH_SECRET` — Secret for session signing

## Node.js (Self-Hosted)

For VPS, Docker, or on-premise deployment.

### Setup

```typescript
// serverlesskit.config.ts
export default defineConfig({
  adapter: 'node',
  database: {
    provider: 'turso',
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

### Docker

The Node.js adapter can generate Docker configuration:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable pnpm && pnpm install --frozen-lockfile && pnpm build
EXPOSE 3000
CMD ["node", "apps/dashboard/.next/standalone/server.js"]
```

### PM2

```bash
pm2 start ecosystem.config.js
```

## Database Setup

### Turso Cloud (Production)

1. Install Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Create a database: `turso db create serverlesskit`
3. Get the URL: `turso db show serverlesskit --url`
4. Create a token: `turso db tokens create serverlesskit`

### Local SQLite (Development)

Use a file-based SQLite database for local development:

```env
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | Yes | Database connection URL |
| `TURSO_AUTH_TOKEN` | Production | Turso auth token |
| `AUTH_SECRET` | Yes | Secret for signing sessions/tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Public-facing URL of the app |
