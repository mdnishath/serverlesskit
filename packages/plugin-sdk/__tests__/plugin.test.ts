import { describe, expect, it, vi } from 'vitest';
import { definePlugin } from '../src/define-plugin.js';
import { createPluginRegistry } from '../src/plugin-loader.js';

describe('definePlugin', () => {
	it('creates a frozen plugin definition', () => {
		const plugin = definePlugin({
			name: 'test-plugin',
			version: '1.0.0',
			description: 'A test plugin',
			setup: () => {},
		});

		expect(Object.isFrozen(plugin)).toBe(true);
		expect(Object.isFrozen(plugin.manifest)).toBe(true);
		expect(plugin.manifest.name).toBe('test-plugin');
	});

	it('defaults permissions and dependencies to empty arrays', () => {
		const plugin = definePlugin({
			name: 'minimal',
			version: '0.1.0',
			description: 'Minimal',
			setup: () => {},
		});

		expect(plugin.manifest.permissions).toEqual([]);
		expect(plugin.manifest.dependencies).toEqual([]);
	});
});

describe('PluginRegistry', () => {
	const makePlugin = (name: string, setup = () => {}) =>
		definePlugin({ name, version: '1.0.0', description: `Plugin ${name}`, setup });

	it('installs a plugin', () => {
		const registry = createPluginRegistry();
		const result = registry.install(makePlugin('test'));

		expect(result.ok).toBe(true);
		expect(registry.getAll()).toHaveLength(1);
		expect(registry.get('test')?.state).toBe('installed');
	});

	it('prevents duplicate installation', () => {
		const registry = createPluginRegistry();
		registry.install(makePlugin('test'));
		const result = registry.install(makePlugin('test'));

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('CONFLICT');
	});

	it('activates a plugin and runs setup', async () => {
		const spy = vi.fn();
		const registry = createPluginRegistry();
		registry.install(makePlugin('test', spy));

		const result = await registry.activate('test');

		expect(result.ok).toBe(true);
		expect(spy).toHaveBeenCalledOnce();
		expect(registry.get('test')?.state).toBe('active');
	});

	it('fails to activate non-installed plugin', async () => {
		const registry = createPluginRegistry();
		const result = await registry.activate('nonexistent');

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('NOT_FOUND');
	});

	it('handles setup errors gracefully', async () => {
		const registry = createPluginRegistry();
		registry.install(
			makePlugin('broken', () => {
				throw new Error('Setup crashed');
			}),
		);

		const result = await registry.activate('broken');

		expect(result.ok).toBe(false);
		expect(registry.get('broken')?.state).toBe('error');
		expect(registry.get('broken')?.error).toBe('Setup crashed');
	});

	it('registers hooks during setup', async () => {
		const handler = vi.fn();
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'hooks-test',
				version: '1.0.0',
				description: 'Test hooks',
				setup: (api) => {
					api.registerHook('afterCreate', handler);
				},
			}),
		);

		await registry.activate('hooks-test');

		const hooks = registry.getHooks('afterCreate');
		expect(hooks).toHaveLength(1);
	});

	it('registers routes with plugin prefix', async () => {
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'api-test',
				version: '1.0.0',
				description: 'Test routes',
				setup: (api) => {
					api.registerRoute({
						method: 'GET',
						path: '/status',
						handler: async () => ({ ok: true }),
					});
				},
			}),
		);

		await registry.activate('api-test');

		const routes = registry.getAllRoutes();
		expect(routes).toHaveLength(1);
		expect(routes[0]?.path).toBe('/api/plugins/api-test/status');
	});

	it('registers dashboard pages with plugin prefix', async () => {
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'ui-test',
				version: '1.0.0',
				description: 'Test pages',
				setup: (api) => {
					api.registerDashboardPage({ title: 'Settings', path: '/settings' });
				},
			}),
		);

		await registry.activate('ui-test');

		const pages = registry.get('ui-test')?.dashboardPages;
		expect(pages).toHaveLength(1);
		expect(pages?.[0]?.path).toBe('/plugins/ui-test/settings');
	});

	it('provides config to plugins', async () => {
		const spy = vi.fn();
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'config-test',
				version: '1.0.0',
				description: 'Test config',
				setup: (api) => {
					const config = api.getConfig<{ apiKey: string }>();
					spy(config);
				},
			}),
			{ apiKey: 'sk_test_123' },
		);

		await registry.activate('config-test');
		expect(spy).toHaveBeenCalledWith({ apiKey: 'sk_test_123' });
	});

	it('deactivates a plugin and clears registrations', async () => {
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'deactivate-test',
				version: '1.0.0',
				description: 'Test deactivate',
				setup: (api) => {
					api.registerHook('afterCreate', async () => {});
					api.registerRoute({ method: 'GET', path: '/test', handler: async () => ({}) });
				},
			}),
		);

		await registry.activate('deactivate-test');
		expect(registry.getHooks('afterCreate')).toHaveLength(1);

		registry.deactivate('deactivate-test');
		expect(registry.get('deactivate-test')?.state).toBe('inactive');
		expect(registry.getHooks('afterCreate')).toHaveLength(0);
		expect(registry.getAllRoutes()).toHaveLength(0);
	});

	it('uninstalls a plugin', () => {
		const registry = createPluginRegistry();
		registry.install(makePlugin('remove-me'));

		expect(registry.uninstall('remove-me')).toBe(true);
		expect(registry.get('remove-me')).toBeUndefined();
	});

	it('checks dependencies before activation', async () => {
		const registry = createPluginRegistry();
		registry.install(
			definePlugin({
				name: 'dependent',
				version: '1.0.0',
				description: 'Needs base',
				dependencies: ['base-plugin'],
				setup: () => {},
			}),
		);

		const result = await registry.activate('dependent');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('DEPENDENCY_ERROR');
	});

	it('resolves dependencies when they are active', async () => {
		const registry = createPluginRegistry();
		registry.install(makePlugin('base-plugin'));
		await registry.activate('base-plugin');

		registry.install(
			definePlugin({
				name: 'dependent',
				version: '1.0.0',
				description: 'Needs base',
				dependencies: ['base-plugin'],
				setup: () => {},
			}),
		);

		const result = await registry.activate('dependent');
		expect(result.ok).toBe(true);
	});
});
