import { createPluginRegistry } from '@serverlesskit/plugin-sdk';
import type { PluginDefinition, PluginInstance } from '@serverlesskit/plugin-sdk';
import { createHookManager } from '@serverlesskit/core/hooks';
import type { HookEvent, HookHandler } from '@serverlesskit/core/hooks';
import { getDb } from './db';
import { PLUGIN_META, type PluginMenuEntry } from './builtin-plugins/registry';

const PLUGINS_TABLE = '_plugins';

/** Singleton state */
let registry: ReturnType<typeof createPluginRegistry> | null = null;
let hookManager: ReturnType<typeof createHookManager> | null = null;
let initialized = false;
let builtInPlugins: PluginDefinition[] = [];

/** All valid hook events */
const HOOK_EVENTS: HookEvent[] = [
	'beforeCreate', 'afterCreate', 'beforeUpdate', 'afterUpdate',
	'beforeDelete', 'afterDelete', 'beforeRead', 'afterRead',
];

/** Ensures the _plugins table exists */
const ensureTable = async () => {
	const db = getDb();
	await db.execute(`CREATE TABLE IF NOT EXISTS "${PLUGINS_TABLE}" ("name" TEXT PRIMARY KEY NOT NULL, "enabled" INTEGER NOT NULL DEFAULT 0, "config" TEXT NOT NULL DEFAULT '{}')`);
};

/** Ensures the _plugin_meta table exists */
const ensureMetaTable = async () => {
	const db = getDb();
	await db.execute(`CREATE TABLE IF NOT EXISTS "_plugin_meta" ("name" TEXT PRIMARY KEY NOT NULL, "version" TEXT NOT NULL DEFAULT '1.0.0', "description" TEXT NOT NULL DEFAULT '', "author" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'developer', "features" TEXT NOT NULL DEFAULT '[]', "hooks" TEXT NOT NULL DEFAULT '[]', "settings" TEXT NOT NULL DEFAULT '[]', "installedAt" TEXT NOT NULL)`);
};

/** Syncs plugin hooks into the shared HookManager */
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

/** Loads built-in plugin definitions from code */
const loadBuiltInPlugins = async (): Promise<PluginDefinition[]> => {
	const { webhookPlugin } = await import('./builtin-plugins/webhook');
	const { auditLogPlugin } = await import('./builtin-plugins/audit-log');
	const { slugGeneratorPlugin } = await import('./builtin-plugins/slug-generator');
	return [webhookPlugin, auditLogPlugin, slugGeneratorPlugin];
};

/**
 * Gets the list of plugin names that exist in _plugins table.
 * Returns a map: name → { enabled: number, config: object }
 */
const loadPluginStates = async (): Promise<Map<string, { enabled: number; config: Record<string, unknown> }>> => {
	const db = getDb();
	const result = await db.execute(`SELECT "name", "enabled", "config" FROM "${PLUGINS_TABLE}"`);
	const map = new Map<string, { enabled: number; config: Record<string, unknown> }>();
	for (const row of result.rows) {
		map.set(String(row.name), {
			enabled: Number(row.enabled),
			config: JSON.parse(String(row.config || '{}')) as Record<string, unknown>,
		});
	}
	return map;
};

/**
 * Loads uploaded plugin definitions from _plugin_meta table.
 * Registers their metadata in PLUGIN_META for UI display.
 */
const loadUploadedPlugins = async (excludeNames: Set<string>): Promise<PluginDefinition[]> => {
	const db = getDb();
	try {
		await ensureMetaTable();
		const result = await db.execute(`SELECT * FROM "_plugin_meta"`);
		const uploaded: PluginDefinition[] = [];
		for (const row of result.rows) {
			const name = String(row.name);
			if (excludeNames.has(name)) continue;

			const features = JSON.parse(String(row.features || '[]')) as string[];
			const hooks = JSON.parse(String(row.hooks || '[]')) as string[];
			const settings = JSON.parse(String(row.settings || '[]')) as Array<Record<string, unknown>>;

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

			const { definePlugin } = await import('@serverlesskit/plugin-sdk');
			uploaded.push(definePlugin({
				name,
				version: String(row.version),
				description: String(row.description),
				author: String(row.author),
				setup: () => {},
			}));
		}
		return uploaded;
	} catch {
		return [];
	}
};

/**
 * Initializes the plugin system. Lazy — runs once per lifecycle.
 */
export const initPlugins = async (): Promise<void> => {
	if (initialized) return;
	initialized = true;

	registry = createPluginRegistry();
	hookManager = createHookManager();

	try {
		await ensureTable();
		builtInPlugins = await loadBuiltInPlugins();
		const states = await loadPluginStates();

		/* Collect deleted names (enabled = -1) */
		const deletedNames = new Set<string>();
		for (const [name, state] of states) {
			if (state.enabled === -1) deletedNames.add(name);
		}

		/* Load uploaded plugins, excluding deleted */
		const builtInNames = new Set(builtInPlugins.map((p) => p.manifest.name));
		const uploadedPlugins = await loadUploadedPlugins(new Set([...deletedNames, ...builtInNames]));
		const allPlugins = [...builtInPlugins, ...uploadedPlugins];

		const db = getDb();
		for (const plugin of allPlugins) {
			const name = plugin.manifest.name;
			if (deletedNames.has(name)) continue;

			const state = states.get(name);
			const config = state?.config ?? {};
			registry.install(plugin, config);

			/* Ensure row exists */
			if (!state) {
				await db.execute({
					sql: `INSERT OR IGNORE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, ?)`,
					args: [name, JSON.stringify(config)],
				});
			}
		}

		/* Activate enabled ones */
		for (const [name, state] of states) {
			if (state.enabled === 1 && registry.get(name)) {
				await registry.activate(name);
			}
		}

		syncHooks();
	} catch {
		/* Plugin init failure should not crash the app */
	}
};

/** Force re-init on next call */
const resetRuntime = () => {
	initialized = false;
	registry = null;
	hookManager = null;
};

/**
 * Gets a HookManager that runs both collection-specific and global hooks.
 */
export const getHookManager = async () => {
	await initPlugins();
	const base = hookManager!;
	return {
		register: base.register,
		has: (collection: string, event: HookEvent) =>
			base.has(collection, event) || base.has('__global__', event),
		execute: async (collection: string, event: HookEvent, payload: import('@serverlesskit/core/hooks').HookPayload) => {
			let result = await base.execute(collection, event, payload);
			result = await base.execute('__global__', event, result);
			return result;
		},
		clear: base.clear,
	};
};

/**
 * Gets the plugin registry.
 */
export const getPluginRegistry = async () => {
	await initPlugins();
	return registry!;
};

/**
 * Enables a plugin and persists to DB.
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
 */
export const disablePlugin = async (name: string): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };
	const instance = registry.get(name);
	if (!instance) return { ok: false, message: `Plugin "${name}" not found` };
	registry.deactivate(name);
	syncHooks();
	const db = getDb();
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, ?)`,
		args: [name, JSON.stringify(instance.config)],
	});
	return { ok: true, message: `Plugin "${name}" disabled` };
};

/**
 * Gets all plugins info for the UI.
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
 * Gets detailed info for a single plugin.
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
	} catch {}
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
		isBuiltIn: builtInPlugins.some((p) => p.manifest.name === name),
	};
};

/**
 * Updates a plugin's config.
 */
export const updatePluginConfig = async (name: string, config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };
	const instance = registry.get(name);
	if (!instance) return { ok: false, message: `Plugin "${name}" not found` };
	Object.assign(instance.config, config);
	const db = getDb();
	const isEnabled = instance.state === 'active' ? 1 : 0;
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, ?, ?)`,
		args: [name, isEnabled, JSON.stringify(instance.config)],
	});
	if (instance.state === 'active') {
		registry.deactivate(name);
		await registry.activate(name);
		syncHooks();
	}
	return { ok: true, message: 'Settings saved' };
};

/**
 * Registers an uploaded plugin into the running registry immediately.
 * Also clears any previous "deleted" marker from DB.
 */
export const registerUploadedPlugin = async (name: string, meta: {
	version: string; description: string; author: string; category: string;
	features: string[]; hooks: string[]; settings: Array<Record<string, unknown>>;
}): Promise<void> => {
	/* Force full re-init so the newly saved _plugin_meta row gets loaded */
	resetRuntime();
	await initPlugins();
};

/**
 * Permanently deletes a plugin. Forces re-init on next request.
 */
export const deletePlugin = async (name: string): Promise<{ ok: boolean; message: string }> => {
	await initPlugins();
	if (!registry) return { ok: false, message: 'Plugin system not initialized' };

	const instance = registry.get(name);
	if (instance?.state === 'active') {
		registry.deactivate(name);
	}
	registry.uninstall(name);
	syncHooks();

	const db = getDb();
	/* Mark as deleted (-1) so built-in plugins don't reload */
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, -1, '{}')`,
		args: [name],
	});
	/* Remove uploaded metadata */
	try {
		await db.execute({ sql: `DELETE FROM "_plugin_meta" WHERE "name" = ?`, args: [name] });
	} catch {}

	delete PLUGIN_META[name];
	resetRuntime();

	return { ok: true, message: `Plugin "${name}" deleted permanently` };
};

/**
 * Gets sidebar menu items for active plugins.
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
