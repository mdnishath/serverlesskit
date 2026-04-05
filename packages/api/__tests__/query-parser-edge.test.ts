import { describe, expect, it } from 'vitest';
import { MAX_PAGE_LIMIT } from '@serverlesskit/shared/constants';
import { parseFilterParams, parseQueryParams, parseSortParam } from '../src/rest/query-parser.js';

describe('Query Parser — Edge Cases', () => {
	describe('parseSortParam', () => {
		it('returns empty array for empty string', () => {
			expect(parseSortParam('')).toEqual([]);
		});

		it('ignores consecutive commas', () => {
			const result = parseSortParam('title,,,status');
			expect(result).toHaveLength(2);
			expect(result[0]?.field).toBe('title');
			expect(result[1]?.field).toBe('status');
		});

		it('handles whitespace around fields', () => {
			const result = parseSortParam(' title , -status ');
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ field: 'title', order: 'asc' });
			expect(result[1]).toEqual({ field: 'status', order: 'desc' });
		});

		it('single descending field', () => {
			const result = parseSortParam('-createdAt');
			expect(result).toEqual([{ field: 'createdAt', order: 'desc' }]);
		});
	});

	describe('parseQueryParams', () => {
		it('clamps limit to MAX_PAGE_LIMIT', () => {
			const result = parseQueryParams({ limit: '999' });
			expect(result.limit).toBe(MAX_PAGE_LIMIT);
		});

		it('defaults page for non-numeric string', () => {
			const result = parseQueryParams({ page: 'abc' });
			expect(result.page).toBe(1);
		});

		it('defaults page for negative value', () => {
			const result = parseQueryParams({ page: '-5' });
			expect(result.page).toBe(1);
		});

		it('defaults page for zero', () => {
			const result = parseQueryParams({ page: '0' });
			expect(result.page).toBe(1);
		});

		it('defaults limit for non-numeric string', () => {
			const result = parseQueryParams({ limit: 'xyz' });
			expect(result.limit).toBe(25);
		});

		it('parses valid page and limit', () => {
			const result = parseQueryParams({ page: '3', limit: '50' });
			expect(result.page).toBe(3);
			expect(result.limit).toBe(50);
		});

		it('returns empty options for empty query', () => {
			const result = parseQueryParams({});
			expect(result.page).toBe(1);
			expect(result.limit).toBe(25);
			expect(result.filter).toBeUndefined();
			expect(result.sort).toBeUndefined();
		});
	});

	describe('parseFilterParams', () => {
		it('parses in operator as array', () => {
			const result = parseFilterParams({ 'filter[status][in]': 'draft,published' });
			expect(result.status).toBeDefined();
			const inVal = (result.status as Record<string, unknown>).in;
			expect(Array.isArray(inVal)).toBe(true);
			expect(inVal).toEqual(['draft', 'published']);
		});

		it('parses notIn operator as array', () => {
			const result = parseFilterParams({ 'filter[status][notIn]': 'archived' });
			const notIn = (result.status as Record<string, unknown>).notIn;
			expect(Array.isArray(notIn)).toBe(true);
		});

		it('coerces boolean string values', () => {
			const result = parseFilterParams({ 'filter[active]': 'true' });
			expect((result.active as Record<string, unknown>).eq).toBe(true);
		});

		it('coerces numeric string values', () => {
			const result = parseFilterParams({ 'filter[views][gte]': '100' });
			expect((result.views as Record<string, unknown>).gte).toBe(100);
		});

		it('keeps non-numeric strings as-is', () => {
			const result = parseFilterParams({ 'filter[title]': 'hello' });
			expect((result.title as Record<string, unknown>).eq).toBe('hello');
		});

		it('ignores non-filter params', () => {
			const result = parseFilterParams({ page: '1', sort: 'title' });
			expect(Object.keys(result)).toHaveLength(0);
		});

		it('handles multiple filters on same field', () => {
			const result = parseFilterParams({
				'filter[views][gte]': '10',
				'filter[views][lte]': '100',
			});
			const views = result.views as Record<string, unknown>;
			expect(views.gte).toBe(10);
			expect(views.lte).toBe(100);
		});
	});
});
