import { describe, expect, it } from 'vitest';
import { parseFilterParams, parseQueryParams, parseSortParam } from '../src/rest/query-parser.js';

describe('parseQueryParams', () => {
	it('parses page and limit', () => {
		const result = parseQueryParams({ page: '2', limit: '10' });
		expect(result.page).toBe(2);
		expect(result.limit).toBe(10);
	});

	it('uses defaults for missing page/limit', () => {
		const result = parseQueryParams({});
		expect(result.page).toBe(1);
		expect(result.limit).toBe(25);
	});

	it('caps limit at MAX_PAGE_LIMIT (100)', () => {
		const result = parseQueryParams({ limit: '500' });
		expect(result.limit).toBe(100);
	});

	it('handles invalid page gracefully', () => {
		const result = parseQueryParams({ page: 'abc' });
		expect(result.page).toBe(1);
	});

	it('parses fields parameter', () => {
		const result = parseQueryParams({ fields: 'title,status,views' });
		expect(result.fields).toEqual(['title', 'status', 'views']);
	});

	it('parses populate parameter', () => {
		const result = parseQueryParams({ populate: 'author,category' });
		expect(result.populate).toEqual(['author', 'category']);
	});

	it('parses sort parameter', () => {
		const result = parseQueryParams({ sort: '-createdAt,title' });
		expect(result.sort).toEqual([
			{ field: 'createdAt', order: 'desc' },
			{ field: 'title', order: 'asc' },
		]);
	});

	it('parses filter parameters', () => {
		const result = parseQueryParams({
			'filter[status]': 'active',
			'filter[budget][gte]': '1000',
		});
		expect(result.filter).toEqual({
			status: { eq: 'active' },
			budget: { gte: 1000 },
		});
	});
});

describe('parseSortParam', () => {
	it('parses ascending sort', () => {
		expect(parseSortParam('title')).toEqual([{ field: 'title', order: 'asc' }]);
	});

	it('parses descending sort with - prefix', () => {
		expect(parseSortParam('-createdAt')).toEqual([{ field: 'createdAt', order: 'desc' }]);
	});

	it('parses multiple sort fields', () => {
		const result = parseSortParam('-views,title');
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ field: 'views', order: 'desc' });
		expect(result[1]).toEqual({ field: 'title', order: 'asc' });
	});
});

describe('parseFilterParams', () => {
	it('parses simple equality filter', () => {
		const result = parseFilterParams({ 'filter[status]': 'active' });
		expect(result).toEqual({ status: { eq: 'active' } });
	});

	it('parses operator filter', () => {
		const result = parseFilterParams({ 'filter[price][gte]': '100' });
		expect(result).toEqual({ price: { gte: 100 } });
	});

	it('parses boolean values', () => {
		const result = parseFilterParams({ 'filter[active]': 'true' });
		expect(result).toEqual({ active: { eq: true } });
	});

	it('parses in operator as comma-separated array', () => {
		const result = parseFilterParams({ 'filter[status][in]': 'draft,published' });
		expect(result).toEqual({ status: { in: ['draft', 'published'] } });
	});

	it('ignores non-filter query params', () => {
		const result = parseFilterParams({ page: '1', sort: '-title', 'filter[name]': 'test' });
		expect(Object.keys(result)).toEqual(['name']);
	});

	it('handles multiple filters on same field', () => {
		const result = parseFilterParams({
			'filter[price][gte]': '10',
			'filter[price][lte]': '100',
		});
		expect(result).toEqual({ price: { gte: 10, lte: 100 } });
	});
});
