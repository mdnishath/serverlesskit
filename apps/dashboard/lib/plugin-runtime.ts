import { createPluginRegistry } from '@serverlesskit/plugin-sdk';
import type { PluginDefinition, PluginInstance } from '@serverlesskit/plugin-sdk';
import { createHookManager } from '@serverlesskit/core/hooks';
import type { HookEvent, HookHandler } from '@serverlesskit/core/hooks';
import { getDb } from './db';

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
 * Initializes the plugin system. Lazy — runs once on first call.
 * Loads built-in plugins, installs them, activates enabled ones.
 */
export const initPlugins = async (): Promise<void> => {
	if (initialized) return;
	initialized = true;

	registry = createPluginRegistry();
	hookManager = createHookManager();

	try {
		await ensureTable();
		builtInPlugins = await loadBuiltInPlugins();
		const enabledMap = await loadEnabledPlugins();

		/* Install all built-in plugins */
		for (const plugin of builtInPlugins) {
			const config = enabledMap.get(plugin.manifest.name) ?? {};
			registry.install(plugin, config);
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

	registry.deactivate(name);
	syncHooks();

	const db = getDb();
	await db.execute({
		sql: `UPDATE "${PLUGINS_TABLE}" SET "enabled" = 0 WHERE "name" = ?`,
		args: [name],
	});

	return { ok: true, message: `Plugin "${name}" disabled` };
};

/**
 * Gets all plugins with their current state for the UI.
 * @returns Array of plugin info objects
 */
export const getAllPluginsInfo = async () => {
	await initPlugins();
	if (!registry) return [];

	return registry.getAll().map((p: PluginInstance) => ({
		name: p.definition.manifest.name,
		version: p.definition.manifest.version,
		description: p.definition.manifest.description,
		author: p.definition.manifest.author ?? 'ServerlessKit',
		status: p.state,
		error: p.error,
		hooksCount: Array.from(p.hooks.values()).reduce((sum, arr) => sum + arr.length, 0),
		routesCount: p.routes.length,
	}));
};
