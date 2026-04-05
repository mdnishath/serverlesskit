import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../../src/schema/index.js';
import type { CollectionDefinition } from '../../src/schema/index.js';
import { createEntry } from '../../src/crud/create.js';
import { deleteEntry } from '../../src/crud/delete.js';
import { createHookManager } from '../../src/hooks/lifecycle-hooks.js';
import type { CrudDeps } from '../../src/crud/crud.types.js';

const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const articlesCollection = makeCollection({
	name: 'Articles',
	fields: {
		title: field.text({ required: true }),
		slug: field.slug({ required: false }),
		status: field.select({ options: ['draft', 'published'] }),
	},
	timestamps: true,
	softDelete: true,
});

const articlesSql = `CREATE TABLE "articles" (
  "id" TEXT PRIMARY KEY NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL, "deletedAt" TEXT
);`;

const auditSql = `CREATE TABLE "_audit" (
  "id" TEXT PRIMARY KEY NOT NULL, "action" TEXT NOT NULL,
  "collection" TEXT NOT NULL, "entryId" TEXT, "timestamp" TEXT NOT NULL
);`;

describe('Integration: Hooks + CRUD Flow', () => {
	let client: Client;
	let deps: CrudDeps;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		deps = { client };
		await client.execute(articlesSql);
		await client.execute(auditSql);
	});

	afterEach(() => { client.close(); });

	it('beforeCreate hook auto-generates slug from title', async () => {
		const hooks = createHookManager();
		hooks.register('articles', 'beforeCreate', async (payload) => {
			const title = payload.data?.title as string | undefined;
			if (title && !payload.data?.slug) {
				const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
				return { ...payload, data: { ...payload.data, slug } };
			}
		});

		const result = await createEntry(
			deps, articlesCollection, { title: 'Hello World', status: 'draft' }, {}, hooks,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.slug).toBe('hello-world');
	});

	it('afterCreate hook writes audit record', async () => {
		const hooks = createHookManager();
		hooks.register('articles', 'afterCreate', async (payload) => {
			const { nanoid } = await import('nanoid');
			await client.execute({
				sql: `INSERT INTO "_audit" ("id","action","collection","entryId","timestamp") VALUES (?,?,?,?,?)`,
				args: [nanoid(), 'create', payload.collection, payload.entryId ?? '', new Date().toISOString()],
			});
		});

		await createEntry(
			deps, articlesCollection, { title: 'Audited', slug: 'audited', status: 'draft' }, {}, hooks,
		);

		const audits = await client.execute('SELECT * FROM "_audit"');
		expect(audits.rows).toHaveLength(1);
		expect(audits.rows[0]?.action).toBe('create');
	});

	it('beforeDelete hook prevents deletion of published articles', async () => {
		const hooks = createHookManager();
		hooks.register('articles', 'beforeDelete', async (payload) => {
			if (payload.entry?.status === 'published') {
				throw new Error('Cannot delete published articles');
			}
		});

		const published = await createEntry(deps, articlesCollection, {
			title: 'Live', slug: 'live', status: 'published',
		});
		if (!published.ok) throw new Error('Setup failed');

		const result = await deleteEntry(deps, articlesCollection, published.data.id, {}, hooks);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('Cannot delete published');
	});

	it('draft articles can still be deleted with the hook', async () => {
		const hooks = createHookManager();
		hooks.register('articles', 'beforeDelete', async (payload) => {
			if (payload.entry?.status === 'published') {
				throw new Error('Cannot delete published articles');
			}
		});

		const draft = await createEntry(deps, articlesCollection, {
			title: 'Draft', slug: 'draft', status: 'draft',
		});
		if (!draft.ok) throw new Error('Setup failed');

		const result = await deleteEntry(deps, articlesCollection, draft.data.id, {}, hooks);
		expect(result.ok).toBe(true);
	});

	it('multiple hooks chain modifications', async () => {
		const hooks = createHookManager();
		hooks.register('articles', 'beforeCreate', async (payload) => {
			const title = payload.data?.title as string | undefined;
			if (title) {
				return { ...payload, data: { ...payload.data, slug: title.toLowerCase().replace(/\s+/g, '-') } };
			}
		});
		hooks.register('articles', 'beforeCreate', async (payload) => {
			return { ...payload, data: { ...payload.data, status: 'draft' } };
		});

		const result = await createEntry(
			deps, articlesCollection, { title: 'My Article', status: 'published' }, {}, hooks,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.slug).toBe('my-article');
		expect(result.data.status).toBe('draft');
	});
});
