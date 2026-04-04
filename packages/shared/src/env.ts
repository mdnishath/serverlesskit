import type { AppError } from './result.js';
import { fail, ok } from './result.js';
import type { Result } from './result.js';

/** Supported environment variable types */
type EnvType = 'string' | 'number' | 'boolean';

/** Schema definition for a single env variable */
type EnvVarSchema = {
	/** The expected type of the env variable */
	type: EnvType;
	/** Whether the variable is required (default: true) */
	required?: boolean;
	/** Default value if not set */
	default?: string | number | boolean;
};

/** Maps an env schema to its inferred TypeScript type */
type InferEnvType<T extends EnvType> = T extends 'string'
	? string
	: T extends 'number'
		? number
		: T extends 'boolean'
			? boolean
			: never;

/** Infers the full output type from an env schema */
type InferEnvOutput<S extends Record<string, EnvVarSchema>> = {
	[K in keyof S]: S[K]['required'] extends false
		? InferEnvType<S[K]['type']> | undefined
		: InferEnvType<S[K]['type']>;
};

/**
 * Parses a single environment variable value to the expected type.
 * @param value - Raw string value
 * @param type - Expected type
 * @returns Parsed value or undefined if parsing fails
 */
const parseValue = (value: string, type: EnvType): string | number | boolean | undefined => {
	switch (type) {
		case 'string':
			return value;
		case 'number': {
			const parsed = Number(value);
			return Number.isNaN(parsed) ? undefined : parsed;
		}
		case 'boolean':
			if (value === 'true' || value === '1') return true;
			if (value === 'false' || value === '0') return false;
			return undefined;
	}
};

/**
 * Validates environment variables against a schema.
 * Returns a typed object with all validated values.
 * @param schema - The env variable schema definition
 * @returns A Result containing the parsed env object or validation errors
 */
export const validateEnv = <S extends Record<string, EnvVarSchema>>(
	schema: S,
): Result<InferEnvOutput<S>> => {
	const errors: string[] = [];
	const result: Record<string, unknown> = {};

	for (const [key, config] of Object.entries(schema)) {
		const raw = process.env[key];
		const isRequired = config.required !== false;

		if (raw === undefined || raw === '') {
			if (config.default !== undefined) {
				result[key] = config.default;
				continue;
			}
			if (isRequired) {
				errors.push(`Missing required env variable: ${key}`);
				continue;
			}
			result[key] = undefined;
			continue;
		}

		const parsed = parseValue(raw, config.type);
		if (parsed === undefined) {
			errors.push(`Invalid value for ${key}: expected ${config.type}, got "${raw}"`);
			continue;
		}

		result[key] = parsed;
	}

	if (errors.length > 0) {
		return fail({
			code: 'ENV_VALIDATION_ERROR',
			message: `Environment validation failed: ${errors.length} error(s)`,
			details: errors,
		} satisfies AppError);
	}

	return ok(result as InferEnvOutput<S>);
};
