import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '@serverlesskit/core/schema';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import {
	diffSchema,
	getMigrationHistory,
	runMigration,
	syncSchema,
} from '../src/migrate.js';

/** Helper to create a validated collection */
const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const postsCollection = makeCollection({
	name: 'Posts',
	fields: {
		title: field.text({ required: true }),
		body: field.richtext(),
		views: field.number({ integer: true, required: false }),
		published: field.boolean(),
	},
	timestamps: true,
	softDelete: true,
});

const tagsCollection = makeCollection({
	name: 'Tags',
	fields: {
		name: field.text({ required: true }),
		color: field.color(),
	},
	timestamps: false,
	softDelete: false,
});

describe('Migration — Edge Cases', () => {
	let client: Client;

	beforeEach(() => {
		client = createClient({ url: ':memory:' });
	});

	afterEach(() => {
		client.close();
	});

	it('syncSchema with all-fields collection creates correct table', async () => {
		const result = await syncSchema(client, [postsCollection]);
		expect(result.ok).toBe(true);

		const tables = await client.execute(
			"SELECT name FROM sqlite_master WHERE type='table' AND name = 'posts';",
		);
		expect(tables.rows).toHaveLength(1);
	});

	it('timestamps and softDelete columns exist', async () => {
		await syncSchema(client, [postsCollection]);

		const info = await client.execute("PRAGMA table_info('posts');");
		const columns = info.rows.map((r) => String(r.name));
		expect(columns).toContain('createdAt');
		expect(columns).toContain('updatedAt');
		expect(columns).toContain('deletedAt');
	});

	it('collection without timestamps has no timestamp columns', async () => {
		await syncSchema(client, [tagsCollection]);

		const info = await client.execute("PRAGMA table_info('tags');");
		const columns = info.rows.map((r) => String(r.name));
		expect(columns).not.toContain('createdAt');
		expect(columns).not.toContain('updatedAt');
		expect(columns).not.toContain('deletedAt');
	});

	it('diffSchema adding second collection detects only the new table', async () => {
		await syncSchema(client, [postsCollection]);

		const changes = await diffSchema(client, [postsCollection, tagsCollection]);
		expect(changes).toHaveLength(1);
		expect(changes[0]?.table).toBe('tags');
	});

	it('runMigration with invalid SQL returns MIGRATION_ERROR', async () => {
		const result = await runMigration(client, [
			{ type: 'create_table', table: 'broken', sql: 'INVALID SQL STATEMENT' },
		]);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('MIGRATION_ERROR');
	});

	it('migration history is recorded in order', async () => {
		await syncSchema(client, [postsCollection]);
		await syncSchema(client, [postsCollection, tagsCollection]);

		const history = await getMigrationHistory(client);
		expect(history.ok).toBe(true);
		if (!history.ok) return;
		expect(history.data.length).toBeGreaterThanOrEqual(2);

		const names = history.data.map((r) => r.name);
		expect(names[0]).toContain('posts');
	});

	it('syncSchema is idempotent for existing tables', async () => {
		const first = await syncSchema(client, [postsCollection]);
		const second = await syncSchema(client, [postsCollection]);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.data).toHaveLength(0);
	});

	it('runMigration with empty changes returns empty array', async () => {
		const result = await runMigration(client, []);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toHaveLength(0);
	});

	it('data can be inserted after syncSchema', async () => {
		await syncSchema(client, [postsCollection]);

		await client.execute({
			sql: `INSERT INTO "posts" ("id", "title", "body", "views", "published", "createdAt", "updatedAt", "deletedAt")
			      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			args: ['1', 'Hello', 'World', 10, 1, '2024-01-01', '2024-01-01', null],
		});

		const rows = await client.execute('SELECT * FROM "posts"');
		expect(rows.rows).toHaveLength(1);
	});
});
