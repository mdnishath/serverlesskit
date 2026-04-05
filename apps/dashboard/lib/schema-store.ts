import type { CollectionDefinition, FieldsMap } from '@serverlesskit/core/schema';

/**
 * In-memory schema store for registered collections.
 * In production, this would be persisted to the database.
 * Collections are stored in the _collections table and loaded on startup.
 */
const collections = new Map<string, CollectionDefinition>();

/**
 * Registers a collection definition.
 * @param def - The collection definition to store
 */
export const registerCollection = (def: CollectionDefinition): void => {
	collections.set(def.slug, def);
};

/**
 * Gets a collection definition by slug.
 * @param slug - The collection slug
 * @returns The collection definition or undefined
 */
export const getCollection = (slug: string): CollectionDefinition | undefined => {
	return collections.get(slug);
};

/**
 * Gets all registered collections.
 * @returns Array of all collection definitions
 */
export const getAllCollections = (): CollectionDefinition[] => {
	return Array.from(collections.values());
};

/**
 * Removes a collection.
 * @param slug - The collection slug to remove
 * @returns True if removed
 */
export const removeCollection = (slug: string): boolean => {
	return collections.delete(slug);
};
