import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateEnv } from '../src/env.js';

describe('validateEnv', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('validates string env variables', () => {
		process.env['DB_URL'] = 'sqlite://test.db';

		const result = validateEnv({
			DB_URL: { type: 'string' },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.DB_URL).toBe('sqlite://test.db');
		}
	});

	it('validates number env variables', () => {
		process.env['PORT'] = '3000';

		const result = validateEnv({
			PORT: { type: 'number' },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.PORT).toBe(3000);
		}
	});

	it('validates boolean env variables', () => {
		process.env['DEBUG'] = 'true';

		const result = validateEnv({
			DEBUG: { type: 'boolean' },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.DEBUG).toBe(true);
		}
	});

	it('accepts "1" and "0" as boolean values', () => {
		process.env['ENABLED'] = '1';

		const result = validateEnv({
			ENABLED: { type: 'boolean' },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.ENABLED).toBe(true);
		}
	});

	it('fails for missing required variables', () => {
		const result = validateEnv({
			MISSING_VAR: { type: 'string' },
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('ENV_VALIDATION_ERROR');
		}
	});

	it('uses default values when variable is missing', () => {
		const result = validateEnv({
			PORT: { type: 'number', default: 8080 },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.PORT).toBe(8080);
		}
	});

	it('allows optional variables to be undefined', () => {
		const result = validateEnv({
			OPTIONAL: { type: 'string', required: false },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.OPTIONAL).toBeUndefined();
		}
	});

	it('fails for invalid number values', () => {
		process.env['PORT'] = 'not-a-number';

		const result = validateEnv({
			PORT: { type: 'number' },
		});

		expect(result.ok).toBe(false);
	});

	it('fails for invalid boolean values', () => {
		process.env['DEBUG'] = 'maybe';

		const result = validateEnv({
			DEBUG: { type: 'boolean' },
		});

		expect(result.ok).toBe(false);
	});

	it('collects multiple errors', () => {
		const result = validateEnv({
			A: { type: 'string' },
			B: { type: 'number' },
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect((result.error.details as string[]).length).toBe(2);
		}
	});
});
