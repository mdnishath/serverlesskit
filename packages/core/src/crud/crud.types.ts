import type { Client } from '@libsql/client';
import type { FilterOp, PaginatedResult, SortField } from '@serverlesskit/shared/types';

/** Context passed to every CRUD operation */
export type CrudContext = {
	/** The current user ID (if authenticated) */
	userId?: string;
	/** The current user's role */
	role?: string;
	/** Request locale */
	locale?: string;
};

/** Filter condition for a single field */
export type FieldFilter = Partial<Record<FilterOp, unknown>>;

/** Query options for read operations */
export type QueryOptions = {
	/** Field filters */
	filter?: Record<string, FieldFilter>;
	/** Sort instructions */
	sort?: SortField[];
	/** Page number (1-based) */
	page?: number;
	/** Items per page */
	limit?: number;
	/** Fields to select (empty = all) */
	fields?: string[];
	/** Relation fields to populate */
	populate?: string[];
	/** Include soft-deleted entries */
	includeSoftDeleted?: boolean;
};

/** A single entry record from the database */
export type Entry = Record<string, unknown> & {
	id: string;
};

/** Dependencies injected into CRUD operations */
export type CrudDeps = {
	/** Raw libSQL client for executing queries */
	client: Client;
};

/** Re-export for convenience */
export type { PaginatedResult };
