import { describe, expect, it } from 'vitest';
import { created, error, errorCodeToStatus, paginated, success } from '../src/rest/response.js';

describe('response helpers', () => {
	describe('success', () => {
		it('returns 200 with data', () => {
			const res = success({ name: 'test' });
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect(res.body.data).toEqual({ name: 'test' });
			}
		});

		it('includes meta when provided', () => {
			const res = success('data', { version: '1.0' });
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect(res.body.meta).toEqual({ version: '1.0' });
			}
		});
	});

	describe('created', () => {
		it('returns 201 with data', () => {
			const res = created({ id: '1' });
			expect(res.status).toBe(201);
			expect(res.body.ok).toBe(true);
		});
	});

	describe('error', () => {
		it('returns error with correct status', () => {
			const res = error(404, 'NOT_FOUND', 'Item not found');
			expect(res.status).toBe(404);
			expect(res.body.ok).toBe(false);
			if (!res.body.ok) {
				expect(res.body.error.code).toBe('NOT_FOUND');
				expect(res.body.error.message).toBe('Item not found');
			}
		});

		it('includes details when provided', () => {
			const res = error(422, 'VALIDATION', 'Invalid', { field: 'name' });
			if (!res.body.ok) {
				expect(res.body.error.details).toEqual({ field: 'name' });
			}
		});
	});

	describe('paginated', () => {
		it('returns 200 with pagination meta', () => {
			const res = paginated(
				[{ id: '1' }, { id: '2' }],
				{ page: 1, limit: 25, total: 2, totalPages: 1 },
			);
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect(res.body.data).toHaveLength(2);
				expect(res.body.meta?.pagination).toEqual({
					page: 1,
					limit: 25,
					total: 2,
					totalPages: 1,
				});
			}
		});

		it('includes duration when provided', () => {
			const res = paginated([], { page: 1, limit: 25, total: 0, totalPages: 0 }, 42);
			if (res.body.ok) {
				expect(res.body.meta?.durationMs).toBe(42);
			}
		});
	});

	describe('errorCodeToStatus', () => {
		it('maps known error codes', () => {
			expect(errorCodeToStatus('NOT_FOUND')).toBe(404);
			expect(errorCodeToStatus('UNAUTHORIZED')).toBe(401);
			expect(errorCodeToStatus('FORBIDDEN')).toBe(403);
			expect(errorCodeToStatus('VALIDATION_ERROR')).toBe(422);
			expect(errorCodeToStatus('RATE_LIMITED')).toBe(429);
		});

		it('defaults to 500 for unknown codes', () => {
			expect(errorCodeToStatus('UNKNOWN')).toBe(500);
		});
	});
});
