import type { InValue } from '@libsql/client';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@serverlesskit/shared/constants';
import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { PaginatedResult } from '@serverlesskit/shared/types';
import type { CollectionDefinition } from '../schema/schema.types.js';
import type { CrudDeps, Entry, FieldFilter, QueryOptions } from './crud.types.js';

/**
 * Builds WHERE clause fragments from query filters.
 * @param filter - The filter conditions
 * @returns SQL fragments and parameter values
 */
const buildWhereClause = (
	filter: Record<string, FieldFilter>,
): { sql: string; args: InValue[] } => {
	const conditions: string[] = [];
	const args: InValue[] = [];

	for (const [field, ops] of Object.entries(filter)) {
		for (const [op, value] of Object.entries(ops)) {
			switch (op) {
				case 'eq':
					conditions.push(`"${field}" = ?`);
					args.push(value as InValue);
					break;
				case 'ne':
					conditions.push(`"${field}" != ?`);
					args.push(value as InValue);
					break;
				case 'gt':
					conditions.push(`"${field}" > ?`);
					args.push(value as InValue);
					break;
				case 'gte':
					conditions.push(`"${field}" >= ?`);
					args.push(value as InValue);
					break;
				case 'lt':
					conditions.push(`"${field}" < ?`);
					args.push(value as InValue);
					break;
				case 'lte':
					conditions.push(`"${field}" <= ?`);
					args.push(value as InValue);
					break;
				case 'contains':
					conditions.push(`"${field}" LIKE ?`);
					args.push(`%${String(value)}%`);
					break;
				case 'startsWith':
					conditions.push(`"${field}" LIKE ?`);
					args.push(`${String(value)}%`);
					break;
				case 'in':
					if (Array.isArray(value) && value.length > 0) {
						conditions.push(`"${field}" IN (${value.map(() => '?').join(', ')})`);
						args.push(...(value as InValue[]));
					}
					break;
				case 'notIn':
					if (Array.isArray(value) && value.length > 0) {
						conditions.push(`"${field}" NOT IN (${value.map(() => '?').join(', ')})`);
						args.push(...(value as InValue[]));
					}
					break;
			}
		}
	}

	return {
		sql: conditions.length > 0 ? conditions.join(' AND ') : '',
		args,
	};
};

/**
 * Finds multiple entries in a collection with filtering, sorting, and pagination.
 * @param deps - Database dependencies
 * @param collection - The collection definition
 * @param options - Query options (filter, sort, page, limit)
 * @returns A Result containing paginated entries
 */
export const findMany = async (
	deps: CrudDeps,
	collection: CollectionDefinition,
	options: QueryOptions = {},
): Promise<Result<PaginatedResult<Entry>>> => {
	try {
		const page = options.page ?? DEFAULT_PAGE;
		const limit = Math.min(options.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
		const offset = (page - 1) * limit;

		const whereParts: string[] = [];
		const whereArgs: InValue[] = [];

		if (collection.softDelete && !options.includeSoftDeleted) {
			whereParts.push('"deletedAt" IS NULL');
		}

		if (options.filter) {
			const filterClause = buildWhereClause(options.filter);
			if (filterClause.sql) {
				whereParts.push(filterClause.sql);
				whereArgs.push(...filterClause.args);
			}
		}

		const whereStr = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

		let orderStr = '';
		if (options.sort && options.sort.length > 0) {
			const orderParts = options.sort.map(
				(s) => `"${s.field}" ${s.order === 'desc' ? 'DESC' : 'ASC'}`,
			);
			orderStr = `ORDER BY ${orderParts.join(', ')}`;
		}

		const selectCols =
			options.fields && options.fields.length > 0
				? options.fields.map((f) => `"${f}"`).join(', ')
				: '*';

		const countSql = `SELECT COUNT(*) as total FROM "${collection.slug}" ${whereStr}`;
		const countResult = await deps.client.execute({ sql: countSql, args: whereArgs });
		const total = Number(countResult.rows[0]?.total ?? 0);

		const dataSql = `SELECT ${selectCols} FROM "${collection.slug}" ${whereStr} ${orderStr} LIMIT ? OFFSET ?`;
		const dataResult = await deps.client.execute({
			sql: dataSql,
			args: [...whereArgs, limit, offset] as InValue[],
		});

		const data = dataResult.rows.map((row) => ({ ...row }) as unknown as Entry);

		return ok({
			data,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to query entries';
		return fail(appError('DB_ERROR', message, error));
	}
};

/**
 * Finds a single entry by ID.
 * @param deps - Database dependencies
 * @param collection - The collection definition
 * @param id - The entry ID
 * @param options - Optional query options
 * @returns A Result containing the entry or null if not found
 */
export const findOne = async (
	deps: CrudDeps,
	collection: CollectionDefinition,
	id: string,
	options: Pick<QueryOptions, 'fields' | 'includeSoftDeleted'> = {},
): Promise<Result<Entry | null>> => {
	try {
		const whereParts = ['"id" = ?'];
		const whereArgs: InValue[] = [id];

		if (collection.softDelete && !options.includeSoftDeleted) {
			whereParts.push('"deletedAt" IS NULL');
		}

		const selectCols =
			options.fields && options.fields.length > 0
				? options.fields.map((f) => `"${f}"`).join(', ')
				: '*';

		const sql = `SELECT ${selectCols} FROM "${collection.slug}" WHERE ${whereParts.join(' AND ')} LIMIT 1`;
		const result = await deps.client.execute({ sql, args: whereArgs });

		if (result.rows.length === 0) {
			return ok(null);
		}

		return ok({ ...result.rows[0] } as unknown as Entry);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to find entry';
		return fail(appError('DB_ERROR', message, error));
	}
};
