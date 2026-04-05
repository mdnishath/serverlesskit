# Schema Definition

Collections are the core building block of ServerlessKit. Each collection defines a data structure with typed fields, validation rules, and lifecycle options.

## Defining a Collection

```typescript
import { defineCollection, field } from '@serverlesskit/core';

export const projects = defineCollection({
  name: 'Projects',
  fields: {
    title: field.text({ required: true, min: 3, max: 200 }),
    budget: field.number({ min: 0, integer: true }),
    active: field.boolean({ default: true }),
    status: field.select({ options: ['planning', 'active', 'complete'] }),
  },
  timestamps: true,   // Adds createdAt, updatedAt
  softDelete: true,   // Adds deletedAt (entries are hidden, not removed)
});
```

## Field Types

### Text Fields

```typescript
field.text({ required: true, min: 3, max: 500, regex: /^[A-Z]/ })
field.email({ required: true, unique: true })
field.url()
field.slug({ unique: true })
field.color()             // Hex color strings
field.password({ min: 8 })
```

### Numeric & Boolean

```typescript
field.number({ min: 0, max: 100, integer: true })
field.boolean({ default: false })
```

### Date & Time

```typescript
field.date()              // ISO date string (YYYY-MM-DD)
field.datetime()          // ISO datetime string
```

### Rich Content

```typescript
field.richtext({ maxLength: 50000 })
field.json()              // Arbitrary JSON data
```

### Selection

```typescript
field.select({
  options: ['draft', 'published', 'archived'],
  default: 'draft',
})
```

### Media & Relations

```typescript
field.media({ allowedTypes: ['image/jpeg', 'image/png'], maxSize: 5_000_000 })
field.relation({ collection: 'categories', type: 'many-to-one' })
```

Relation types: `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many`.

## Field Options

All fields support these common options:

| Option | Type | Description |
|--------|------|-------------|
| `required` | `boolean` | Whether the field is required (default: `true` for most types) |
| `unique` | `boolean` | Enforce uniqueness |
| `hidden` | `boolean` | Hide from API responses |
| `default` | varies | Default value when not provided |

## Collection Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Display name (slug is auto-generated) |
| `slug` | `string` | Custom URL slug (optional) |
| `timestamps` | `boolean` | Add `createdAt`/`updatedAt` fields |
| `softDelete` | `boolean` | Use `deletedAt` instead of hard delete |

## Schema Registry

Register collections to make them available system-wide:

```typescript
import { createSchemaRegistry } from '@serverlesskit/core';

const registry = createSchemaRegistry();
registry.register(projects);
registry.register(categories);

// Validates all relation targets exist
registry.validateRelations();
```
