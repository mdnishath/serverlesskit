import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type {
	PluginAPI,
	PluginAction,
	PluginDashboardPage,
	PluginDefinition,
	PluginFieldType,
	PluginHookHandler,
	PluginInstance,
	PluginRoute,
} from './plugin.types.js';

/**
 * Creates a plugin registry for managing plugin lifecycle.
 * @returns A PluginRegistry with methods to install, activate, deactivate plugins
 */
export const createPluginRegistry = () => {
	const plugins = new Map<string, PluginInstance>();

	/**
	 * Creates the PluginAPI that is passed to the plugin's setup function.
	 * All registrations are scoped to the plugin instance.
	 */
	const createPluginApi = (instance: PluginInstance): PluginAPI => ({
		registerHook: (event: string, handler: PluginHookHandler) => {
			const existing = instance.hooks.get(event) ?? [];
			existing.push(handler);
			instance.hooks.set(event, existing);
		},
		registerRoute: (route: PluginRoute) => {
			const prefixed = {
				...route,
				path: `/api/plugins/${instance.definition.manifest.name}${route.path}`,
			};
			instance.routes.push(prefixed);
		},
		registerDashboardPage: (page: PluginDashboardPage) => {
			const prefixed = {
				...page,
				path: `/plugins/${instance.definition.manifest.name}${page.path}`,
			};
			instance.dashboardPages.push(prefixed);
		},
		registerFieldType: (fieldType: PluginFieldType) => {
			instance.fieldTypes.push(fieldType);
		},
		registerAction: (action: PluginAction) => {
			instance.actions.push(action);
		},
		getConfig: <T = Record<string, unknown>>() => instance.config as T,
		getPluginName: () => instance.definition.manifest.name,
	});

	return {
		/**
		 * Installs a plugin (registers it but doesn't activate).
		 * @param definition - The plugin definition from definePlugin
		 * @param config - Optional plugin configuration
		 * @returns Result indicating success or failure
		 */
		install: (definition: PluginDefinition, config: Record<string, unknown> = {}): Result<void> => {
			const name = definition.manifest.name;
			if (plugins.has(name)) {
				return fail(appError('CONFLICT', `Plugin "${name}" is already installed`));
			}

			const instance: PluginInstance = {
				definition,
				state: 'installed',
				hooks: new Map(),
				routes: [],
				dashboardPages: [],
				fieldTypes: [],
				actions: [],
				config,
			};

			plugins.set(name, instance);
			return ok(undefined);
		},

		/**
		 * Activates an installed plugin by running its setup function.
		 * @param name - The plugin name
		 * @returns Result indicating success or failure
		 */
		activate: async (name: string): Promise<Result<void>> => {
			const instance = plugins.get(name);
			if (!instance) {
				return fail(appError('NOT_FOUND', `Plugin "${name}" is not installed`));
			}
			if (instance.state === 'active') {
				return ok(undefined);
			}

			const deps = instance.definition.manifest.dependencies ?? [];
			for (const dep of deps) {
				const depInstance = plugins.get(dep);
				if (!depInstance || depInstance.state !== 'active') {
					return fail(appError('DEPENDENCY_ERROR', `Required plugin "${dep}" is not active`));
				}
			}

			try {
				const api = createPluginApi(instance);
				await instance.definition.setup(api);
				instance.state = 'active';
				return ok(undefined);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Plugin activation failed';
				instance.state = 'error';
				instance.error = message;
				return fail(appError('PLUGIN_ERROR', message, error));
			}
		},

		/**
		 * Deactivates a plugin (clears all registrations).
		 * @param name - The plugin name
		 * @returns Result indicating success or failure
		 */
		deactivate: (name: string): Result<void> => {
			const instance = plugins.get(name);
			if (!instance) {
				return fail(appError('NOT_FOUND', `Plugin "${name}" is not installed`));
			}

			instance.state = 'inactive';
			instance.hooks.clear();
			instance.routes.length = 0;
			instance.dashboardPages.length = 0;
			instance.fieldTypes.length = 0;
			instance.actions.length = 0;
			return ok(undefined);
		},

		/**
		 * Uninstalls a plugin completely.
		 * @param name - The plugin name
		 * @returns True if removed
		 */
		uninstall: (name: string): boolean => {
			return plugins.delete(name);
		},

		/** Gets a plugin instance by name */
		get: (name: string): PluginInstance | undefined => plugins.get(name),

		/** Gets all installed plugins */
		getAll: (): PluginInstance[] => Array.from(plugins.values()),

		/** Gets all routes registered by active plugins */
		getAllRoutes: (): PluginRoute[] => {
			return Array.from(plugins.values())
				.filter((p) => p.state === 'active')
				.flatMap((p) => p.routes);
		},

		/** Gets all hooks for a specific event across active plugins */
		getHooks: (event: string): PluginHookHandler[] => {
			return Array.from(plugins.values())
				.filter((p) => p.state === 'active')
				.flatMap((p) => p.hooks.get(event) ?? []);
		},

		/** Clears all plugins */
		clear: (): void => {
			plugins.clear();
		},
	};
};

/** Type for the plugin registry */
export type PluginRegistry = ReturnType<typeof createPluginRegistry>;
