import { createClient } from '@libsql/client';
import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import { drizzle } from 'drizzle-orm/libsql';
import type { DbClient, DbConfig } from './db.types.js';

/**
 * Creates a database client with Drizzle ORM wrapper.
 * Supports Turso (production) and local SQLite (dev/test).
 * @param config - Database connection configuration
 * @returns A Result containing the DbClient or connection error
 */
export const createDbClient = (config: DbConfig): Result<DbClient> => {
	try {
		const raw =
			config.provider === 'turso'
				? createClient({ url: config.url, authToken: config.authToken })
				: createClient({ url: config.url });

		const db = drizzle(raw);

		return ok({
			db,
			raw,
			close: () => {
				raw.close();
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create DB client';
		return fail(appError('DB_CONNECTION_ERROR', message, error));
	}
};

/**
 * Creates an in-memory SQLite database client for testing.
 * @returns A Result containing the DbClient
 */
export const createTestDbClient = (): Result<DbClient> => {
	return createDbClient({ provider: 'local', url: ':memory:' });
};
