import { createPluginRegistry } from '@serverlesskit/plugin-sdk';
import type { PluginDefinition, PluginInstance } from '@serverlesskit/plugin-sdk';
import { createHookManager } from '@serverlesskit/core/hooks';
import type { HookEvent, HookHandler } from '@serverlesskit/core/hooks';
import { getDb } from './db';
import { PLUGIN_META, type PluginMenuEntry } from './plugins/registry';

const PLUGINS_TABLE = '_plugins';

/** Singleton plugin registry */
let registry: ReturnType<typeof createPluginRegistry> | null = null;

/** Singleton hook manager shared by all CRUD operations */
let hookManager: ReturnType<typeof createHookManager> | null = null;

/** Whether initPlugins has been called */
let initialized = false;

/** All available built-in plugin definitions (loaded lazily) */
let builtInPlugins: PluginDefinition[] = [];

/**
 * Ensures the _plugins table exists for persisting plugin state.
 */
const ensureTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${PLUGINS_TABLE}" (
			"name" TEXT PRIMARY KEY NOT NULL,
			"enabled" INTEGER NOT NULL DEFAULT 0,
			"config" TEXT NOT NULL DEFAULT '{}'
		);
	`);
};

/**
 * Loads enabled plugin names from the DB.
 * @returns Set of enabled plugin names
 */
const loadEnabledPlugins = async (): Promise<Map<string, Record<string, unknown>>> => {
	const db = getDb();
	const result = await db.execute(`SELECT "name", "config" FROM "${PLUGINS_TABLE}" WHERE "enabled" = 1`);
	const map = new Map<string, Record<string, unknown>>();
	for (const row of result.rows) {
		const name = String(row.name);
		const config = JSON.parse(String(row.config || '{}')) as Record<string, unknown>;
		map.set(name, config);
	}
	return map;
};

/** All valid hook events */
const HOOK_EVENTS: HookEvent[] = [
	'beforeCreate', 'afterCreate', 'beforeUpdate', 'afterUpdate',
	'beforeDelete', 'afterDelete', 'beforeRead', 'afterRead',
];

/**
 * Syncs plugin hooks into the shared HookManager.
 * Plugin hooks are registered as global (apply to all collections)
 * by wrapping them — the HookManager is keyed by "collection:event",
 * so we register a special "__global__" collection and check it in getHookManager.
 */
const syncHooks = () => {
	if (!registry || !hookManager) return;
	hookManager.clear();

	for (const plugin of registry.getAll()) {
		if (plugin.state !== 'active') continue;
		for (const [event, handlers] of plugin.hooks.entries()) {
			if (!HOOK_EVENTS.includes(event as HookEvent)) continue;
			for (const handler of handlers) {
				hookManager.register('__global__', event as HookEvent, handler as unknown as HookHandler);
			}
		}
	}
};

/**
 * Loads built-in plugin definitions.
 * @returns Array of plugin definitions
 */
const loadBuiltInPlugins = async (): Promise<PluginDefinition[]> => {
	const { webhookPlugin } = await import('./plugins/webhook');
	const { auditLogPlugin } = await import('./plugins/audit-log');
	const { slugGeneratorPlugin } = await import('./plugins/slug-generator');
	return [webhookPlugin, auditLogPlugin, slugGeneratorPlugin];
};

/**
 * Loads uploaded plugin definitions from the _plugin_meta table.
 * These are config-only plugins — they don't run arbitrary code,
 * but their metadata (features, hooks, settings) is available in the UI.
 */
const loadUploadedPlugins = async (): Promise<PluginDefinition[]> => {
	const db = getDb();
	try {
		await db.execute(`CREATE TABLE IF NOT EXISTS "_plugin_meta" ("name" TEXT PRIMARY KEY NOT NULL, "version" TEXT NOT NULL DEFAULT '1.0.0', "description" TEXT NOT NULL DEFAULT '', "author" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'developer', "features" TEXT NOT NULL DEFAULT '[]', "hooks" TEXT NOT NULL DEFAULT '[]', "settings" TEXT NOT NULL DEFAULT '[]', "installedAt" TEXT NOT NULL)`);
		const result = await db.execute(`SELECT * FROM "_plugin_meta"`);
		const uploaded: PluginDefinition[] = [];
		for (const row of result.rows) {
			const name = String(row.name);
			/* Skip if a built-in plugin has the same name */
			if (builtInPlugins.some((p) => p.manifest.name === name)) continue;

			const features = JSON.parse(String(row.features || '[]')) as string[];
			const hooks = JSON.parse(String(row.hooks || '[]')) as string[];
			const settings = JSON.parse(String(row.settings || '[]')) as Array<Record<string, unknown>>;

			/* Register metadata in PLUGIN_META for the detail page */
			PLUGIN_META[name] = {
				category: (String(row.category) as 'automation' | 'content' | 'security' | 'developer') ?? 'developer',
				features,
				settingsSchema: settings.map((s) => ({
					key: String(s.key ?? ''),
					label: String(s.label ?? ''),
					type: (String(s.type ?? 'text') as 'text' | 'url' | 'number' | 'boolean' | 'select' | 'textarea'),
					placeholder: s.placeholder ? String(s.placeholder) : undefined,
					description: s.description ? String(s.description) : undefined,
					required: Boolean(s.required),
				})),
				hooks,
				readme: `Uploaded plugin: ${String(row.description)}`,
			};

			/* Create a no-op plugin definition (config-only) */
			const { definePlugin } = await import('@serverlesskit/plugin-sdk');
			uploaded.push(definePlugin({
				name,
				version: String(row.version),
				description: String(row.description),
				author: String(row.author),
				setup: () => { /* config-only plugin — no runtime hooks */ },
			}));
		}
		return uploaded;
	} catch {
		return [];
	}
};

/**
 * Initializes the plugin system. Lazy — runs once on first call.
 * Loads built-in + uploaded plugins, installs them, activates enabled ones.
 */
export const initPlugins = async (): Promise<void> => {
	if (initialized) return;
	initialized = true;

	registry = createPluginRegistry();
	hookManager = createHookManager();

	try {
		await ensureTable();
		builtInPlugins = await loadBuiltInPlugins();
		const uploadedPlugins = await loadUploadedPlugins();
		const allPlugins = [...builtInPlugins, ...uploadedPlugins];
		const enabledMap = await loadEnabledPlugins();

		/* Install all plugins and ensure each has a DB row */
		const db = getDb();
		for (const plugin of allPlugins) {
			const name = plugin.manifest.name;
			const config = enabledMap.get(name) ?? {};
			registry.install(plugin, config);
			/* Ensure row exists in _plugins so toggle always works */
			const isEnabled = enabledMap.has(name) ? 1 : 0;
			await db.execute({
				sql: `INSERT OR IGNORE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, ?, ?)`,
				args: [name, isEnabled, JSON.stringify(config)],
			});
		}

		/* Activate enabled ones */
		for (const name of enabledMap.keys()) {
			await registry.activate(name);
		}

		syncHooks();
	} catch {
		/* Plugin init failure should not crash the app */
	}
};

/**
 * Gets a HookManager that executes both collection-specific and global hooks.
 * Global hooks (from plugins) are registered under "__global__" collection.
 * This wrapper transparently runs both when execute() is called.
 * @returns A HookManager-compatible object
 */
export const getHookManager = async () => {
	await initPlugins();
	const base = hookManager!;

	return {
		register: base.register,
		has: (collection: string, event: HookEvent) =>
			base.has(collection, event) || base.has('__global__', event),
		execute: async (collection: string, event: HookEvent, payload: import('@serverlesskit/core/hooks').HookPayload) => {
			/* Run collection-specific hooks first */
			let result = await base.execute(collection, event, payload);
			/* Then run global plugin hooks */
			result = await base.execute('__global__', event, result);
			return result;
		},
		clear: base.clear,
	};
};

/**
 * Gets the plugin registry (initializes plugins if needed).
 * @returns The PluginRegistry instance
 */
export const getPluginRegistry = async (): Promise<ReturnType<typeof createPluginRegistry>> => {
	await initPlugins();
	return registry!;
};

/**
 * Enables a plugin and persists to DB.
 * @param name - Plugin name
 * @returns Success or error message
 */
export const enablePlugin = async (name: string): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };

	const instance = registry.get(name);
	if (!instance) return { ok: false, message: `Plugin "${name}" not found` };

	const result = await registry.activate(name);
	if (!result.ok) return { ok: false, message: result.error.message };

	syncHooks();

	const db = getDb();
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 1, ?)`,
		args: [name, JSON.stringify(instance.config)],
	});

	return { ok: true, message: `Plugin "${name}" enabled` };
};

/**
 * Disables a plugin and persists to DB.
 * @param name - Plugin name
 * @returns Success or error message
 */
export const disablePlugin = async (name: string): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };

	const instance = registry.get(name);
	if (!instance) return { ok: false, message: `Plugin "${name}" not found` };

	registry.deactivate(name);
	syncHooks();

	/* Use INSERT OR REPLACE to ensure row exists even if never enabled before */
	const db = getDb();
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, ?)`,
		args: [name, JSON.stringify(instance.config)],
	});

	return { ok: true, message: `Plugin "${name}" disabled` };
};

/**
 * Gets all plugins with their current state for the UI.
 * @returns Array of plugin info objects with rich metadata
 */
export const getAllPluginsInfo = async () => {
	await initPlugins();
	if (!registry) return [];

	return registry.getAll().map((p: PluginInstance) => {
		const name = p.definition.manifest.name;
		const meta = PLUGIN_META[name];
		return {
			name,
			version: p.definition.manifest.version,
			description: p.definition.manifest.description,
			author: p.definition.manifest.author ?? 'ServerlessKit',
			status: p.state,
			error: p.error,
			hooksCount: Array.from(p.hooks.values()).reduce((sum, arr) => sum + arr.length, 0),
			routesCount: p.routes.length,
			category: meta?.category ?? 'developer',
			features: meta?.features ?? [],
			hasSettings: (meta?.settingsSchema.length ?? 0) > 0,
			isBuiltIn: builtInPlugins.some((bp) => bp.manifest.name === name),
		};
	});
};

/**
 * Gets detailed info for a single plugin including settings schema and config.
 * @param name - Plugin name
 * @returns Full plugin detail or null
 */
export const getPluginDetail = async (name: string) => {
	await initPlugins();
	if (!registry) return null;

	const instance = registry.get(name);
	if (!instance) return null;

	const meta = PLUGIN_META[name];
	const db = getDb();
	let config: Record<string, unknown> = {};
	try {
		const result = await db.execute({ sql: `SELECT "config" FROM "${PLUGINS_TABLE}" WHERE "name" = ?`, args: [name] });
		if (result.rows[0]) config = JSON.parse(String(result.rows[0].config || '{}')) as Record<string, unknown>;
	} catch { /* no config yet */ }

	const isBuiltIn = builtInPlugins.some((p) => p.manifest.name === name);

	return {
		name: instance.definition.manifest.name,
		version: instance.definition.manifest.version,
		description: instance.definition.manifest.description,
		author: instance.definition.manifest.author ?? 'ServerlessKit',
		status: instance.state,
		error: instance.error,
		hooksCount: Array.from(instance.hooks.values()).reduce((sum, arr) => sum + arr.length, 0),
		routesCount: instance.routes.length,
		category: meta?.category ?? 'developer',
		features: meta?.features ?? [],
		settingsSchema: meta?.settingsSchema ?? [],
		hooks: meta?.hooks ?? [],
		readme: meta?.readme ?? '',
		config,
		isBuiltIn,
	};
};

/**
 * Updates a plugin's config, saves to DB, and re-activates with new config.
 * @param name - Plugin name
 * @param config - New configuration object
 * @returns Success or error
 */
export const updatePluginConfig = async (name: string, config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };

	const instance = registry.get(name);
	if (!instance) return { ok: false, message: `Plugin "${name}" not found` };

	/* Update config in memory */
	Object.assign(instance.config, config);

	/* Persist to DB */
	const db = getDb();
	const isEnabled = instance.state === 'active' ? 1 : 0;
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, ?, ?)`,
		args: [name, isEnabled, JSON.stringify(instance.config)],
	});

	/* Re-activate if active to apply new config */
	if (instance.state === 'active') {
		registry.deactivate(name);
		await registry.activate(name);
		syncHooks();
	}

	return { ok: true, message: 'Settings saved' };
};

/**
 * Registers a newly uploaded plugin into the running registry.
 * Called after zip upload to make the plugin appear immediately.
 * @param name - Plugin name
 * @param meta - Plugin metadata from manifest.json
 */
export const registerUploadedPlugin = async (name: string, meta: {
	version: string; description: string; author: string; category: string;
	features: string[]; hooks: string[]; settings: Array<Record<string, unknown>>;
}): Promise<void> => {
	await initPlugins();
	if (!registry) return;

	/* Skip if already registered */
	if (registry.get(name)) return;

	/* Register metadata */
	PLUGIN_META[name] = {
		category: (meta.category as 'automation' | 'content' | 'security' | 'developer') ?? 'developer',
		features: meta.features,
		settingsSchema: meta.settings.map((s) => ({
			key: String(s.key ?? ''),
			label: String(s.label ?? ''),
			type: (String(s.type ?? 'text') as 'text' | 'url' | 'number' | 'boolean' | 'select' | 'textarea'),
			placeholder: s.placeholder ? String(s.placeholder) : undefined,
			description: s.description ? String(s.description) : undefined,
			required: Boolean(s.required),
		})),
		hooks: meta.hooks,
		readme: `Uploaded plugin: ${meta.description}`,
	};

	/* Create a config-only plugin definition and install it */
	const { definePlugin } = await import('@serverlesskit/plugin-sdk');
	const pluginDef = definePlugin({
		name,
		version: meta.version,
		description: meta.description,
		author: meta.author,
		setup: () => { /* config-only plugin */ },
	});
	registry.install(pluginDef, {});

	/* Ensure DB row exists */
	const db = getDb();
	await db.execute({
		sql: `INSERT OR IGNORE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, '{}')`,
		args: [name],
	});
};

/**
 * Permanently deletes an uploaded plugin from DB.
 * Built-in plugins cannot be deleted.
 * @param name - Plugin name
 * @returns Success or error
 */
export const deletePlugin = async (name: string): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };

	/* Prevent deleting built-in plugins */
	if (builtInPlugins.some((p) => p.manifest.name === name)) {
		return { ok: false, message: `Cannot delete built-in plugin "${name}"` };
	}

	/* Deactivate first if active */
	const instance = registry.get(name);
	if (instance?.state === 'active') {
		registry.deactivate(name);
		syncHooks();
	}

	/* Remove from registry */
	registry.uninstall(name);

	/* Delete from both DB tables */
	const db = getDb();
	await db.execute({ sql: `DELETE FROM "${PLUGINS_TABLE}" WHERE "name" = ?`, args: [name] });
	try {
		await db.execute({ sql: `DELETE FROM "_plugin_meta" WHERE "name" = ?`, args: [name] });
	} catch { /* table may not exist */ }

	/* Remove from metadata cache */
	delete PLUGIN_META[name];

	return { ok: true, message: `Plugin "${name}" deleted permanently` };
};

/**
 * Gets sidebar menu items for active plugins that have dashboardMenu defined.
 * @returns Array of { name, label, icon } for sidebar rendering
 */
export const getActivePluginMenus = async (): Promise<Array<{ name: string; label: string; icon: string }>> => {
	await initPlugins();
	if (!registry) return [];

	const menus: Array<{ name: string; label: string; icon: string }> = [];
	for (const p of registry.getAll()) {
		if (p.state !== 'active') continue;
		const meta = PLUGIN_META[p.definition.manifest.name];
		if (meta?.dashboardMenu) {
			menus.push({
				name: p.definition.manifest.name,
				label: meta.dashboardMenu.label,
				icon: meta.dashboardMenu.icon ?? 'puzzle',
			});
		}
	}
	return menus;
};
