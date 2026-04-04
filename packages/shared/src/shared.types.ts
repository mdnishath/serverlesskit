/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/** A single sort instruction */
export type SortField = {
	field: string;
	order: SortOrder;
};

/** Filter comparison operators */
export type FilterOp =
	| 'eq'
	| 'ne'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'in'
	| 'notIn'
	| 'contains'
	| 'startsWith';

/** A single filter condition */
export type FilterCondition = {
	field: string;
	op: FilterOp;
	value: unknown;
};

/** Pagination input parameters */
export type PaginationInput = {
	page: number;
	limit: number;
};

/** Pagination metadata returned with paginated results */
export type PaginationMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

/** Paginated result wrapper */
export type PaginatedResult<T> = {
	data: T[];
	pagination: PaginationMeta;
};

/** Timestamp fields added to entries */
export type Timestamps = {
	createdAt: string;
	updatedAt: string;
};

/** Soft delete field */
export type SoftDelete = {
	deletedAt: string | null;
};

/** Base entity with ID and optional timestamps */
export type BaseEntity = {
	id: string;
} & Partial<Timestamps> &
	Partial<SoftDelete>;
