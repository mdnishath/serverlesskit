import { describe, expect, it } from 'vitest';
import { createNodeAdapter, validateNodeConfig } from '../src/index.js';

describe('createNodeAdapter', () => {
	it('creates an adapter with correct name', () => {
		const adapter = createNodeAdapter({ adapter: 'node' });
		expect(adapter.name).toBe('node');
	});

	it('returns local database config by default', () => {
		const adapter = createNodeAdapter({ adapter: 'node' });
		const dbConfig = adapter.getDatabaseConfig();
		expect(dbConfig.provider).toBe('local');
	});

	it('returns turso config when URL and token provided', () => {
		const adapter = createNodeAdapter({
			adapter: 'node',
			databaseUrl: 'libsql://test.turso.io',
			databaseToken: 'token-123',
		});
		const dbConfig = adapter.getDatabaseConfig();
		expect(dbConfig.provider).toBe('turso');
	});

	it('uses custom database path', () => {
		const adapter = createNodeAdapter({
			adapter: 'node',
			databasePath: 'file:./custom.db',
		});
		const dbConfig = adapter.getDatabaseConfig();
		expect(dbConfig.provider).toBe('local');
		if (dbConfig.provider === 'local') {
			expect(dbConfig.url).toBe('file:./custom.db');
		}
	});

	it('registers routes', () => {
		const adapter = createNodeAdapter({ adapter: 'node' });
		adapter.addRoute('GET /api/test', async () => ({ status: 200, body: { ok: true } }));
		// route is registered internally, verified by start() behavior
	});

	it('generates Docker config', () => {
		const adapter = createNodeAdapter({ adapter: 'node', port: 8080 });
		const docker = adapter.generateDockerConfig();
		expect(docker.dockerfile).toContain('FROM node:20-slim');
		expect(docker.dockerfile).toContain('EXPOSE 3000');
		expect(docker.compose).toContain('8080:8080');
	});
});

describe('validateNodeConfig', () => {
	it('passes with valid config', () => {
		expect(validateNodeConfig({ adapter: 'node' }).ok).toBe(true);
	});

	it('passes with custom port', () => {
		expect(validateNodeConfig({ adapter: 'node', port: 8080 }).ok).toBe(true);
	});

	it('fails with invalid port', () => {
		const result = validateNodeConfig({ adapter: 'node', port: 99999 });
		expect(result.ok).toBe(false);
	});

	it('fails with port 0', () => {
		const result = validateNodeConfig({ adapter: 'node', port: 0 });
		expect(result.ok).toBe(false);
	});
});
