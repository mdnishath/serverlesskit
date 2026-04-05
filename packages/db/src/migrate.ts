import type { Client } from '@libsql/client';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import { nanoid } from 'nanoid';
import type { MigrationRecord, SchemaChange } from './db.types.js';
import { collectionToSql } from './schema-to-drizzle.js';

const MIGRATIONS_TABLE = '_migrations';

/**
 * Ensures the _migrations table exists.
 * @param client - The raw libSQL client
 */
export const ensureMigrationsTable = async (client: Client): Promise<void> => {
	await client.execute(`
		CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"name" TEXT NOT NULL,
			"sql" TEXT NOT NULL,
			"appliedAt" TEXT NOT NULL
		);
	`);
};

/**
 * Gets the list of existing tables in the database.
 * @param client - The raw libSQL client
 * @returns Set of existing table names
 */
export const getExistingTables = async (client: Client): Promise<Set<string>> => {
	const result = await client.execute(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
	);
	return new Set(result.rows.map((row) => String(row.name)));
};

/**
 * Detects schema changes by comparing collection definitions against existing DB tables.
 * @param client - The raw libSQL client
 * @param collections - Array of collection definitions to sync
 * @returns Array of detected schema changes
 */
export const diffSchema = async (
	client: Client,
	collections: CollectionDefinition[],
): Promise<SchemaChange[]> => {
	const existingTables = await getExistingTables(client);
	const changes: SchemaChange[] = [];

	for (const collection of collections) {
		const statements = collectionToSql(collection);
		for (const sql of statements) {
			const tableNameMatch = sql.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/);
			const tableName = tableNameMatch?.[1];
			if (tableName && !existingTables.has(tableName)) {
				changes.push({ type: 'create_table', table: tableName, sql });
			}
		}
	}

	return changes;
};

/**
 * Applies schema changes to the database within a transaction.
 * Records each change in the _migrations table.
 * @param client - The raw libSQL client
 * @param changes - Array of schema changes to apply
 * @returns A Result indicating success or failure
 */
export const runMigration = async (
	client: Client,
	changes: SchemaChange[],
): Promise<Result<MigrationRecord[]>> => {
	if (changes.length === 0) {
		return ok([]);
	}

	try {
		await ensureMigrationsTable(client);

		const records: MigrationRecord[] = [];
		const batch = [];

		for (const change of changes) {
			const record: MigrationRecord = {
				id: nanoid(),
				name: `${change.type}_${change.table}`,
				sql: change.sql,
				appliedAt: new Date().toISOString(),
			};
			records.push(record);

			batch.push(change.sql);
			batch.push(
				`INSERT INTO "${MIGRATIONS_TABLE}" ("id", "name", "sql", "appliedAt") VALUES ('${record.id}', '${record.name}', '${record.sql.replace(/'/g, "''")}', '${record.appliedAt}');`,
			);
		}

		await client.executeMultiple(batch.join('\n'));
		return ok(records);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Migration failed';
		return fail(appError('MIGRATION_ERROR', message, error));
	}
};

/**
 * Gets all applied migration records.
 * @param client - The raw libSQL client
 * @returns Array of migration records
 */
export const getMigrationHistory = async (client: Client): Promise<Result<MigrationRecord[]>> => {
	try {
		await ensureMigrationsTable(client);
		const result = await client.execute(
			`SELECT * FROM "${MIGRATIONS_TABLE}" ORDER BY "appliedAt" ASC;`,
		);

		const records: MigrationRecord[] = result.rows.map((row) => ({
			id: String(row.id),
			name: String(row.name),
			sql: String(row.sql),
			appliedAt: String(row.appliedAt),
		}));

		return ok(records);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to get migration history';
		return fail(appError('MIGRATION_ERROR', message, error));
	}
};

/**
 * Syncs all collection definitions to the database.
 * Detects new tables and creates them automatically.
 * @param client - The raw libSQL client
 * @param collections - Array of collection definitions to sync
 * @returns A Result with applied migration records
 */
export const syncSchema = async (
	client: Client,
	collections: CollectionDefinition[],
): Promise<Result<MigrationRecord[]>> => {
	const changes = await diffSchema(client, collections);
	return runMigration(client, changes);
};
