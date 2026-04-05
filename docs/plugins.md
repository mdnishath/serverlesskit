# Plugin Development

ServerlessKit's plugin system lets you extend functionality with hooks, custom routes, and dashboard pages.

## Creating a Plugin

```typescript
import { definePlugin } from '@serverlesskit/plugin-sdk';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Does something useful',
  setup: (api) => {
    // Register hooks, routes, and pages here
  },
});
```

## Plugin API

The `setup` function receives a `PluginAPI` object with these methods:

### registerHook

Listen to CRUD lifecycle events:

```typescript
api.registerHook('afterCreate', async ({ collection, entry, entryId }) => {
  if (collection === 'orders') {
    await sendOrderConfirmation(entry);
  }
});
```

Events: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, `beforeRead`, `afterRead`

### registerRoute

Add custom API endpoints:

```typescript
api.registerRoute('GET', '/stats', async (req) => {
  const stats = await computeStats();
  return { status: 200, body: { ok: true, data: stats } };
});
```

Routes are prefixed with `/api/plugins/{plugin-name}/`.

### registerDashboardPage

Add pages to the dashboard sidebar:

```typescript
api.registerDashboardPage({
  title: 'Analytics',
  icon: 'chart',
  path: '/analytics',
  component: AnalyticsPage,
});
```

### getConfig / getDb

Access plugin configuration and a scoped database:

```typescript
const config = api.getConfig();
const db = api.getDb(); // Scoped to plugin's tables
```

## Plugin Lifecycle

1. **Install** — Plugin files are added to the `plugins/` directory
2. **Activate** — Plugin is enabled via dashboard or config
3. **Deactivate** — Plugin is disabled but data is preserved
4. **Uninstall** — Plugin is removed and scoped data is cleaned up

## Plugin Isolation

- Each plugin gets its own database table prefix (`_plugin_{name}_`)
- Plugins cannot access other plugins' data
- Plugins cannot modify core schema definitions
- Plugins must declare required permissions in their manifest

## Example: Webhook Plugin

```typescript
import { definePlugin } from '@serverlesskit/plugin-sdk';

export default definePlugin({
  name: 'webhooks',
  version: '1.0.0',
  description: 'Send webhooks on CRUD events',
  setup: (api) => {
    const config = api.getConfig();
    const webhookUrl = config.url as string;

    api.registerHook('afterCreate', async ({ collection, entry }) => {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'create', collection, entry }),
      });
    });
  },
});
```
