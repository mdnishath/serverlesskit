import { createClient, type Client } from '@libsql/client';

/**
 * Creates a singleton DB client for use in API routes.
 * Supports both Turso cloud (production) and local SQLite (development).
 * @returns libSQL Client instance
 */
const createDbInstance = (): Client => {
	const url = process.env.TURSO_URL ?? process.env.DATABASE_URL ?? 'file:./local.db';
	const authToken = process.env.TURSO_AUTH_TOKEN;

	if (url.startsWith('libsql://') && authToken) {
		return createClient({ url, authToken });
	}

	return createClient({ url });
};

/** Shared database client singleton */
let dbInstance: Client | null = null;

/**
 * Gets the shared database client.
 * @returns The libSQL client instance
 */
export const getDb = (): Client => {
	if (!dbInstance) {
		dbInstance = createDbInstance();
	}
	return dbInstance;
};
