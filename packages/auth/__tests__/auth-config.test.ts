import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, verifyApiKey } from '../src/auth-config.js';

describe('generateApiKey', () => {
	it('generates a live key with sk_live_ prefix', () => {
		const { rawKey, prefix } = generateApiKey(true);
		expect(rawKey).toMatch(/^sk_live_/);
		expect(prefix).toMatch(/^sk_live_/);
		expect(prefix).toContain('...');
	});

	it('generates a test key with sk_test_ prefix', () => {
		const { rawKey, prefix } = generateApiKey(false);
		expect(rawKey).toMatch(/^sk_test_/);
	});

	it('generates unique keys', () => {
		const key1 = generateApiKey(true);
		const key2 = generateApiKey(true);
		expect(key1.rawKey).not.toBe(key2.rawKey);
	});
});

describe('hashApiKey', () => {
	it('returns a hex string', async () => {
		const hash = await hashApiKey('sk_live_test123');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('produces consistent hashes', async () => {
		const hash1 = await hashApiKey('sk_live_abc');
		const hash2 = await hashApiKey('sk_live_abc');
		expect(hash1).toBe(hash2);
	});

	it('produces different hashes for different keys', async () => {
		const hash1 = await hashApiKey('sk_live_abc');
		const hash2 = await hashApiKey('sk_live_xyz');
		expect(hash1).not.toBe(hash2);
	});
});

describe('verifyApiKey', () => {
	it('verifies a correct key', async () => {
		const key = 'sk_live_mysecretkey';
		const hash = await hashApiKey(key);
		expect(await verifyApiKey(key, hash)).toBe(true);
	});

	it('rejects an incorrect key', async () => {
		const hash = await hashApiKey('sk_live_correct');
		expect(await verifyApiKey('sk_live_wrong', hash)).toBe(false);
	});
});
