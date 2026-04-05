import type { InValue } from '@libsql/client';
import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import { nanoid } from 'nanoid';
import type { HookManager } from '../hooks/lifecycle-hooks.js';
import { validateField } from '../schema/field-validators.js';
import type { CollectionDefinition } from '../schema/schema.types.js';
import type { CrudContext, CrudDeps, Entry } from './crud.types.js';

/**
 * Creates a new entry in the given collection.
 * Validates all fields, runs hooks, inserts into DB.
 * @param deps - Database dependencies
 * @param collection - The collection definition
 * @param data - The entry data to insert
 * @param context - CRUD operation context
 * @param hooks - Optional hook manager
 * @returns A Result containing the created entry or validation/DB error
 */
export const createEntry = async (
	deps: CrudDeps,
	collection: CollectionDefinition,
	data: Record<string, unknown>,
	context: CrudContext = {},
	hooks?: HookManager,
): Promise<Result<Entry>> => {
	try {
		const errors: string[] = [];
		for (const [fieldName, fieldDef] of Object.entries(collection.fields)) {
			if (fieldDef.type === 'relation' && fieldDef.relationType === 'many-to-many') continue;
			const value = data[fieldName];
			if (value === undefined && fieldDef.required !== false) {
				errors.push(`Field "${fieldName}" is required`);
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
			const hookPayload = await hooks.execute(collection.slug, 'beforeCreate', {
				collection: collection.slug,
				data,
				context,
			});
			if (hookPayload.data) {
				Object.assign(data, hookPayload.data);
			}
		}

		const id = nanoid();
		const now = new Date().toISOString();
		const entry: Entry = { id, ...data };

		if (collection.timestamps) {
			entry.createdAt = now;
			entry.updatedAt = now;
		}
		if (collection.softDelete) {
			entry.deletedAt = null;
		}

		const columns = Object.keys(entry);
		const placeholders = columns.map(() => '?').join(', ');
		const values: InValue[] = columns.map((col) => {
			const val = entry[col];
			if (val === null || val === undefined) return null;
			if (typeof val === 'object') return JSON.stringify(val);
			if (typeof val === 'boolean') return val ? 1 : 0;
			return val as InValue;
		});

		const sql = `INSERT INTO "${collection.slug}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
		await deps.client.execute({ sql, args: values });

		if (hooks) {
			await hooks.execute(collection.slug, 'afterCreate', {
				collection: collection.slug,
				data,
				entry,
				entryId: id,
				context,
			});
		}

		return ok(entry);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create entry';
		return fail(appError('DB_ERROR', message, error));
	}
};
