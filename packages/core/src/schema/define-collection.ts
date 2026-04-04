import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { CollectionDefinition, CollectionOptions, FieldsMap } from './schema.types.js';

/**
 * Generates a URL-friendly slug from a collection name.
 * @param name - The collection name
 * @returns A kebab-case slug
 */
const generateSlug = (name: string): string => {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
};

/**
 * Validates that a collection options object has no issues.
 * @param options - The collection options to validate
 * @returns A Result with void on success or an AppError listing problems
 */
const validateOptions = <F extends FieldsMap>(options: CollectionOptions<F>): Result<void> => {
	const errors: string[] = [];

	if (!options.name || options.name.trim().length === 0) {
		errors.push('Collection name is required');
	}

	const fieldNames = Object.keys(options.fields);
	if (fieldNames.length === 0) {
		errors.push('Collection must have at least one field');
	}

	const reserved = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);
	for (const name of fieldNames) {
		if (reserved.has(name)) {
			errors.push(`Field name "${name}" is reserved`);
		}
	}

	const seen = new Set<string>();
	for (const name of fieldNames) {
		if (seen.has(name)) {
			errors.push(`Duplicate field name: "${name}"`);
		}
		seen.add(name);
	}

	for (const [name, def] of Object.entries(options.fields)) {
		if (def.type === 'select' && (!def.options || def.options.length === 0)) {
			errors.push(`Select field "${name}" must have at least one option`);
		}
	}

	if (errors.length > 0) {
		return fail(appError('SCHEMA_ERROR', errors.join('; '), errors));
	}

	return ok(undefined);
};

/**
 * Defines a new collection with validated schema.
 * Returns a frozen, immutable CollectionDefinition.
 * @param options - The collection configuration
 * @returns A Result containing the frozen CollectionDefinition or validation errors
 */
export const defineCollection = <F extends FieldsMap>(
	options: CollectionOptions<F>,
): Result<CollectionDefinition<F>> => {
	const validation = validateOptions(options);
	if (!validation.ok) {
		return validation;
	}

	const slug = options.slug ?? generateSlug(options.name);

	const definition: CollectionDefinition<F> = Object.freeze({
		name: options.name,
		slug,
		fields: Object.freeze({ ...options.fields }) as Readonly<F>,
		timestamps: options.timestamps ?? true,
		softDelete: options.softDelete ?? false,
		description: options.description ?? '',
	});

	return ok(definition);
};
