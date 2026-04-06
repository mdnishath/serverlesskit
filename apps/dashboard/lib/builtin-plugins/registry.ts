/** Setting field types for auto-generated forms */
export type SettingField = {
	key: string;
	label: string;
	type: 'text' | 'url' | 'number' | 'boolean' | 'select' | 'textarea';
	placeholder?: string;
	description?: string;
	options?: string[];
	required?: boolean;
};

/** Dashboard menu entry for a plugin */
export type PluginMenuEntry = {
	label: string;
	icon?: string;
};

/** Rich metadata for a plugin beyond the core manifest */
export type PluginMeta = {
	category: 'automation' | 'content' | 'security' | 'developer';
	features: string[];
	settingsSchema: SettingField[];
	hooks: string[];
	readme: string;
	/** If set, shows a menu item in the sidebar when plugin is active */
	dashboardMenu?: PluginMenuEntry;
};

/**
 * Registry of rich metadata for all built-in plugins.
 * Keyed by plugin name. Separate from definePlugin() to keep runtime lean.
 */
export const PLUGIN_META: Record<string, PluginMeta> = {
	webhook: {
		category: 'automation',
		dashboardMenu: { label: 'Webhooks', icon: 'webhook' },
		features: [
			'Send HTTP POST on entry create, update, or delete',
			'Custom webhook URL configuration',
			'Event type included in X-ServerlessKit-Event header',
			'Full entry data in JSON payload',
			'Best-effort delivery (non-blocking)',
		],
		settingsSchema: [
			{
				key: 'url',
				label: 'Webhook URL',
				type: 'url',
				placeholder: 'https://example.com/webhook',
				description: 'HTTP endpoint that receives POST requests when CRUD events occur',
				required: true,
			},
		],
		hooks: ['afterCreate', 'afterUpdate', 'afterDelete'],
		readme: `## Webhook Plugin

Automatically sends HTTP POST requests to a configured URL whenever entries are created, updated, or deleted in any collection.

### Use Cases
- Sync data with external systems (Zapier, Make, n8n)
- Trigger CI/CD pipelines on content changes
- Send notifications to Slack, Discord, or custom services
- Real-time data replication to other databases

### Payload Format
\`\`\`json
{
  "event": "entry.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "payload": {
    "collection": "posts",
    "data": { "title": "Hello World", ... }
  }
}
\`\`\`

### Headers
- \`Content-Type: application/json\`
- \`X-ServerlessKit-Event: entry.created\``,
	},

	'audit-log': {
		category: 'security',
		dashboardMenu: { label: 'Audit Log', icon: 'shield' },
		features: [
			'Records every create, update, and delete operation',
			'Stores who did what, when, and what changed',
			'Data saved to _audit_log table in your database',
			'Non-blocking — won\'t slow down your operations',
			'Useful for compliance, debugging, and activity tracking',
		],
		settingsSchema: [],
		hooks: ['afterCreate', 'afterUpdate', 'afterDelete'],
		readme: `## Audit Log Plugin

Automatically records all CRUD operations to an \`_audit_log\` table in your database. Every create, update, and delete is logged with the user ID, timestamp, collection name, and changed data.

### Use Cases
- Compliance requirements (GDPR, SOC2)
- Debug who changed what and when
- Activity feed for the dashboard
- Undo/rollback investigation

### Table Schema
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment ID |
| event | TEXT | create, update, or delete |
| collection | TEXT | Collection slug |
| entryId | TEXT | The affected entry ID |
| userId | TEXT | Who performed the action |
| timestamp | TEXT | ISO 8601 timestamp |
| details | TEXT | JSON of the entry data |`,
	},

	'slug-generator': {
		category: 'content',
		dashboardMenu: { label: 'Slug Generator', icon: 'link' },
		features: [
			'Auto-generates URL-friendly slug from title or name field',
			'Only activates if collection has a "slug" field',
			'Skips generation if slug is manually provided',
			'Converts to lowercase, replaces spaces with hyphens',
			'Removes special characters for clean URLs',
		],
		settingsSchema: [],
		hooks: ['beforeCreate'],
		readme: `## Slug Generator Plugin

Automatically creates a URL-friendly slug from the \`title\` or \`name\` field when a new entry is created. Only activates if the collection schema includes a \`slug\` field and it's left empty.

### How It Works
1. Checks if the entry has a \`slug\` field
2. If slug is empty, looks for \`title\` or \`name\` field
3. Converts to lowercase, replaces non-alphanumeric with hyphens
4. Trims leading/trailing hyphens

### Example
- Input title: "My Blog Post!" → Generated slug: "my-blog-post"
- Input name: "New Product (2025)" → Generated slug: "new-product-2025"`,
	},

	'serverlesskit-seo': {
		category: 'content',
		dashboardMenu: { label: 'SEO', icon: 'search' },
		features: [
			'Meta title and description for every entry in every collection',
			'Focus keyword tracking with SEO score analysis',
			'Google Search preview — see how your page looks in SERPs',
			'Open Graph tags for social media sharing (Facebook, Twitter, LinkedIn)',
			'Canonical URL management to prevent duplicate content',
			'noindex/nofollow controls per entry',
			'Global SEO health dashboard with scores across all content',
			'Automatic SEO record creation when new entries are added',
			'Auto-cleanup when entries are deleted',
		],
		settingsSchema: [],
		hooks: ['afterCreate', 'afterDelete'],
		readme: `## ServerlessKit SEO

A complete Yoast SEO-like plugin for ServerlessKit. Adds SEO metadata management to every entry in every content type.

### How It Works
1. Enable the plugin from the Plugins page
2. Go to any content type and edit an entry
3. You'll see a collapsible "SEO" panel below the entry fields
4. Fill in meta title, description, focus keyword, and Open Graph tags
5. The SEO score updates in real-time as you type
6. Check the global SEO dashboard for health overview across all content

### SEO Score
The plugin analyzes your SEO setup and gives a score based on:
- Meta title length (30-60 characters optimal)
- Meta description length (120-160 characters optimal)
- Focus keyword is set
- Focus keyword appears in title
- Focus keyword appears in description
- Page is indexable (no noindex)`,
	},
};
