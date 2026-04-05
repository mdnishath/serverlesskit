import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createRateLimiter,
	createRequireAuth,
	extractApiKey,
	extractBearerToken,
	isValidApiKeyFormat,
} from '../src/middleware.js';
import type { MiddlewareRequest } from '../src/middleware.js';
import type { AuthContext } from '../src/auth.types.js';

/** Helper to build a mock request */
const mockReq = (headers: Record<string, string | undefined> = {}): MiddlewareRequest => ({
	headers,
});

describe('Middleware — Edge Cases', () => {
	describe('extractBearerToken', () => {
		it('extracts from lowercase authorization header', () => {
			const req = mockReq({ authorization: 'Bearer abc123' });
			expect(extractBearerToken(req)).toBe('abc123');
		});

		it('extracts from uppercase Authorization header', () => {
			const req = mockReq({ Authorization: 'Bearer xyz789' });
			expect(extractBearerToken(req)).toBe('xyz789');
		});

		it('returns null for missing header', () => {
			expect(extractBearerToken(mockReq())).toBeNull();
		});

		it('returns null for non-Bearer scheme', () => {
			const req = mockReq({ authorization: 'Basic abc123' });
			expect(extractBearerToken(req)).toBeNull();
		});

		it('returns empty string for "Bearer " with no token', () => {
			const req = mockReq({ authorization: 'Bearer ' });
			expect(extractBearerToken(req)).toBe('');
		});
	});

	describe('extractApiKey', () => {
		it('extracts from lowercase x-api-key', () => {
			const req = mockReq({ 'x-api-key': 'sk_live_abc' });
			expect(extractApiKey(req)).toBe('sk_live_abc');
		});

		it('extracts from uppercase X-API-Key', () => {
			const req = mockReq({ 'X-API-Key': 'sk_test_xyz' });
			expect(extractApiKey(req)).toBe('sk_test_xyz');
		});

		it('returns null for missing header', () => {
			expect(extractApiKey(mockReq())).toBeNull();
		});
	});

	describe('isValidApiKeyFormat', () => {
		it('accepts sk_live_ prefix', () => {
			expect(isValidApiKeyFormat('sk_live_abc123')).toBe(true);
		});

		it('accepts sk_test_ prefix', () => {
			expect(isValidApiKeyFormat('sk_test_abc123')).toBe(true);
		});

		it('rejects empty string', () => {
			expect(isValidApiKeyFormat('')).toBe(false);
		});

		it('rejects prefix-only without secret', () => {
			expect(isValidApiKeyFormat('sk_live_')).toBe(true);
		});

		it('rejects invalid prefix', () => {
			expect(isValidApiKeyFormat('pk_live_abc123')).toBe(false);
		});

		it('handles very long keys', () => {
			const longKey = `sk_live_${'a'.repeat(1000)}`;
			expect(isValidApiKeyFormat(longKey)).toBe(true);
		});
	});

	describe('createRateLimiter', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('allows requests within limit', () => {
			const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
			expect(limiter('user1').ok).toBe(true);
			expect(limiter('user1').ok).toBe(true);
			expect(limiter('user1').ok).toBe(true);
		});

		it('blocks requests exceeding limit', () => {
			const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
			limiter('user1');
			limiter('user1');
			const result = limiter('user1');
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('RATE_LIMITED');
		});

		it('resets after window expires', () => {
			const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
			limiter('user1');
			const blocked = limiter('user1');
			expect(blocked.ok).toBe(false);

			vi.advanceTimersByTime(1001);
			const allowed = limiter('user1');
			expect(allowed.ok).toBe(true);
		});

		it('tracks different keys independently', () => {
			const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 });
			expect(limiter('user1').ok).toBe(true);
			expect(limiter('user2').ok).toBe(true);
			expect(limiter('user1').ok).toBe(false);
			expect(limiter('user2').ok).toBe(false);
		});

		it('two independent limiters do not share state', () => {
			const limiter1 = createRateLimiter({ maxRequests: 1, windowMs: 60000 });
			const limiter2 = createRateLimiter({ maxRequests: 1, windowMs: 60000 });
			expect(limiter1('key').ok).toBe(true);
			expect(limiter2('key').ok).toBe(true);
		});
	});

	describe('createRequireAuth', () => {
		it('returns UNAUTHORIZED when resolver returns null', async () => {
			const requireAuth = createRequireAuth(async () => null);
			const result = await requireAuth(mockReq());
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('UNAUTHORIZED');
		});

		it('returns FORBIDDEN for inactive user', async () => {
			const ctx: AuthContext = {
				user: { id: '1', email: 'x@x.com', name: 'X', role: 'viewer', isActive: false },
				session: { id: 's1', userId: '1', expiresAt: '' },
				permissionMap: new Set(),
			};
			const requireAuth = createRequireAuth(async () => ctx);
			const result = await requireAuth(mockReq());
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('FORBIDDEN');
		});

		it('returns auth context for active user', async () => {
			const ctx: AuthContext = {
				user: { id: '1', email: 'x@x.com', name: 'X', role: 'admin', isActive: true },
				session: { id: 's1', userId: '1', expiresAt: '' },
				permissionMap: new Set(['*']),
			};
			const requireAuth = createRequireAuth(async () => ctx);
			const result = await requireAuth(mockReq());
			expect(result.ok).toBe(true);
		});
	});
});
