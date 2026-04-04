import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { CollectionDefinition } from './schema.types.js';

/**
 * Creates a new schema registry to manage collection definitions.
 * @returns A registry with methods to register, get, list, and validate collections
 */
export const createSchemaRegistry = () => {
	const collections = new Map<string, CollectionDefinition>();

	return {
		/**
		 * Registers a collection definition in the registry.
		 * @param definition - The frozen collection definition to register
		 * @returns A Result indicating success or conflict
		 */
		register: (definition: CollectionDefinition): Result<void> => {
			if (collections.has(definition.slug)) {
				return fail(appError('CONFLICT', `Collection "${definition.slug}" is already registered`));
			}
			collections.set(definition.slug, definition);
			return ok(undefined);
		},

		/**
		 * Retrieves a collection definition by slug.
		 * @param slug - The collection slug
		 * @returns The collection definition or undefined
		 */
		get: (slug: string): CollectionDefinition | undefined => {
			return collections.get(slug);
		},

		/**
		 * Returns all registered collection definitions.
		 * @returns An array of all collection definitions
		 */
		getAll: (): CollectionDefinition[] => {
			return Array.from(collections.values());
		},

		/**
		 * Returns the number of registered collections.
		 * @returns Collection count
		 */
		size: (): number => {
			return collections.size;
		},

		/**
		 * Validates that all relation fields reference existing collections.
		 * @returns A Result with void on success or errors listing invalid relations
		 */
		validateRelations: (): Result<void> => {
			const errors: string[] = [];
			const slugs = new Set(collections.keys());

			for (const collection of collections.values()) {
				for (const [fieldName, fieldDef] of Object.entries(collection.fields)) {
					if (fieldDef.type === 'relation' && !slugs.has(fieldDef.collection)) {
						errors.push(
							`${collection.slug}.${fieldName} references unknown collection "${fieldDef.collection}"`,
						);
					}
				}
			}

			if (errors.length > 0) {
				return fail(appError('SCHEMA_ERROR', `Invalid relations: ${errors.join('; ')}`, errors));
			}

			return ok(undefined);
		},

		/**
		 * Removes a collection from the registry.
		 * @param slug - The collection slug to remove
		 * @returns True if removed, false if not found
		 */
		remove: (slug: string): boolean => {
			return collections.delete(slug);
		},

		/**
		 * Clears all collections from the registry.
		 */
		clear: (): void => {
			collections.clear();
		},
	};
};
