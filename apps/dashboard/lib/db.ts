import { createClient } from '@libsql/client';

/**
 * Creates a singleton DB client for use in API routes.
 * Uses environment variables or falls back to local SQLite.
 * @returns libSQL Client instance
 */
const createDbInstance = () => {
	const url = process.env.TURSO_URL ?? process.env.DATABASE_URL ?? 'file:./local.db';
	const authToken = process.env.TURSO_AUTH_TOKEN;

	if (url.startsWith('libsql://') && authToken) {
		return createClient({ url, authToken });
	}

	return createClient({ url });
};

/** Shared database client singleton */
let dbInstance: ReturnType<typeof createClient> | null = null;

/**
 * Gets the shared database client.
 * @returns The libSQL client instance
 */
export const getDb = () => {
	if (!dbInstance) {
		dbInstance = createDbInstance();
	}
	return dbInstance;
};
