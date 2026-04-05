import type { PluginDefinition, PluginManifest, PluginSetupFn } from './plugin.types.js';

/** Options for defining a plugin */
type DefinePluginOptions = PluginManifest & {
	setup: PluginSetupFn;
};

/**
 * Defines a new ServerlessKit plugin.
 * This is the main entry point for plugin authors.
 * @param options - Plugin manifest and setup function
 * @returns A frozen PluginDefinition
 *
 * @example
 * ```ts
 * const myPlugin = definePlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'Does something useful',
 *   setup: async (api) => {
 *     api.registerHook('afterCreate', async (payload) => {
 *       // react to new entries
 *     });
 *   },
 * });
 * ```
 */
export const definePlugin = (options: DefinePluginOptions): PluginDefinition => {
	const { setup, ...manifestFields } = options;

	const manifest: PluginManifest = {
		name: manifestFields.name,
		version: manifestFields.version,
		description: manifestFields.description,
		author: manifestFields.author,
		permissions: manifestFields.permissions ?? [],
		dependencies: manifestFields.dependencies ?? [],
	};

	return Object.freeze({
		manifest: Object.freeze(manifest),
		setup,
	});
};
