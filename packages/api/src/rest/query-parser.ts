import type { FieldFilter, QueryOptions } from '@serverlesskit/core/crud';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@serverlesskit/shared/constants';
import type { SortField } from '@serverlesskit/shared/types';

/**
 * Parses URL query parameters into QueryOptions for CRUD read operations.
 *
 * Supported formats:
 * - filter[status]=active        → { filter: { status: { eq: "active" } } }
 * - filter[budget][gte]=1000     → { filter: { budget: { gte: 1000 } } }
 * - sort=-createdAt,title        → { sort: [{ field: "createdAt", order: "desc" }, ...] }
 * - page=2&limit=25              → { page: 2, limit: 25 }
 * - fields=title,status           → { fields: ["title", "status"] }
 * - populate=client              → { populate: ["client"] }
 *
 * @param query - Raw query string parameters
 * @returns Parsed QueryOptions
 */
export const parseQueryParams = (query: Record<string, string>): QueryOptions => {
	const options: QueryOptions = {};

	options.page = parsePositiveInt(query.page, DEFAULT_PAGE);
	options.limit = Math.min(parsePositiveInt(query.limit, DEFAULT_PAGE_LIMIT), MAX_PAGE_LIMIT);

	if (query.fields) {
		options.fields = query.fields
			.split(',')
			.map((f) => f.trim())
			.filter(Boolean);
	}

	if (query.populate) {
		options.populate = query.populate
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);
	}

	if (query.sort) {
		options.sort = parseSortParam(query.sort);
	}

	const filter = parseFilterParams(query);
	if (Object.keys(filter).length > 0) {
		options.filter = filter;
	}

	return options;
};

/**
 * Parses a sort string like "-createdAt,title" into SortField[].
 * Prefix "-" means descending, no prefix means ascending.
 * @param sortStr - The raw sort parameter
 * @returns Array of sort instructions
 */
export const parseSortParam = (sortStr: string): SortField[] => {
	return sortStr
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => {
			if (s.startsWith('-')) {
				return { field: s.slice(1), order: 'desc' as const };
			}
			return { field: s, order: 'asc' as const };
		});
};

/**
 * Extracts filter conditions from query parameters.
 * Supports: filter[field]=value and filter[field][op]=value
 * @param query - Raw query parameters
 * @returns Parsed filter record
 */
export const parseFilterParams = (query: Record<string, string>): Record<string, FieldFilter> => {
	const filters: Record<string, FieldFilter> = {};

	for (const [key, value] of Object.entries(query)) {
		const match = key.match(/^filter\[(\w+)](?:\[(\w+)])?$/);
		if (!match) continue;

		const fieldName = match[1]!;
		const operator = match[2] ?? 'eq';

		if (!filters[fieldName]) {
			filters[fieldName] = {};
		}

		const parsed = tryParseValue(value);

		const fieldFilter = filters[fieldName] as Record<string, unknown>;
		if (operator === 'in' || operator === 'notIn') {
			fieldFilter[operator] = value.split(',').map(tryParseValue);
		} else {
			fieldFilter[operator] = parsed;
		}
	}

	return filters;
};

/**
 * Tries to parse a string value into a number or boolean if applicable.
 * @param value - The raw string value
 * @returns The parsed value
 */
const tryParseValue = (value: string): string | number | boolean => {
	if (value === 'true') return true;
	if (value === 'false') return false;
	const num = Number(value);
	if (!Number.isNaN(num) && value.trim() !== '') return num;
	return value;
};

/**
 * Parses a string to a positive integer with a fallback.
 * @param value - The raw string value
 * @param fallback - Default value if parsing fails
 * @returns The parsed positive integer
 */
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
};
