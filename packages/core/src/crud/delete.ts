import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { HookManager } from '../hooks/lifecycle-hooks.js';
import type { CollectionDefinition } from '../schema/schema.types.js';
import type { CrudContext, CrudDeps } from './crud.types.js';
import { findOne } from './read.js';

/** Options for delete operation */
type DeleteOptions = {
	/** Force hard delete even if softDelete is enabled */
	forceDelete?: boolean;
};

/**
 * Deletes an entry by ID. Uses soft delete if enabled, unless forceDelete is set.
 * @param deps - Database dependencies
 * @param collection - The collection definition
 * @param id - The entry ID to delete
 * @param context - CRUD operation context
 * @param hooks - Optional hook manager
 * @param options - Delete options
 * @returns A Result indicating success
 */
export const deleteEntry = async (
	deps: CrudDeps,
	collection: CollectionDefinition,
	id: string,
	context: CrudContext = {},
	hooks?: HookManager,
	options: DeleteOptions = {},
): Promise<Result<void>> => {
	try {
		const existingResult = await findOne(deps, collection, id, { includeSoftDeleted: true });
		if (!existingResult.ok) return existingResult;
		if (!existingResult.data) {
			return fail(appError('NOT_FOUND', `Entry "${id}" not found in ${collection.slug}`));
		}

		const existing = existingResult.data;

		if (hooks) {
			await hooks.execute(collection.slug, 'beforeDelete', {
				collection: collection.slug,
				entry: existing,
				entryId: id,
				context,
			});
		}

		const useSoftDelete = collection.softDelete && !options.forceDelete;

		if (useSoftDelete) {
			const now = new Date().toISOString();
			const sql = `UPDATE "${collection.slug}" SET "deletedAt" = ? WHERE "id" = ?`;
			await deps.client.execute({ sql, args: [now, id] });
		} else {
			const sql = `DELETE FROM "${collection.slug}" WHERE "id" = ?`;
			await deps.client.execute({ sql, args: [id] });
		}

		if (hooks) {
			await hooks.execute(collection.slug, 'afterDelete', {
				collection: collection.slug,
				entry: existing,
				entryId: id,
				context,
			});
		}

		return ok(undefined);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete entry';
		return fail(appError('DB_ERROR', message, error));
	}
};
