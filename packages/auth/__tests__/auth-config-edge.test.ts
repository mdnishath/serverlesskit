import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, verifyApiKey } from '../src/auth-config.js';

describe('Auth Config — Edge Cases', () => {
	describe('generateApiKey', () => {
		it('live key starts with sk_live_', () => {
			const { rawKey } = generateApiKey(true);
			expect(rawKey.startsWith('sk_live_')).toBe(true);
		});

		it('test key starts with sk_test_', () => {
			const { rawKey } = generateApiKey(false);
			expect(rawKey.startsWith('sk_test_')).toBe(true);
		});

		it('generates consistent length keys', () => {
			const key1 = generateApiKey(true);
			const key2 = generateApiKey(true);
			expect(key1.rawKey.length).toBe(key2.rawKey.length);
		});

		it('generates unique keys on each call', () => {
			const keys = Array.from({ length: 10 }, () => generateApiKey(true).rawKey);
			const unique = new Set(keys);
			expect(unique.size).toBe(10);
		});

		it('prefix field masks the secret', () => {
			const { prefix, rawKey } = generateApiKey(true);
			expect(prefix).toContain('...');
			expect(prefix.length).toBeLessThan(rawKey.length);
		});
	});

	describe('hashApiKey', () => {
		it('produces consistent hash for same input', async () => {
			const hash1 = await hashApiKey('sk_live_test123');
			const hash2 = await hashApiKey('sk_live_test123');
			expect(hash1).toBe(hash2);
		});

		it('produces different hashes for different inputs', async () => {
			const hash1 = await hashApiKey('sk_live_aaa');
			const hash2 = await hashApiKey('sk_live_bbb');
			expect(hash1).not.toBe(hash2);
		});

		it('handles empty string', async () => {
			const hash = await hashApiKey('');
			expect(hash).toBeDefined();
			expect(hash.length).toBe(64);
		});

		it('produces 64-character hex string', async () => {
			const hash = await hashApiKey('sk_live_abc123');
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});
	});

	describe('verifyApiKey', () => {
		it('returns true for matching key', async () => {
			const key = 'sk_live_secret123';
			const hash = await hashApiKey(key);
			expect(await verifyApiKey(key, hash)).toBe(true);
		});

		it('returns false for non-matching key', async () => {
			const hash = await hashApiKey('sk_live_real');
			expect(await verifyApiKey('sk_live_fake', hash)).toBe(false);
		});

		it('returns false for empty key against real hash', async () => {
			const hash = await hashApiKey('sk_live_something');
			expect(await verifyApiKey('', hash)).toBe(false);
		});

		it('handles empty key and empty hash comparison', async () => {
			const hash = await hashApiKey('');
			expect(await verifyApiKey('', hash)).toBe(true);
		});
	});
});
