import type { CollectionDefinition, FieldsMap } from '@serverlesskit/core/schema';
import { getDb } from './db';

/**
 * In-memory cache of collection definitions.
 * Synced to the _collections table in the database.
 */
const collections = new Map<string, CollectionDefinition>();
let initialized = false;

const COLLECTIONS_TABLE = '_collections';

/**
 * Ensures the _collections metadata table exists.
 * @param db - The libSQL client
 */
const ensureTable = async (db: ReturnType<typeof getDb>): Promise<void> => {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${COLLECTIONS_TABLE}" (
			"slug" TEXT PRIMARY KEY NOT NULL,
			"definition" TEXT NOT NULL
		);
	`);
};

/**
 * Loads all persisted collections from the database into memory.
 * Called once on first access.
 */
export const loadCollections = async (): Promise<void> => {
	if (initialized) return;
	try {
		const db = getDb();
		await ensureTable(db);
		const result = await db.execute(`SELECT * FROM "${COLLECTIONS_TABLE}"`);
		for (const row of result.rows) {
			const def = JSON.parse(String(row.definition)) as CollectionDefinition;
			collections.set(def.slug, Object.freeze(def));
		}
		initialized = true;
	} catch {
		initialized = true;
	}
};

/**
 * Registers a collection definition and persists it to DB.
 * @param def - The collection definition to store
 */
export const registerCollection = async (def: CollectionDefinition): Promise<void> => {
	await loadCollections();
	const db = getDb();
	await ensureTable(db);
	await db.execute({
		sql: `INSERT OR REPLACE INTO "${COLLECTIONS_TABLE}" ("slug", "definition") VALUES (?, ?)`,
		args: [def.slug, JSON.stringify(def)],
	});
	collections.set(def.slug, def);
};

/**
 * Gets a collection definition by slug.
 * @param slug - The collection slug
 * @returns The collection definition or undefined
 */
export const getCollection = async (slug: string): Promise<CollectionDefinition | undefined> => {
	await loadCollections();
	return collections.get(slug);
};

/**
 * Gets all registered collections.
 * @returns Array of all collection definitions
 */
export const getAllCollections = async (): Promise<CollectionDefinition[]> => {
	await loadCollections();
	return Array.from(collections.values());
};

/**
 * Removes a collection from memory and DB.
 * @param slug - The collection slug to remove
 * @returns True if removed
 */
export const removeCollection = async (slug: string): Promise<boolean> => {
	await loadCollections();
	const db = getDb();
	await db.execute({ sql: `DELETE FROM "${COLLECTIONS_TABLE}" WHERE "slug" = ?`, args: [slug] });
	return collections.delete(slug);
};
