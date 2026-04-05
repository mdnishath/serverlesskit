import { describe, expect, it } from 'vitest';
import { createVercelAdapter, validateVercelConfig } from '../src/index.js';

const validConfig = {
	adapter: 'vercel' as const,
	databaseUrl: 'libsql://test.turso.io',
	databaseToken: 'token-123',
};

describe('createVercelAdapter', () => {
	it('creates an adapter with correct name', () => {
		const adapter = createVercelAdapter(validConfig);
		expect(adapter.name).toBe('vercel');
	});

	it('returns database config', () => {
		const adapter = createVercelAdapter(validConfig);
		const dbConfig = adapter.getDatabaseConfig();
		expect(dbConfig.provider).toBe('turso');
		expect(dbConfig.url).toBe('libsql://test.turso.io');
		expect(dbConfig.authToken).toBe('token-123');
	});

	it('generates vercel.json config', () => {
		const adapter = createVercelAdapter(validConfig);
		const config = adapter.generateConfig();
		expect(config.framework).toBe('nextjs');
	});

	it('includes region when specified', () => {
		const adapter = createVercelAdapter({ ...validConfig, region: 'iad1' });
		const config = adapter.generateConfig();
		expect(config.regions).toEqual(['iad1']);
	});

	it('creates a JSON response', () => {
		const adapter = createVercelAdapter(validConfig);
		const response = adapter.createResponse(200, { ok: true, data: 'test' });
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('X-Powered-By')).toBe('ServerlessKit');
	});

	it('parses a web Request', async () => {
		const adapter = createVercelAdapter(validConfig);
		const request = new Request('https://example.com/api/test?q=hello', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'test' }),
		});
		const parsed = await adapter.parseRequest(request);
		expect(parsed.method).toBe('POST');
		expect(parsed.url).toBe('/api/test?q=hello');
		expect(parsed.body).toEqual({ title: 'test' });
	});
});

describe('validateVercelConfig', () => {
	it('passes with valid config', () => {
		expect(validateVercelConfig(validConfig).ok).toBe(true);
	});

	it('fails without databaseUrl', () => {
		const result = validateVercelConfig({ ...validConfig, databaseUrl: '' });
		expect(result.ok).toBe(false);
	});

	it('fails without databaseToken', () => {
		const result = validateVercelConfig({ ...validConfig, databaseToken: '' });
		expect(result.ok).toBe(false);
	});
});
