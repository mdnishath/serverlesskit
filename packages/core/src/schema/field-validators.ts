import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import { z } from 'zod';
import type { CollectionDefinition, FieldDefinition, FieldsMap } from './schema.types.js';

/**
 * Creates a Zod schema for a single field definition.
 * @param def - The field definition to create a schema for
 * @returns A Zod schema matching the field's type and constraints
 */
export const createFieldSchema = (def: FieldDefinition): z.ZodType => {
	switch (def.type) {
		case 'text':
			return buildTextSchema(def);
		case 'number':
			return buildNumberSchema(def);
		case 'boolean':
			return z.boolean().default(def.default ?? false);
		case 'date':
		case 'datetime':
			return buildDateSchema(def);
		case 'select':
			return buildSelectSchema(def);
		case 'richtext':
			return buildRichtextSchema(def);
		case 'media':
			return def.multiple ? z.array(z.string()) : z.string();
		case 'relation':
			return def.relationType === 'many-to-many' ? z.array(z.string()) : z.string();
		case 'json':
			return def.schema ?? z.unknown();
		case 'email':
			return z.string().email();
		case 'url':
			return z.string().url();
		case 'slug':
			return z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
		case 'color':
			return z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
		case 'password':
			return buildPasswordSchema(def);
	}
};

const buildTextSchema = (def: FieldDefinition & { type: 'text' }): z.ZodType => {
	let schema = z.string();
	if (def.min !== undefined) schema = schema.min(def.min);
	if (def.max !== undefined) schema = schema.max(def.max);
	if (def.regex) schema = schema.regex(new RegExp(def.regex));
	return schema;
};

const buildNumberSchema = (def: FieldDefinition & { type: 'number' }): z.ZodType => {
	let schema = def.integer ? z.number().int() : z.number();
	if (def.min !== undefined) schema = schema.min(def.min);
	if (def.max !== undefined) schema = schema.max(def.max);
	return schema;
};

const buildDateSchema = (_def: FieldDefinition & { type: 'date' | 'datetime' }): z.ZodType => {
	return z
		.string()
		.refine((val) => !Number.isNaN(Date.parse(val)), { message: `Invalid ${_def.type} format` });
};

const buildSelectSchema = (def: FieldDefinition & { type: 'select' }): z.ZodType => {
	const enumSchema = z.enum(def.options as unknown as [string, ...string[]]);
	return def.multiple ? z.array(enumSchema) : enumSchema;
};

const buildRichtextSchema = (def: FieldDefinition & { type: 'richtext' }): z.ZodType => {
	let schema = z.string();
	if (def.maxLength !== undefined) schema = schema.max(def.maxLength);
	return schema;
};

const buildPasswordSchema = (def: FieldDefinition & { type: 'password' }): z.ZodType => {
	let schema = z.string();
	if (def.min !== undefined) schema = schema.min(def.min);
	if (def.max !== undefined) schema = schema.max(def.max);
	return schema;
};

/**
 * Validates a single field value against its definition.
 * @param def - The field definition
 * @param value - The value to validate
 * @returns A Result containing the validated value or validation error
 */
export const validateField = (def: FieldDefinition, value: unknown): Result<unknown> => {
	const schema = createFieldSchema(def);
	const wrapOptional = def.required === false ? schema.optional().nullable() : schema;
	const parsed = wrapOptional.safeParse(value);

	if (parsed.success) {
		return ok(parsed.data);
	}

	return fail(
		appError(
			'VALIDATION_ERROR',
			`Validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
			parsed.error.issues,
		),
	);
};

/**
 * Generates a full Zod object schema from a collection definition.
 * @param collection - The collection definition to generate a schema for
 * @returns A ZodObject that validates an entire entry
 */
export const generateZodSchema = <F extends FieldsMap>(
	collection: CollectionDefinition<F>,
): z.ZodObject<Record<string, z.ZodType>> => {
	const shape: Record<string, z.ZodType> = {};

	for (const [name, def] of Object.entries(collection.fields)) {
		const fieldSchema = createFieldSchema(def);
		shape[name] = def.required === false ? fieldSchema.optional().nullable() : fieldSchema;
	}

	return z.object(shape);
};
