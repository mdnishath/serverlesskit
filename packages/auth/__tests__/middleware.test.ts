import { describe, expect, it } from 'vitest';
import {
	createRateLimiter,
	createRequireAuth,
	createRequirePermission,
	extractApiKey,
	extractBearerToken,
	isValidApiKeyFormat,
} from '../src/middleware.js';
import type { AuthContext, User } from '../src/auth.types.js';
import { buildPermissionMap } from '../src/permissions.js';

const mockUser: User = {
	id: 'user-1',
	email: 'test@example.com',
	name: 'Test User',
	role: 'editor',
	isActive: true,
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: '2025-01-01T00:00:00Z',
};

const mockCtx: AuthContext = {
	user: mockUser,
	session: { userId: 'user-1', role: 'editor', expiresAt: '2099-12-31T00:00:00Z' },
	permissionMap: buildPermissionMap(['*:read', '*:create', '*:update', 'media:*']),
};

describe('extractBearerToken', () => {
	it('extracts token from Authorization header', () => {
		const token = extractBearerToken({ headers: { authorization: 'Bearer abc123' } });
		expect(token).toBe('abc123');
	});

	it('returns null for missing header', () => {
		expect(extractBearerToken({ headers: {} })).toBeNull();
	});

	it('returns null for non-Bearer auth', () => {
		expect(extractBearerToken({ headers: { authorization: 'Basic abc' } })).toBeNull();
	});
});

describe('extractApiKey', () => {
	it('extracts API key from x-api-key header', () => {
		const key = extractApiKey({ headers: { 'x-api-key': 'sk_live_abc' } });
		expect(key).toBe('sk_live_abc');
	});

	it('returns null for missing header', () => {
		expect(extractApiKey({ headers: {} })).toBeNull();
	});
});

describe('createRequireAuth', () => {
	it('returns auth context when authenticated', async () => {
		const requireAuth = createRequireAuth(async () => mockCtx);
		const result = await requireAuth({ headers: {} });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.user.id).toBe('user-1');
	});

	it('fails when no auth context', async () => {
		const requireAuth = createRequireAuth(async () => null);
		const result = await requireAuth({ headers: {} });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('UNAUTHORIZED');
	});

	it('fails when user is deactivated', async () => {
		const inactiveCtx = {
			...mockCtx,
			user: { ...mockUser, isActive: false },
		};
		const requireAuth = createRequireAuth(async () => inactiveCtx);
		const result = await requireAuth({ headers: {} });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('FORBIDDEN');
	});
});

describe('createRequirePermission', () => {
	it('passes when permission exists', () => {
		const check = createRequirePermission('posts', 'read');
		const result = check(mockCtx);
		expect(result.ok).toBe(true);
	});

	it('fails when permission missing', () => {
		const check = createRequirePermission('posts', 'delete');
		const result = check(mockCtx);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('FORBIDDEN');
	});
});

describe('createRateLimiter', () => {
	it('allows requests within limit', () => {
		const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });
		expect(limiter('user-1').ok).toBe(true);
		expect(limiter('user-1').ok).toBe(true);
		expect(limiter('user-1').ok).toBe(true);
	});

	it('blocks requests over limit', () => {
		const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });
		limiter('user-1');
		limiter('user-1');
		const result = limiter('user-1');

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('RATE_LIMITED');
	});

	it('tracks different keys separately', () => {
		const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
		expect(limiter('user-1').ok).toBe(true);
		expect(limiter('user-2').ok).toBe(true);
		expect(limiter('user-1').ok).toBe(false);
	});
});

describe('isValidApiKeyFormat', () => {
	it('validates live key format', () => {
		expect(isValidApiKeyFormat('sk_live_abc123')).toBe(true);
	});

	it('validates test key format', () => {
		expect(isValidApiKeyFormat('sk_test_abc123')).toBe(true);
	});

	it('rejects invalid format', () => {
		expect(isValidApiKeyFormat('invalid_key')).toBe(false);
	});
});
