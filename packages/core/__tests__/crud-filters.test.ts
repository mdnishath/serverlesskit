import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../src/schema/index.js';
import type { CollectionDefinition } from '../src/schema/index.js';
import { createEntry } from '../src/crud/create.js';
import { findMany, findOne } from '../src/crud/read.js';
import { deleteEntry } from '../src/crud/delete.js';
import type { CrudDeps } from '../src/crud/crud.types.js';

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

const createTableSql = `CREATE TABLE "posts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "views" INTEGER,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "deletedAt" TEXT
);`;

describe('CRUD Filters & Pagination', () => {
	let client: Client;
	let deps: CrudDeps;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		deps = { client };
		await client.execute(createTableSql);
	});

	afterEach(() => {
		client.close();
	});

	/** Seeds 5 posts with varied data */
	const seedPosts = async () => {
		const posts = [
			{ title: 'Alpha Post', status: 'draft', views: 10 },
			{ title: 'Beta Article', status: 'published', views: 50 },
			{ title: 'Alpha Guide', status: 'published', views: 30 },
			{ title: 'Gamma Review', status: 'archived', views: 5 },
			{ title: 'Delta Blog', status: 'draft', views: 20 },
		] as const;
		for (const p of posts) {
			await createEntry(deps, postsCollection, { ...p });
		}
	};

	it('filters with startsWith operator', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { title: { startsWith: 'Alpha' } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(2);
	});

	it('filters with ne operator', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { status: { ne: 'draft' } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(3);
	});

	it('filters with in operator', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { status: { in: ['draft', 'archived'] } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(3);
	});

	it('filters with notIn operator', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { status: { notIn: ['draft', 'archived'] } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(2);
	});

	it('in with empty array returns all entries', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { status: { in: [] } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(5);
	});

	it('filters with gte and lte range', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { views: { gte: 10, lte: 30 } },
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(3);
	});

	it('sorts by multiple fields', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			sort: [
				{ field: 'status', order: 'asc' },
				{ field: 'views', order: 'desc' },
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const entries = result.data.data;
		expect(entries[0]?.status).toBe('archived');
		const drafts = entries.filter((e) => e.status === 'draft');
		expect(Number(drafts[0]?.views)).toBeGreaterThanOrEqual(Number(drafts[1]?.views));
	});

	it('pagination page beyond total returns empty', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, { page: 100, limit: 10 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(0);
		expect(result.data.pagination.total).toBe(5);
	});

	it('combined filter + sort + pagination', async () => {
		await seedPosts();
		const result = await findMany(deps, postsCollection, {
			filter: { status: { ne: 'archived' } },
			sort: [{ field: 'views', order: 'desc' }],
			page: 1,
			limit: 2,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(2);
		expect(result.data.pagination.total).toBe(4);
		expect(Number(result.data.data[0]?.views)).toBe(50);
	});

	it('includeSoftDeleted returns deleted entries', async () => {
		await seedPosts();
		const all = await findMany(deps, postsCollection);
		if (!all.ok) throw new Error('Setup failed');
		const firstId = all.data.data[0]?.id;
		if (!firstId) throw new Error('No entries');

		await deleteEntry(deps, postsCollection, firstId);

		const withDeleted = await findMany(deps, postsCollection, { includeSoftDeleted: true });
		expect(withDeleted.ok).toBe(true);
		if (!withDeleted.ok) return;
		expect(withDeleted.data.pagination.total).toBe(5);
	});

	it('findOne with field selection', async () => {
		const created = await createEntry(deps, postsCollection, {
			title: 'Field Select', status: 'draft', views: 99,
		});
		if (!created.ok) throw new Error('Setup failed');

		const result = await findOne(deps, postsCollection, created.data.id, {
			fields: ['id', 'title'],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data?.title).toBe('Field Select');
		expect(result.data?.id).toBeDefined();
	});

	it('findMany with empty result set', async () => {
		const result = await findMany(deps, postsCollection);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.data).toHaveLength(0);
		expect(result.data.pagination.total).toBe(0);
		expect(result.data.pagination.totalPages).toBe(0);
	});
});
