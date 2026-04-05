import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '@serverlesskit/core/schema';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import {
	diffSchema,
	ensureMigrationsTable,
	getExistingTables,
	getMigrationHistory,
	runMigration,
	syncSchema,
} from '../src/migrate.js';

/** Helper to create a collection definition */
const makeCollection = (
	opts: Parameters<typeof defineCollection>[0],
): CollectionDefinition => {
	const result = defineCollection(opts);
	if (!result.ok) throw new Error(result.error.message);
	return result.data;
};

describe('Migration system', () => {
	let client: Client;

	beforeEach(() => {
		client = createClient({ url: ':memory:' });
	});

	afterEach(() => {
		client.close();
	});

	describe('ensureMigrationsTable', () => {
		it('creates the _migrations table', async () => {
			await ensureMigrationsTable(client);
			const tables = await getExistingTables(client);
			expect(tables.has('_migrations')).toBe(true);
		});

		it('is idempotent', async () => {
			await ensureMigrationsTable(client);
			await ensureMigrationsTable(client);
			const tables = await getExistingTables(client);
			expect(tables.has('_migrations')).toBe(true);
		});
	});

	describe('getExistingTables', () => {
		it('returns empty set for fresh database', async () => {
			const tables = await getExistingTables(client);
			expect(tables.size).toBe(0);
		});

		it('returns created tables', async () => {
			await client.execute('CREATE TABLE "test" ("id" TEXT PRIMARY KEY);');
			const tables = await getExistingTables(client);
			expect(tables.has('test')).toBe(true);
		});
	});

	describe('diffSchema', () => {
		it('detects new tables', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});

			const changes = await diffSchema(client, [posts]);
			expect(changes).toHaveLength(1);
			expect(changes[0]?.type).toBe('create_table');
			expect(changes[0]?.table).toBe('posts');
		});

		it('skips existing tables', async () => {
			await client.execute('CREATE TABLE "posts" ("id" TEXT PRIMARY KEY);');

			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});

			const changes = await diffSchema(client, [posts]);
			expect(changes).toHaveLength(0);
		});

		it('detects junction tables for many-to-many', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: {
					title: field.text(),
					tags: field.relation({ collection: 'tags', relationType: 'many-to-many' }),
				},
				timestamps: false,
			});

			const changes = await diffSchema(client, [posts]);
			expect(changes).toHaveLength(2);
			expect(changes[1]?.table).toBe('posts_tags_tags');
		});
	});

	describe('runMigration', () => {
		it('applies changes and records them', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});
			const changes = await diffSchema(client, [posts]);
			const result = await runMigration(client, changes);

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.name).toBe('create_table_posts');

			const tables = await getExistingTables(client);
			expect(tables.has('posts')).toBe(true);
		});

		it('returns empty array when no changes', async () => {
			const result = await runMigration(client, []);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(0);
		});
	});

	describe('getMigrationHistory', () => {
		it('returns empty array for fresh database', async () => {
			const result = await getMigrationHistory(client);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(0);
		});

		it('returns recorded migrations', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});
			await syncSchema(client, [posts]);

			const result = await getMigrationHistory(client);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.name).toBe('create_table_posts');
		});
	});

	describe('syncSchema', () => {
		it('creates tables for new collections', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text(), body: field.richtext() },
				timestamps: true,
				softDelete: true,
			});

			const result = await syncSchema(client, [posts]);
			expect(result.ok).toBe(true);

			const tables = await getExistingTables(client);
			expect(tables.has('posts')).toBe(true);
		});

		it('is idempotent — second sync creates no new migrations', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});

			await syncSchema(client, [posts]);
			const result = await syncSchema(client, [posts]);

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(0);
		});

		it('syncs multiple collections at once', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text() },
				timestamps: false,
			});
			const users = makeCollection({
				name: 'Users',
				fields: { name: field.text(), email: field.email({ unique: true }) },
				timestamps: true,
			});

			const result = await syncSchema(client, [posts, users]);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toHaveLength(2);

			const tables = await getExistingTables(client);
			expect(tables.has('posts')).toBe(true);
			expect(tables.has('users')).toBe(true);
		});

		it('can insert data into synced table', async () => {
			const posts = makeCollection({
				name: 'Posts',
				fields: { title: field.text(), views: field.number({ integer: true }) },
				timestamps: true,
			});

			await syncSchema(client, [posts]);

			await client.execute({
				sql: 'INSERT INTO "posts" ("id", "title", "views", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
				args: ['test-1', 'Hello World', 42, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'],
			});

			const result = await client.execute('SELECT * FROM "posts" WHERE id = ?', ['test-1']);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0]?.['title']).toBe('Hello World');
			expect(result.rows[0]?.['views']).toBe(42);
		});
	});
});
