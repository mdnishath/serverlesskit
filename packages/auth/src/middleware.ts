import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { Action, AuthContext } from './auth.types.js';
import { hasPermission } from './permissions.js';

/** Generic request-like object that middleware operates on */
export type MiddlewareRequest = {
	headers: Record<string, string | undefined>;
};

/** Result of auth middleware check */
export type AuthResult = Result<AuthContext>;

/**
 * Extracts a Bearer token from the Authorization header.
 * @param request - The incoming request
 * @returns The token string or null
 */
export const extractBearerToken = (request: MiddlewareRequest): string | null => {
	const header = request.headers.authorization ?? request.headers.Authorization;
	if (!header?.startsWith('Bearer ')) return null;
	return header.slice(7);
};

/**
 * Extracts an API key from the X-API-Key header.
 * @param request - The incoming request
 * @returns The API key string or null
 */
export const extractApiKey = (request: MiddlewareRequest): string | null => {
	return request.headers['x-api-key'] ?? request.headers['X-API-Key'] ?? null;
};

/**
 * Creates a requireAuth middleware function.
 * Returns a function that validates the auth context exists.
 * @param getAuthContext - Function to resolve auth context from a request
 * @returns A middleware function that returns AuthResult
 */
export const createRequireAuth = (
	getAuthContext: (request: MiddlewareRequest) => Promise<AuthContext | null>,
) => {
	return async (request: MiddlewareRequest): Promise<AuthResult> => {
		const ctx = await getAuthContext(request);
		if (!ctx) {
			return fail(appError('UNAUTHORIZED', 'Authentication required'));
		}
		if (!ctx.user.isActive) {
			return fail(appError('FORBIDDEN', 'Account is deactivated'));
		}
		return ok(ctx);
	};
};

/**
 * Creates a requirePermission middleware function.
 * Checks that the authenticated user has the specified permission.
 * @param resource - The resource to check
 * @param action - The required action
 * @returns A function that validates auth + permission
 */
export const createRequirePermission = (resource: string, action: Action | string) => {
	return (ctx: AuthContext): Result<AuthContext> => {
		if (!hasPermission(ctx.permissionMap, resource, action)) {
			return fail(appError('FORBIDDEN', `No permission for ${resource}:${action}`));
		}
		return ok(ctx);
	};
};

/**
 * Simple in-memory rate limiter for serverless environments.
 * Uses a sliding window approach with configurable limits.
 * @param config - Rate limit configuration
 * @returns A function that checks rate limits by key
 */
export const createRateLimiter = (config: {
	maxRequests: number;
	windowMs: number;
}) => {
	const requests = new Map<string, number[]>();

	return (key: string): Result<void> => {
		const now = Date.now();
		const windowStart = now - config.windowMs;
		const existing = requests.get(key) ?? [];
		const recent = existing.filter((t) => t > windowStart);

		if (recent.length >= config.maxRequests) {
			return fail(
				appError('RATE_LIMITED', 'Too many requests', {
					retryAfter: Math.ceil((recent[0]! + config.windowMs - now) / 1000),
				}),
			);
		}

		recent.push(now);
		requests.set(key, recent);
		return ok(undefined);
	};
};

/**
 * Validates an API key format (must start with sk_live_ or sk_test_).
 * @param key - The API key to validate
 * @returns True if the format is valid
 */
export const isValidApiKeyFormat = (key: string): boolean => {
	return key.startsWith('sk_live_') || key.startsWith('sk_test_');
};
