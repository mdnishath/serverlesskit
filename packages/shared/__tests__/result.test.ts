import { describe, expect, it } from 'vitest';
import { appError, fail, ok, tryCatch } from '../src/result.js';

describe('Result utilities', () => {
	describe('ok', () => {
		it('creates a success result with data', () => {
			const result = ok(42);
			expect(result).toEqual({ ok: true, data: 42 });
		});

		it('creates a success result with complex data', () => {
			const data = { name: 'test', items: [1, 2, 3] };
			const result = ok(data);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data).toEqual(data);
			}
		});
	});

	describe('fail', () => {
		it('creates a failure result with error', () => {
			const error = appError('NOT_FOUND', 'Item not found');
			const result = fail(error);
			expect(result).toEqual({ ok: false, error });
		});

		it('includes details when provided', () => {
			const error = appError('VALIDATION_ERROR', 'Invalid', { field: 'name' });
			const result = fail(error);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.details).toEqual({ field: 'name' });
			}
		});
	});

	describe('appError', () => {
		it('creates an error without details', () => {
			const error = appError('TEST', 'test message');
			expect(error).toEqual({ code: 'TEST', message: 'test message' });
			expect(error).not.toHaveProperty('details');
		});

		it('creates an error with details', () => {
			const error = appError('TEST', 'msg', [1, 2]);
			expect(error.details).toEqual([1, 2]);
		});
	});

	describe('tryCatch', () => {
		it('returns ok when function succeeds', async () => {
			const result = await tryCatch(() => Promise.resolve('hello'));
			expect(result).toEqual({ ok: true, data: 'hello' });
		});

		it('returns fail when function throws', async () => {
			const result = await tryCatch(() => Promise.reject(new Error('boom')));
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe('UNEXPECTED_ERROR');
				expect(result.error.message).toBe('boom');
			}
		});

		it('handles non-Error throws', async () => {
			const result = await tryCatch(() => Promise.reject('string error'));
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toBe('Unknown error');
			}
		});
	});
});
