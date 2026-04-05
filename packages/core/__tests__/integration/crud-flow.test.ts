import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../../src/schema/index.js';
import type { CollectionDefinition } from '../../src/schema/index.js';
import { createEntry } from '../../src/crud/create.js';
import { findMany, findOne } from '../../src/crud/read.js';
import { updateEntry } from '../../src/crud/update.js';
import { deleteEntry } from '../../src/crud/delete.js';
import type { CrudDeps } from '../../src/crud/crud.types.js';

/** Helper to create a validated collection */
const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const postsCollection = makeCollection({
	name: 'Posts',
	fields: {
		title: field.text({ required: true, min: 1 }),
		status: field.select({ options: ['draft', 'published', 'archived'] }),
		views: field.number({ integer: true, required: false }),
	},
	timestamps: true,
	softDelete: true,
});

const tagsCollection = makeCollection({
	name: 'Tags',
	fields: { name: field.text({ required: true }) },
	timestamps: true,
	softDelete: false,
});

const postsSql = `CREATE TABLE "posts" (
  "id" TEXT PRIMARY KEY NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL,
  "views" INTEGER, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL, "deletedAt" TEXT
);`;

const tagsSql = `CREATE TABLE "tags" (
  "id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL
);`;

describe('Integration: Full CRUD Flow', () => {
	let client: Client;
	let deps: CrudDeps;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		deps = { client };
		await client.execute(postsSql);
		await client.execute(tagsSql);
	});

	afterEach(() => { client.close(); });

	it('creates and reads entries across collections', async () => {
		const post = await createEntry(deps, postsCollection, { title: 'Hello', status: 'draft' });
		const tag = await createEntry(deps, tagsCollection, { name: 'Tech' });
		expect(post.ok).toBe(true);
		expect(tag.ok).toBe(true);
		if (!post.ok || !tag.ok) return;

		const fp = await findOne(deps, postsCollection, post.data.id);
		const ft = await findOne(deps, tagsCollection, tag.data.id);
		expect(fp.ok && fp.data?.title).toBe('Hello');
		expect(ft.ok && ft.data?.name).toBe('Tech');
	});

	it('filters and sorts across multiple entries', async () => {
		await createEntry(deps, postsCollection, { title: 'A', status: 'draft', views: 10 });
		await createEntry(deps, postsCollection, { title: 'B', status: 'published', views: 50 });
		await createEntry(deps, postsCollection, { title: 'C', status: 'published', views: 30 });

		const result = await findMany(deps, postsCollection, {
			filter: { status: { eq: 'published' } },
			sort: [{ field: 'views', order: 'desc' }],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(2);
		expect(result.data.data[0]?.title).toBe('B');
	});

	it('updates entry and verifies changes persist', async () => {
		const created = await createEntry(deps, postsCollection, { title: 'Original', status: 'draft' });
		if (!created.ok) throw new Error('Setup failed');

		await updateEntry(deps, postsCollection, created.data.id, { status: 'published', views: 100 });

		const found = await findOne(deps, postsCollection, created.data.id);
		expect(found.ok).toBe(true);
		if (!found.ok) return;
		expect(found.data?.status).toBe('published');
		expect(found.data?.views).toBe(100);
	});

	it('soft-delete hides entry, hard-delete removes it', async () => {
		const created = await createEntry(deps, postsCollection, { title: 'Deletable', status: 'draft' });
		if (!created.ok) throw new Error('Setup failed');

		await deleteEntry(deps, postsCollection, created.data.id);
		const hidden = await findOne(deps, postsCollection, created.data.id);
		expect(hidden.ok && hidden.data).toBeNull();

		const visible = await findOne(deps, postsCollection, created.data.id, { includeSoftDeleted: true });
		expect(visible.ok && visible.data).not.toBeNull();

		await deleteEntry(deps, postsCollection, created.data.id, {}, undefined, { forceDelete: true });
		const gone = await findOne(deps, postsCollection, created.data.id, { includeSoftDeleted: true });
		expect(gone.ok && gone.data).toBeNull();
	});

	it('hard-deletes from collection without softDelete', async () => {
		const created = await createEntry(deps, tagsCollection, { name: 'Temp' });
		if (!created.ok) throw new Error('Setup failed');

		await deleteEntry(deps, tagsCollection, created.data.id);
		const found = await findOne(deps, tagsCollection, created.data.id);
		expect(found.ok && found.data).toBeNull();
	});

	it('pagination across multiple pages', async () => {
		for (let i = 0; i < 10; i++) {
			await createEntry(deps, postsCollection, { title: `Post ${i}`, status: 'draft' });
		}

		const p1 = await findMany(deps, postsCollection, { page: 1, limit: 3 });
		const p4 = await findMany(deps, postsCollection, { page: 4, limit: 3 });
		expect(p1.ok).toBe(true);
		expect(p4.ok).toBe(true);
		if (!p1.ok || !p4.ok) return;
		expect(p1.data.data).toHaveLength(3);
		expect(p4.data.data).toHaveLength(1);
		expect(p1.data.pagination.totalPages).toBe(4);
	});
});
