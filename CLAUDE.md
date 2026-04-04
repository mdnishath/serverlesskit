# 🚀 ServerlessKit — Serverless Management System

## Master Prompt Document for Claude Code Sessions

Project Name ServerlessKit (কাজ চলাকালীন নাম, পরে চেঞ্জ করা যাবে)
Tech Stack React, Next.js 15 (App Router), TypeScript, Turso (SQLite), Drizzle ORM
Architecture Serverless-first, Platform-agnostic, Plugin-based
Developer Md Nishath Khandakar
License MIT (Open Source)

---

## 📋 CLAUDE.md (প্রতিটা সেশনের শুরুতে Claude Code-এ পেস্ট করো)

```markdown
# CLAUDE.md — ServerlessKit

## Project Overview

ServerlessKit is an open-source, serverless-first data management system with a WordPress-like dashboard.
It supports custom data schemas, granular RBAC permissions, auto-generated RESTGraphQL APIs,
and deploys to any serverless platform (Vercel, Cloudflare, AWS Lambda, self-hosted Node.js).
When there are no visitors, it sleeps (zero cost). When traffic comes, it wakes up on demand.

## Tech Stack

- Runtime Node.js 20+, TypeScript 5.5+ (strict mode)
- Framework Next.js 15 (App Router only, NO pages router)
- UI React 19, Tailwind CSS 4, shadcnui components
- Database Turso (libSQLSQLite), Drizzle ORM (NO Prisma)
- Auth Better-Auth v1
- State Zustand (client), React Server Components (server)
- Monorepo Turborepo + pnpm workspaces
- Testing Vitest (unit), Playwright (e2e)
- Linting Biome (NOT ESLint+Prettier)

## Architecture Principles

1. DRY — Never repeat code. Extract shared logic into packagesshared.
2. Single Responsibility — Each file does ONE thing. Max 150 lines per file.
3. Composition over Inheritance — Use hooks, HOCs, and composition patterns.
4. Server-first — Default to RSC. Use use client only when necessary.
5. Type-safe end-to-end — Schema → DB → API → Client all typed.
6. Zero vendor lock-in — Abstract platform-specific code behind adapters.
7. Convention over Configuration — Follow file naming and folder conventions strictly.

## File Naming Conventions

- Components `PascalCase.tsx` (e.g., `DataTable.tsx`)
- Hooks `use-kebab-case.ts` (e.g., `use-auth.ts`)
- UtilsHelpers `kebab-case.ts` (e.g., `format-date.ts`)
- Types `kebab-case.types.ts` (e.g., `schema.types.ts`)
- Constants `kebab-case.constants.ts`
- Server Actions `kebab-case.action.ts`
- API Routes `route.ts` (Next.js convention)

## Code Rules

- NO `any` type. Use `unknown` + type guards if needed.
- NO default exports except for Next.js pageslayouts.
- NO barrel files (index.ts re-exports). Import directly.
- NO inline styles. Tailwind only.
- ALL functions must have JSDoc with @param and @returns.
- ALL async functions must have try-catch with typed errors.
- Prefer `const` arrow functions over `function` declarations.
- Use early returns to avoid deep nesting.
- Max function parameters 3. Use options object for more.
- Every component file types at top, component, then helpers.

## Commit Convention

type(scope) description

- feat(schema) add field validation
- fix(api) handle null relations
- refactor(dashboard) extract table component
- test(auth) add RBAC unit tests
- docs(readme) update installation guide

## Error Handling Pattern

Use a shared Result type
type ResultT, E = Error = { ok true; data T } { ok false; error E }
Never throw from business logic. Only throw in adaptersinfrastructure.

## When in doubt

- Prefer readability over cleverness
- Prefer explicit over implicit
- Prefer small files over large ones
- Ask before creating files larger than 150 lines
```

---

## 🏗️ MONOREPO STRUCTURE

```
serverlesskit
├── CLAUDE.md                          # ☝️ উপরের ফাইলটা
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
│
├── apps
│   ├── dashboard                     # Next.js 15 — Admin Dashboard
│   │   ├── app
│   │   │   ├── (auth)                # Auth routes group
│   │   │   │   ├── loginpage.tsx
│   │   │   │   ├── registerpage.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)           # Dashboard routes group
│   │   │   │   ├── layout.tsx         # Sidebar + header layout
│   │   │   │   ├── page.tsx           # Overviewhome
│   │   │   │   ├── collections       # Data collections
│   │   │   │   │   ├── page.tsx       # List all collections
│   │   │   │   │   ├── [slug]        # Single collection
│   │   │   │   │   │   ├── page.tsx   # List entries
│   │   │   │   │   │   └── [id]
│   │   │   │   │   │       └── page.tsx # Edit entry
│   │   │   │   │   └── newpage.tsx   # Create collection
│   │   │   │   ├── mediapage.tsx     # Media library
│   │   │   │   ├── userspage.tsx     # User management
│   │   │   │   ├── rolespage.tsx     # Rolepermission management
│   │   │   │   ├── settingspage.tsx  # System settings
│   │   │   │   └── pluginspage.tsx   # Plugin manager
│   │   │   ├── api                   # API routes
│   │   │   │   ├── auth[...all]route.ts
│   │   │   │   ├── content
│   │   │   │   │   └── [collection]route.ts
│   │   │   │   ├── uploadroute.ts
│   │   │   │   └── graphqlroute.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components                # Dashboard-specific components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── collection-form.tsx
│   │   │   └── entry-editor.tsx
│   │   ├── lib                       # Dashboard-specific utils
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── docs                          # Documentation site (later)
│       └── ...
│
├── packages
│   ├── core                          # 🧠 Core engine — schema, CRUD, validation
│   │   ├── src
│   │   │   ├── schema
│   │   │   │   ├── define-collection.ts
│   │   │   │   ├── field-types.ts
│   │   │   │   ├── field-validators.ts
│   │   │   │   └── schema.types.ts
│   │   │   ├── crud
│   │   │   │   ├── create.ts
│   │   │   │   ├── read.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── delete.ts
│   │   │   │   └── crud.types.ts
│   │   │   ├── hooks
│   │   │   │   ├── lifecycle-hooks.ts  # beforeCreate, afterUpdate, etc.
│   │   │   │   └── hooks.types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db                            # 💾 Database layer — Drizzle + adapters
│   │   ├── src
│   │   │   ├── client.ts              # DB connection factory
│   │   │   ├── migrate.ts             # Migration runner
│   │   │   ├── schema-to-drizzle.ts   # Dynamic schema → Drizzle table
│   │   │   └── db.types.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── auth                          # 🔐 Auth + RBAC
│   │   ├── src
│   │   │   ├── auth-config.ts         # Better-Auth setup
│   │   │   ├── rbac.ts               # Role-based access control
│   │   │   ├── permissions.ts         # Permission definitions
│   │   │   ├── middleware.ts          # Auth middleware
│   │   │   └── auth.types.ts
│   │   └── package.json
│   │
│   ├── api                           # 🌐 API layer — auto-generated REST + GraphQL
│   │   ├── src
│   │   │   ├── rest
│   │   │   │   ├── route-generator.ts  # Schema → REST routes
│   │   │   │   ├── query-parser.ts     # Filter, sort, paginate
│   │   │   │   └── response.ts         # Standardized responses
│   │   │   ├── graphql
│   │   │   │   ├── schema-generator.ts # Schema → GraphQL typedefs
│   │   │   │   ├── resolver-generator.ts
│   │   │   │   └── graphql-handler.ts
│   │   │   └── api.types.ts
│   │   └── package.json
│   │
│   ├── ui                            # 🎨 Shared UI components (shadcn-based)
│   │   ├── src
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── form-field.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── toast.tsx
│   │   │   └── sidebar-layout.tsx
│   │   └── package.json
│   │
│   ├── shared                        # 🔧 Shared utilities
│   │   ├── src
│   │   │   ├── result.ts              # ResultT,E type
│   │   │   ├── logger.ts             # Structured logging
│   │   │   ├── env.ts                # Environment validation (zod)
│   │   │   ├── constants.ts
│   │   │   └── shared.types.ts
│   │   └── package.json
│   │
│   ├── plugin-sdk                    # 🔌 Plugin development kit
│   │   ├── src
│   │   │   ├── define-plugin.ts
│   │   │   ├── plugin-hooks.ts
│   │   │   ├── plugin-api.ts
│   │   │   └── plugin.types.ts
│   │   └── package.json
│   │
│   └── adapters                      # ☁️ Platform adapters
│       ├── adapter-vercel
│       │   ├── srcindex.ts
│       │   └── package.json
│       ├── adapter-cloudflare
│       │   ├── srcindex.ts
│       │   └── package.json
│       ├── adapter-aws
│       │   ├── srcindex.ts
│       │   └── package.json
│       └── adapter-node
│           ├── srcindex.ts
│           └── package.json
│
├── plugins                           # Built-in plugins (examples)
│   ├── plugin-email
│   ├── plugin-backup
│   └── plugin-analytics
│
└── tooling                           # Shared dev configs
    ├── typescript
    │   └── tsconfig.base.json
    ├── biome
    │   └── biome.json
    └── tailwind
        └── tailwind.preset.js
```

---

## 📝 SESSION-BY-SESSION BUILD GUIDE

নিয়ম প্রতিটা সেশনের প্রম্পটে প্রথমে CLAUDE.md পেস্ট করো (বা `--init` দিয়ে লোড করো),
তারপর সেশনের নির্দিষ্ট prompt দাও। প্রতিটা সেশন শেষে `git commit` করো।

---

### 🔵 SESSION 1 Monorepo Foundation

```
SESSION 1 GOAL Set up the monorepo with Turborepo + pnpm workspaces.

TASKS
1. Initialize pnpm workspace with pnpm-workspace.yaml
2. Create turbo.json with builddevlinttest pipelines
3. Create shared tsconfig.base.json with strict TypeScript config
4. Create biome.json for linting + formatting
5. Create packagesshared with
   - srcresult.ts — ResultT,E type utility
   - srclogger.ts — Structured logger (console-based, JSON output)
   - srcenv.ts — Zod-based env validation helper
   - srcconstants.ts — Shared constants (version, app name)
   - srcshared.types.ts — Common types (Pagination, SortOrder, FilterOp)
   - package.json with proper exports field
6. Create toolingtypescripttsconfig.base.json
7. Create a root package.json with workspace scripts
8. Verify `pnpm install` and `pnpm build` work without errors

CONSTRAINTS
- Use pnpm 9+
- TypeScript strict mode with noUncheckedIndexedAccess
- Biome instead of ESLint+Prettier
- Every package uses exports field in package.json, NOT main
- Shared package has zero external dependencies (pure TS only)

OUTPUT A clean monorepo skeleton where `pnpm build` succeeds.
```

---

### 🔵 SESSION 2 Core Schema System

````
SESSION 2 GOAL Build the schema definition system — the heart of the project.

PREREQUISITE Session 1 complete, monorepo working.

TASKS
1. Create packagescoresrcschemafield-types.ts
   Define ALL field types as a discriminated union
   - text (min, max, regex, default)
   - number (min, max, integer, default)
   - boolean (default)
   - date (min, max, default)
   - datetime (min, max, default)
   - select (options[], multiple, default)
   - richtext (maxLength)
   - media (allowedTypes[], maxSize)
   - relation (collection, type 'one-to-one'  'one-to-many'  'many-to-many')
   - json (schema ZodSchema)
   - email, url, slug, color, password

2. Create packagescoresrcschemafield-validators.ts
   - Zod-based validation for each field type
   - validateField(fieldDef, value) → ResultT
   - generateZodSchema(collectionDef) → ZodObject

3. Create packagescoresrcschemadefine-collection.ts
   - defineCollection({ name, slug, fields, timestamps, softDelete, hooks })
   - Returns a frozen CollectionDefinition object
   - Auto-generates slug from name if not provided
   - Validates no duplicate field names
   - Validates relation targets exist

4. Create packagescoresrcschemaschema.types.ts
   - FieldType (discriminated union)
   - FieldDefinition
   - CollectionDefinition
   - SchemaRegistry (Map of all collections)

5. Create packagescoresrcschemaschema-registry.ts
   - registerCollection(def)
   - getCollection(slug)
   - getAllCollections()
   - validateRelations() — check all relation targets exist

6. Write tests packagescore__tests__schema.test.ts
   - Test every field type validation
   - Test collection definition
   - Test relation validation
   - Test duplicate field detection

CONSTRAINTS
- Zero dependencies except zod (peer dependency)
- All types must be inferred from definitions, NOT manually typed
- Use TypeScript generics so defineCollection returns TYPED fields
- Each file max 150 lines
- 100% test coverage for validators

EXAMPLE API (this is what the developer will write)
```ts
import { defineCollection, field } from '@serverlesskitcore';

export const projects = defineCollection({
  name 'Projects',
  fields {
    title field.text({ required true, min 3, max 200 }),
    status field.select({
      options ['draft', 'active', 'archived'],
      default 'draft',
    }),
    budget field.number({ min 0 }),
    client field.relation({ collection 'clients', type 'many-to-one' }),
    startDate field.date(),
    description field.richtext(),
    tags field.json(),
  },
  timestamps true,     auto createdAt, updatedAt
  softDelete true,     deletedAt instead of hard delete
});
````

```

---

### 🔵 SESSION 3 Database Layer

```

SESSION 3 GOAL Build the database layer with Drizzle ORM + Turso.

PREREQUISITE Session 2 complete, schema system working.

TASKS

1. Create packagesdbsrcclient.ts
   - createDbClient(config) — factory function
   - Support Turso (primary) and local SQLite (devtesting)
   - Connection pooling config
   - Auto-detect environment (dev vs production)

2. Create packagesdbsrcschema-to-drizzle.ts
   THIS IS THE MOST CRITICAL FILE.
   - Takes a CollectionDefinition from core
   - Dynamically generates Drizzle table definitions
   - Maps each FieldType to a Drizzle column type
     text → text()
     number → real() or integer()
     boolean → integer({ mode 'boolean' })
     datedatetime → text() (ISO string)
     select → text()
     richtext → text()
     media → text() (JSON string of media refs)
     relation → text() (foreign key)
     json → text({ mode 'json' })
     emailurlslugcolor → text()
     password → text()
   - Auto-add id (nanoid), createdAt, updatedAt, deletedAt
   - Generate junction tables for many-to-many relations

3. Create packagesdbsrcmigrate.ts
   - diffSchema(current, new) — detect schema changes
   - generateMigration(diff) — SQL migration statements
   - runMigration(db, statements) — execute with transaction
   - rollbackMigration(db, migrationId)
   - Store migration history in \_migrations table

4. Create packagesdbsrcdb.types.ts
   - DbClient type
   - MigrationRecord type
   - DbConfig type (turso url, authToken, etc.)

5. Write tests packagesdb**tests**schema-to-drizzle.test.ts
   - Test each field type mapping
   - Test relation table generation
   - Test migration diff detection

CONSTRAINTS

- Support both Turso (production) AND local SQLite (development)
- NEVER use raw SQL strings — always Drizzle query builder
- All migrations must be reversible
- Connection must work in serverless (short-lived connections)
- Use nanoid for primary keys (NOT auto-increment, NOT UUID)

IMPORTANT Serverless databases close connections aggressively.
Always use single-statement transactions where possible.

```

---

### 🔵 SESSION 4 CRUD Engine

```

SESSION 4 GOAL Build the CRUD engine that operates on any collection.

PREREQUISITE Session 3 complete, DB layer working.

TASKS

1. Create packagescoresrccrudcreate.ts
   - createEntry(db, collection, data, context) → ResultEntry
   - Validate all fields against schema
   - Run beforeCreate hooks
   - Insert into DB
   - Run afterCreate hooks
   - Return created entry with generated id and timestamps

2. Create packagescoresrccrudread.ts
   - findMany(db, collection, query) → ResultPaginatedResultEntry
   - findOne(db, collection, id) → ResultEntry null
   - Query support filter, sort, pagination, field selection, relation population
   - Filter operators eq, ne, gt, gte, lt, lte, in, notIn, contains, startsWith
   - Soft-delete aware (exclude deletedAt by default)

3. Create packagescoresrccrudupdate.ts
   - updateEntry(db, collection, id, data, context) → ResultEntry
   - Partial updates (only changed fields)
   - Validate changed fields only
   - Run beforeUpdateafterUpdate hooks
   - Auto-update updatedAt

4. Create packagescoresrccruddelete.ts
   - deleteEntry(db, collection, id, context) → Resultvoid
   - Soft delete if collection has softDelete enabled
   - Hard delete option forceDelete
   - Run beforeDeleteafterDelete hooks
   - Handle cascading deletes for relations

5. Create packagescoresrccrudcrud.types.ts
   - QueryOptions (filter, sort, page, limit, populate, fields)
   - FilterOperator enum
   - PaginatedResultT
   - CrudContext (user, permissions, locale)

6. Create packagescoresrchookslifecycle-hooks.ts
   - HookManager class
   - registerHook(collection, event, handler)
   - executeHooks(collection, event, payload)
   - Events beforeCreate, afterCreate, beforeUpdate, afterUpdate,
     beforeDelete, afterDelete, beforeRead, afterRead

7. Write tests for ALL CRUD operations
   - Use in-memory SQLite for testing
   - Test validation errors
   - Test filtering and sorting
   - Test pagination
   - Test soft delete
   - Test lifecycle hooks

CONSTRAINTS

- EVERY CRUD function returns ResultT, NEVER throws
- All operations are atomic (wrapped in transactions)
- Max 100 lines per CRUD file
- Query builder must be SQL-injection safe (Drizzle handles this)
- Pagination must return data, total, page, limit, totalPages

```

---

### 🔵 SESSION 5 Auth + RBAC System

```

SESSION 5 GOAL Build authentication and role-based access control.

PREREQUISITE Session 4 complete, CRUD engine working.

TASKS

1. Create packagesauthsrcauth-config.ts
   - Setup Better-Auth with Drizzle adapter
   - Emailpassword auth
   - Session management (JWT for API, cookie for dashboard)
   - Password hashing (argon2)
   - Support login, register, logout, forgot-password, reset-password

2. Create packagesauthsrcpermissions.ts
   Define the permission system
   - Resource-based collectionaction (e.g., projectscreate)
   - Wildcard support projects or read
   - Field-level permissions projectsupdatebudget (can update budget field)
   - Actions create, read, update, delete, publish, manage
   - Special admin (super admin)

3. Create packagesauthsrcrbac.ts
   - defineRole({ name, permissions[] })
   - checkPermission(user, resource, action) → boolean
   - checkFieldPermission(user, resource, action, field) → boolean
   - getAccessibleFields(user, resource, action) → string[]
   - Built-in roles super-admin, admin, editor, viewer

4. Create packagesauthsrcmiddleware.ts
   - requireAuth(handler) — wrapper that checks session
   - requirePermission(resource, action)(handler) — checks RBAC
   - rateLimiter(config) — basic rate limiting
   - apiKeyAuth(handler) — API key authentication for external access

5. Create packagesauthsrcauth.types.ts
   - User, Session, Role, Permission types
   - AuthContext type
   - ApiKey type

6. Write tests
   - Test role creation and permission checking
   - Test wildcard permissions
   - Test field-level permissions
   - Test middleware auth flow
   - Test API key validation

CONSTRAINTS

- Passwords MUST use argon2 (NOT bcrypt — better for serverless)
- Sessions stateless JWT for API, httpOnly cookies for dashboard
- API keys prefix with sk*live* and sk*test*
- Rate limiting must work in serverless (use DB-backed counter)
- NEVER store plain text passwords or API keys
- Permission check must be O(1) — pre-compute permission map on login

DEFAULT ROLES

```ts
const superAdmin = defineRole({
  name 'super-admin',
  description 'Full system access',
  permissions [''],
});

const editor = defineRole({
  name 'editor',
  description 'Can manage content',
  permissions ['read', 'create', 'update', 'media'],
});

const viewer = defineRole({
  name 'viewer',
  description 'Read-only access',
  permissions ['read'],
});
```

```

---

### 🔵 SESSION 6 Auto-Generated REST API

```

SESSION 6 GOAL Automatically generate REST API routes from schema definitions.

PREREQUISITE Session 5 complete, auth + RBAC working.

TASKS

1. Create packagesapisrcrestroute-generator.ts
   Given a CollectionDefinition, generate handlers for
   - GET apicontent{collection} → findMany (list)
   - GET apicontent{collection}id → findOne
   - POST apicontent{collection} → createEntry
   - PUT apicontent{collection}id → updateEntry (full)
   - PATCH apicontent{collection}id → updateEntry (partial)
   - DELETE apicontent{collection}id → deleteEntry
     Each handler parse request → check auth → check permission → CRUD → respond

2. Create packagesapisrcrestquery-parser.ts
   Parse URL query parameters into QueryOptions
   - filter[status]=active → { filter { status { eq 'active' } } }
   - filter[budget][gte]=1000 → { filter { budget { gte 1000 } } }
   - sort=-createdAt,title → { sort [{ field 'createdAt', order 'desc' }, ...] }
   - page=2&limit=25 → { page 2, limit 25 }
   - fields=title,status → { fields ['title', 'status'] }
   - populate=client → { populate ['client'] }

3. Create packagesapisrcrestresponse.ts
   Standardized API responses
   - success(data, meta) → { ok true, data, meta }
   - error(code, message, details) → { ok false, error { code, message, details } }
   - paginated(data, pagination) → { ok true, data, meta { pagination } }
     Standard HTTP status codes mapping

4. Create packagesapisrcrestapi-docs-generator.ts
   Auto-generate OpenAPISwagger spec from schema
   - GET apidocs → Swagger UI
   - GET apidocsopenapi.json → OpenAPI spec
   - Each collection → CRUD endpoints documented
   - Requestresponse schemas from field definitions

5. Write tests
   - Test query parameter parsing
   - Test route generation for sample collection
   - Test auth middleware integration
   - Test error responses
   - Test pagination responses

CONSTRAINTS

- Query parser must sanitize ALL inputs (prevent injection)
- Pagination max limit 100 (configurable)
- Default limit 25
- Response always includes request duration in meta
- API versioning via URL prefix apiv1content...
- Support both JSON and form-data for POSTPUT
- Content-Type validation on all requests

```

---

### 🔵 SESSION 7 Dashboard UI — Layout + Navigation

```

SESSION 7 GOAL Build the dashboard shell — layout, sidebar, header, navigation.

PREREQUISITE Session 6 complete, API working.

TASKS

1. Initialize appsdashboard as Next.js 15 app
   - App Router only
   - Tailwind CSS 4 + shadcnui setup
   - Import @serverlesskitui components
   - Configure path aliases (@, @serverlesskit)

2. Create the dashboard layout
   - appsdashboardapp(dashboard)layout.tsx
   - Collapsible sidebar (mobile slide-out, desktop fixed)
   - Top header with user avatar, notification bell, search, theme toggle
   - Breadcrumb navigation
   - Mobile responsive

3. Create sidebar navigation
   - Logobrand at top
   - Nav sections
     📊 Overview (dashboard home)
     📁 Collections (dynamic — lists all registered collections)
     📎 Media Library
     👥 Users
     🔐 Roles & Permissions
     🔌 Plugins
     ⚙️ Settings
   - Active state styling
   - Collapseexpand animation

4. Create appsdashboardapp(dashboard)page.tsx — Overview
   - Welcome message
   - Quick stats cards total entries, total users, total collections, storage used
   - Recent activity feed (last 10 CRUD operations)
   - Quick action buttons New Collection, New Entry

5. Create appsdashboardapp(auth)layout.tsx + loginpage.tsx
   - Clean login page with emailpassword
   - Forgot password link
   - Redirect to dashboard after login
   - Redirect to login if not authenticated

6. Set up auth middleware
   - appsdashboardmiddleware.ts
   - Protect all (dashboard) routes
   - Allow (auth) routes without session
   - Handle API routes separately

CONSTRAINTS

- ALL components use shadcnui as base
- Dark mode support from day 1 (use next-themes)
- Sidebar state persists in localStorage
- Mobile breakpoint 768px
- Loading states for all async operations
- Error boundaries on every route
- Skeleton loaders, NOT spinners

DESIGN GUIDELINES

- Clean, minimal, professional — like Linear or Notion
- Primary color configurable via CSS variables
- Spacing consistent 4px grid (p-1, p-2, p-4, etc.)
- Typography Inter font family
- Border radius 8px default
- Shadows subtle, layered (shadow-sm for cards)

```

---

### 🔵 SESSION 8 Dashboard UI — Collection Manager

```

SESSION 8 GOAL Build the UI for creating and managing data collections.

PREREQUISITE Session 7 complete, dashboard shell working.

TASKS

1. Create New Collection page — (dashboard)collectionsnewpage.tsx
   - Collection name input (auto-generates slug)
   - Field builder UI
     - Click Add Field → select field type from dropdown
     - Each field shows name, type, required toggle, settings
     - Drag-and-drop to reorder fields
     - Delete field button with confirmation
     - Field settings panel (slides out) validation rules, default value, etc.
   - Options timestamps toggle, soft-delete toggle
   - Save Collection button → calls API to register collection
   - Preview shows what the API endpoints will look like

2. Create Collection list page — (dashboard)collectionspage.tsx
   - Tablegrid of all collections
   - Shows name, entry count, field count, last modified
   - Actions edit schema, view entries, delete collection
   - Searchfilter collections

3. Create Collection entries page — (dashboard)collections[slug]page.tsx
   - DataTable component showing all entries
   - Columns auto-generated from collection fields
   - Features sort, filter, search, bulk select, bulk delete
   - Pagination controls
   - New Entry button
   - Row click → edit entry

4. Create Entry editor — (dashboard)collections[slug][id]page.tsx
   - Dynamic form generated from collection schema
   - Each field type renders appropriate input
     text → Input
     number → Input type=number
     boolean → Switch
     date → DatePicker
     select → SelectCombobox
     richtext → Rich text editor (Tiptap)
     media → Media picker (opens media library modal)
     relation → Relation picker (search + select)
     json → JSON editor
     color → Color picker
   - Save, Delete, Duplicate actions
   - Unsaved changes warning
   - Auto-save draft (optional)

5. Create shared form field component — packagesuisrcdynamic-field.tsx
   - DynamicField component that renders ANY field type
   - Props fieldDefinition, value, onChange, error
   - This is the DRY component used everywhere

CONSTRAINTS

- Field builder must support ALL field types from Session 2
- Drag-and-drop use @dnd-kitcore (lightweight)
- Rich text use Tiptap (works in serverless)
- Form state React Hook Form + Zod resolver
- All forms have loading state on submit
- Optimistic updates where possible
- Undo support for delete operations (5 second window)

```

---

### 🔵 SESSION 9 Media Library + File Upload

```

SESSION 9 GOAL Build media upload and management system.

PREREQUISITE Session 8 complete, collection manager working.

TASKS

1. Create media upload handler — appsdashboardappapiuploadroute.ts
   - Accept multipartform-data
   - Validate file type and size
   - Generate unique filename (nanoid + original extension)
   - Upload to storage (R2S3 via adapter)
   - Generate thumbnails for images (sharp)
   - Store metadata in \_media collection
   - Return media entry with URLs

2. Create packagescoresrcmediastorage-adapter.ts
   - StorageAdapter interface upload, delete, getUrl, list
   - Implementations
     - LocalStorage (dev saves to .uploads)
     - R2Adapter (Cloudflare R2)
     - S3Adapter (AWS S3 compatible)
   - Factory createStorageAdapter(config)

3. Create Media Library page — (dashboard)mediapage.tsx
   - Grid view of all uploaded media
   - Upload zone (drag & drop + click)
   - Multi-file upload with progress bars
   - Filter by type (image, video, document, audio)
   - Search by filename
   - Delete with confirmation
   - Click → detail panel (filename, size, type, dimensions, URL, copy link)

4. Create MediaPicker component — packagesuisrcmedia-picker.tsx
   - Modal that opens media library
   - Select existing or upload new
   - Returns selected media reference
   - Used in entry editor for media fields

5. Create image optimization pipeline
   - Auto-generate thumbnail (150px), small (480px), medium (960px), large (1920px)
   - WebP conversion
   - Lazy generation (generate on first request, cache forever)

CONSTRAINTS

- Max file size 50MB (configurable)
- Allowed types configurable per field
- Storage adapter must be swappable without code changes
- Image optimization must work in serverless (use sharpwasm)
- All URLs must be signed (time-limited) for private media
- Support jpg, png, gif, webp, svg, mp4, pdf, docx, xlsx

```

---

### 🔵 SESSION 10 Users + Roles Management UI

```

SESSION 10 GOAL Build user management and rolepermission management UI.

PREREQUISITE Session 9 complete, media library working.

TASKS

1. Users page — (dashboard)userspage.tsx
   - DataTable of all users
   - Columns avatar, name, email, role, status, last login
   - Actions edit, deactivate, delete, reset password
   - Invite user button (sends email invitation)
   - Bulk actions deactivate, change role

2. User edit page — (dashboard)users[id]page.tsx
   - Edit name, email, avatar
   - Change role
   - View activity log
   - Active sessions list
   - Deactivatedelete account

3. Roles page — (dashboard)rolespage.tsx
   - List all roles with permission count
   - Create new role
   - Edit role
   - Delete role (prevent if users assigned)

4. Role editor — (dashboard)rolesnewpage.tsx (and [id]page.tsx)
   - Role name and description
   - Permission matrix UI
     Rows = collections + system resources
     Columns = actions (create, read, update, delete, manage)
     Cells = checkboxes
   - Field-level permissions toggle (expandable per collection)
   - Preview Users with this role can...

5. Create invitation system
   - Generate invite token (24h expiry)
   - Send invite email
   - Accept invite → set password → login

CONSTRAINTS

- Cannot delete last super-admin
- Cannot change own role (prevent lock-out)
- Password reset token-based, 1h expiry
- Activity log store in \_audit_log collection
- Permission matrix must be fast even with 50+ collections

```

---

### 🔵 SESSION 11 Plugin System

```

SESSION 11 GOAL Build the plugin architecture.

PREREQUISITE Session 10 complete, usersroles working.

TASKS

1. Create packagesplugin-sdksrcdefine-plugin.ts
   - definePlugin({ name, version, description, setup })
   - setup function receives PluginAPI
   - PluginAPI exposes
     - registerHook(event, handler)
     - registerRoute(method, path, handler)
     - registerDashboardPage(config)
     - registerFieldType(config) — custom field types
     - registerAction(config) — custom actions in UI
     - getDb() — scoped database access
     - getConfig() — plugin configuration

2. Create packagescoresrcpluginplugin-loader.ts
   - loadPlugins(pluginDir) — discover and load plugins
   - Plugin lifecycle install → activate → deactivate → uninstall
   - Plugin isolation each plugin gets scoped DB tables (prefixed)
   - Plugin dependency resolution

3. Create Plugin Manager page — (dashboard)pluginspage.tsx
   - List installed plugins
   - Enabledisable toggle
   - Settings button → plugin config page
   - Install Plugin button

4. Build example plugins
   - plugin-email Send emails via SMTPResend on CRUD events
   - plugin-backup Scheduled database backups to storage
   - plugin-webhook Send webhooks on CRUD events

CONSTRAINTS

- Plugins CANNOT access other plugins' data
- Plugins CANNOT modify core schema
- Plugins must declare required permissions in manifest
- Plugin routes are prefixed apiplugins{plugin-name}...
- Plugin dashboard pages are under plugins{plugin-name}...
- Hot-reload plugins in development mode

```

---

### 🔵 SESSION 12 Platform Adapters

```

SESSION 12 GOAL Build adapters for multi-platform deployment.

PREREQUISITE Session 11 complete, plugin system working.

TASKS

1. Create packagesadaptersadapter-vercel
   - Export handler compatible with Vercel serverless
   - Configure Vercel-specific headers, caching
   - Support Vercel Blob for media storage
   - vercel.json generation

2. Create packagesadaptersadapter-cloudflare
   - Export handler for Cloudflare Workers
   - D1 database support (alternative to Turso)
   - R2 storage integration
   - wrangler.toml generation

3. Create packagesadaptersadapter-aws
   - Lambda handler export
   - DynamoDB or RDS option
   - S3 storage integration
   - SAMCDK template generation

4. Create packagesadaptersadapter-node
   - ExpressHono server wrapper
   - For self-hosting on VPSDocker
   - PM2 config generation
   - Docker + docker-compose files

5. Create CLI `npx serverlesskit deploy`
   - Auto-detect platform from config
   - Build + optimize + deploy
   - Platform-specific optimizations

CONSTRAINTS

- Adapter interface must be identical across all platforms
- Core code NEVER imports platform-specific code
- Adapter selection via config file serverlesskit.config.ts
- Each adapter 200 lines of code
- Test with actual deployment to each platform

CONFIG EXAMPLE

```ts
 serverlesskit.config.ts
export default defineConfig({
  adapter 'vercel',  or 'cloudflare', 'aws', 'node'
  database {
    provider 'turso',
    url process.env.TURSO_URL,
    authToken process.env.TURSO_AUTH_TOKEN,
  },
  storage {
    provider 'r2',  or 's3', 'local', 'vercel-blob'
    bucket 'my-media',
  },
  auth {
    secret process.env.AUTH_SECRET,
    providers ['credentials'],
  },
});
```

```

---

### 🔵 SESSION 13 Settings, Config, and Polish

```

SESSION 13 GOAL Build settings page, system configuration, and final polish.

PREREQUISITE Session 12 complete, adapters working.

TASKS

1. Settings page — (dashboard)settingspage.tsx
   Tabs
   - General site name, description, default language, timezone
   - API API keys management (create, revoke, list), rate limit config
   - Media storage provider config, max upload size, allowed types
   - Email SMTP config, email templates
   - Backups manual backup, scheduled backup config
   - Advanced debug mode, cache config, database info

2. System health dashboard
   - Database connection status
   - Storage connection status
   - API response time (last 100 requests average)
   - Diskstorage usage
   - Active sessions count

3. Audit log viewer
   - Filterable log of all system events
   - Who did what, when, from where (IP)
   - Export as CSV

4. Search everything
   - Global search in header
   - Search across collections, entries, users, settings, docs
   - Keyboard shortcut Cmd+K Ctrl+K
   - Recent searches

5. Onboarding flow
   - First-time setup wizard
   - Create admin account
   - Configure database
   - Create first collection
   - Choose adapterdeploy target

CONSTRAINTS

- Settings stored in \_settings collection in DB
- API keys are hashed before storage (show once on creation)
- All config changes require admin permission
- Audit log is append-only (cannot delete)

```

---

### 🔵 SESSION 14 Testing + Documentation

```

SESSION 14 GOAL Comprehensive testing and documentation.

TASKS

1. Unit tests (Vitest)
   - packagescore schema, CRUD, hooks — target 90%+ coverage
   - packagesauth RBAC, permissions — target 95%+ coverage
   - packagesapi query parser, response, route generation
   - packagesdb schema-to-drizzle mapping, migrations

2. Integration tests
   - Full CRUD flow create collection → add entry → read → update → delete
   - Auth flow register → login → access protected route → logout
   - Permission flow create role → assign → verify access
   - API flow REST request → response validation

3. E2E tests (Playwright)
   - Login flow
   - Create collection via UI
   - Add entry via UI
   - Media upload
   - User management

4. Documentation
   - README.md quick start, features, architecture
   - docsgetting-started.md step-by-step setup guide
   - docsschema.md how to define collections
   - docsapi.md REST API reference (auto-generated)
   - docsdeployment.md deploy to each platform
   - docsplugins.md plugin development guide
   - CONTRIBUTING.md how to contribute

5. CLI help text and error messages — user-friendly

CONSTRAINTS

- Tests must run in CI (GitHub Actions)
- E2E tests use test database (reset before each test)
- Documentation includes code examples for every feature
- All docs in English (primary audience developers worldwide)

```

---

### 🔵 SESSION 15 CICD + Open Source Release

```

SESSION 15 GOAL Prepare for open-source release.

TASKS

1. GitHub Actions
   - CI lint + type-check + test on every PR
   - CD publish packages to npm on tag
   - E2E run Playwright on staging

2. npm packages setup
   - @serverlesskitcore
   - @serverlesskitdb
   - @serverlesskitauth
   - @serverlesskitapi
   - @serverlesskitui
   - @serverlesskitplugin-sdk
   - @serverlesskitadapter-vercel (etc.)
   - @serverlesskitcli
   - create-serverlesskit (scaffolding)

3. Create `create-serverlesskit` CLI
   - `npx create-serverlesskit my-project`
   - Interactive prompts adapter, database, auth
   - Scaffold project with correct config
   - Install dependencies
   - Print next steps

4. GitHub repo setup
   - Issue templates
   - PR template
   - Code of conduct
   - Security policy
   - Changelog (auto-generated from commits)

5. Landing page (optional)
   - Simple docs site with AstroNext.js
   - Hero, features, quickstart, API docs
   - GitHub stars badge, npm version badge

CONSTRAINTS

- Semantic versioning (semver)
- Changesets for version management
- All packages must have identical version numbers initially
- License MIT
- README must have install → quickstart → features → docs link

````

---

## ⚡ QUICK REFERENCE — DRY PATTERNS

### Result Type (use everywhere)
```ts
 packagessharedsrcresult.ts
type ResultT, E = AppError =
   { ok true; data T }
   { ok false; error E };

type AppError = {
  code string;       VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED
  message string;    Human readable
  details unknown;   Field errors, stack trace, etc.
};
````

### API Response (use in all API routes)

```ts
 packagesapisrcrestresponse.ts
const apiResponse = {
  success T(data T, meta Recordstring, unknown) =
    NextResponse.json({ ok true, data, meta }),

  error (status number, code string, message string) =
    NextResponse.json({ ok false, error { code, message } }, { status }),

  paginated T(data T[], pagination Pagination) =
    NextResponse.json({ ok true, data, meta { pagination } }),
};
```

### Permission Check (use before every mutation)

```ts
 In any API handler or server action
const allowed = checkPermission(ctx.user, 'projects', 'update');
if (!allowed) return apiResponse.error(403, 'FORBIDDEN', 'No permission');
```

### Dynamic Field Renderer (use in all forms)

```tsx
 Single component renders ANY field type
DynamicField
  definition={fieldDef}
  value={value}
  onChange={onChange}
  error={errors[fieldName]}

```

---

## 🎯 SUCCESS CRITERIA

প্রতিটা সেশন শেষে চেক করো

- [ ] `pnpm build` — কোনো error নাই
- [ ] `pnpm typecheck` — কোনো type error নাই
- [ ] `pnpm lint` — কোনো lint error নাই
- [ ] `pnpm test` — সব test pass
- [ ] কোনো file 150 লাইনের বেশি না
- [ ] কোনো duplicated code নাই
- [ ] সব function-এ JSDoc আছে
- [ ] git commit করা হয়েছে proper message দিয়ে

---

## 📌 IMPORTANT NOTES

1. একবারে পুরোটা বানাতে যেও না। প্রতিটা সেশন আলাদা ভাবে শেষ করো, টেস্ট করো, কমিট করো।

2. Session 1-6 হলো backend — এগুলো ছাড়া কিছুই কাজ করবে না। Dashboard (Session 7+) আগে করতে যেও না।

3. Schema system (Session 2) সবচেয়ে critical। এটা ভুল হলে পুরো প্রজেক্ট ভুল হবে। এখানে সময় দাও।

4. প্রতিটা session-এ Claude Code-এ CLAUDE.md ফাইলটা প্রজেক্ট রুটে রাখো। Claude Code অটোমেটিক এটা পড়বে।

5. Session prompt কপি-পেস্ট করো Claude Code-এ। প্রয়োজনে modify করো তোমার need অনুযায়ী।

6. Stuck হলে ছোট করে ভাঙো। যেমন Session 2 যদি বড় মনে হয়, Session 2a Field Types Only এবং Session 2b Collection Definition — এভাবে ভাগ করো।
