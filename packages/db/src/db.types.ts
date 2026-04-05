import type { Client } from '@libsql/client';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

/** Database configuration for Turso (production) */
export type TursoConfig = {
	provider: 'turso';
	url: string;
	authToken: string;
};

/** Database configuration for local SQLite (development/testing) */
export type LocalConfig = {
	provider: 'local';
	/** File path or ":memory:" for in-memory database */
	url: string;
};

/** Union of all supported database configurations */
export type DbConfig = TursoConfig | LocalConfig;

/** The wrapped database client returned by createDbClient */
export type DbClient = {
	/** Drizzle ORM instance for query building */
	db: LibSQLDatabase;
	/** Raw libSQL client for direct queries */
	raw: Client;
	/** Closes the database connection */
	close: () => void;
};

/** A single migration record stored in the _migrations table */
export type MigrationRecord = {
	id: string;
	name: string;
	sql: string;
	appliedAt: string;
};

/** Represents a detected schema change */
export type SchemaChange = {
	type: 'create_table' | 'add_column' | 'drop_table';
	table: string;
	sql: string;
};
