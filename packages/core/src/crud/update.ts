import type { InValue } from '@libsql/client';
import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { HookManager } from '../hooks/lifecycle-hooks.js';
import { validateField } from '../schema/field-validators.js';
import type { CollectionDefinition } from '../schema/schema.types.js';
import type { CrudContext, CrudDeps, Entry } from './crud.types.js';
import { findOne } from './read.js';

/**
 * Updates an existing entry by ID with partial data.
 * Validates changed fields only, runs hooks, updates in DB.
 * @param deps - Database dependencies
 * @param collection - The collection definition
 * @param id - The entry ID to update
 * @param data - Partial data to update
 * @param context - CRUD operation context
 * @param hooks - Optional hook manager
 * @returns A Result containing the updated entry
 */
export const updateEntry = async (
	deps: CrudDeps,
	collection: CollectionDefinition,
	id: string,
	data: Record<string, unknown>,
	context: CrudContext = {},
	hooks?: HookManager,
): Promise<Result<Entry>> => {
	try {
		const existingResult = await findOne(deps, collection, id);
		if (!existingResult.ok) return existingResult;
		if (!existingResult.data) {
			return fail(appError('NOT_FOUND', `Entry "${id}" not found in ${collection.slug}`));
		}

		const existing = existingResult.data;

		const errors: string[] = [];
		for (const [fieldName, value] of Object.entries(data)) {
			const fieldDef = collection.fields[fieldName];
			if (!fieldDef) {
				errors.push(`Unknown field: "${fieldName}"`);
				continue;
			}
			if (value !== undefined && value !== null) {
				const validation = validateField(fieldDef, value);
				if (!validation.ok) {
					errors.push(`${fieldName}: ${validation.error.message}`);
				}
			}
		}

		if (errors.length > 0) {
			return fail(appError('VALIDATION_ERROR', errors.join('; '), errors));
		}

		if (hooks) {
			const hookPayload = await hooks.execute(collection.slug, 'beforeUpdate', {
				collection: collection.slug,
				data,
				entry: existing,
				entryId: id,
				context,
			});
			if (hookPayload.data) {
				Object.assign(data, hookPayload.data);
			}
		}

		const updates = { ...data };
		if (collection.timestamps) {
			updates.updatedAt = new Date().toISOString();
		}

		const setClauses = Object.keys(updates).map((col) => `"${col}" = ?`);
		const setValues: InValue[] = Object.values(updates).map((val) => {
			if (val === null || val === undefined) return null;
			if (typeof val === 'object') return JSON.stringify(val);
			if (typeof val === 'boolean') return val ? 1 : 0;
			return val as InValue;
		});

		const sql = `UPDATE "${collection.slug}" SET ${setClauses.join(', ')} WHERE "id" = ?`;
		await deps.client.execute({ sql, args: [...setValues, id] });

		const updatedEntry: Entry = { ...existing, ...updates };

		if (hooks) {
			await hooks.execute(collection.slug, 'afterUpdate', {
				collection: collection.slug,
				data: updates,
				entry: updatedEntry,
				entryId: id,
				context,
			});
		}

		return ok(updatedEntry);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update entry';
		return fail(appError('DB_ERROR', message, error));
	}
};
