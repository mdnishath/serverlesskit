import type { CrudContext, Entry } from '../crud/crud.types.js';

/** Supported lifecycle hook events */
export type HookEvent =
	| 'beforeCreate'
	| 'afterCreate'
	| 'beforeUpdate'
	| 'afterUpdate'
	| 'beforeDelete'
	| 'afterDelete'
	| 'beforeRead'
	| 'afterRead';

/** Payload passed to hook handlers */
export type HookPayload = {
	/** The collection slug */
	collection: string;
	/** The entry data (may be partial for updates) */
	data?: Record<string, unknown>;
	/** The existing entry (for update/delete hooks) */
	entry?: Entry;
	/** The entry ID (for read/update/delete hooks) */
	entryId?: string;
	/** CRUD operation context */
	context: CrudContext;
};

/** A hook handler function */
export type HookHandler = (payload: HookPayload) => Promise<HookPayload | undefined>;
