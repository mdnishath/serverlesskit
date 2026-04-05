# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-06

### Added
- **Core Schema System** — 15 field types with Zod validation, defineCollection API
- **Database Layer** — Turso/SQLite with Drizzle ORM, auto-migration system
- **CRUD Engine** — createEntry, findMany, findOne, updateEntry, deleteEntry with lifecycle hooks
- **Auth & RBAC** — Password hashing (PBKDF2), session management, role hierarchy, field-level permissions
- **REST API** — Auto-generated endpoints with query parser (filter, sort, paginate)
- **Dashboard** — Next.js 16 admin panel with dark mode
  - Content type builder with drag-and-drop field reordering
  - Entry editor with dynamic fields (15 types)
  - Media library with upload, preview, and picker
  - User management with role hierarchy enforcement
  - Role & permission matrix (per content type)
  - Settings with registration control and API key management
  - Profile page with password change
- **Plugin SDK** — definePlugin API with hooks, routes, and scoped DB access
- **Platform Adapters** — Vercel and Node.js deployment adapters
- **432 tests** — Unit, integration, and E2E scaffolding with Vitest + Playwright
- **CI/CD** — GitHub Actions workflow for lint, typecheck, and test
