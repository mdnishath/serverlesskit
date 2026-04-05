import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../src/schema/index.js';
import type { CollectionDefinition } from '../src/schema/index.js';
import { createEntry } from '../src/crud/create.js';
import { findMany, findOne } from '../src/crud/read.js';
import { updateEntry } from '../src/crud/update.js';
import { deleteEntry } from '../src/crud/delete.js';
import type { CrudDeps } from '../src/crud/crud.types.js';

/** Helper to create a collection */
const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

/** Setup: collection + table in memory DB */
const postsCollection = makeCollection({
	name: 'Posts',
	fields: {
		title: field.text({ required: true, min: 1 }),
		status: field.select({ options: ['draft', 'published'] }),
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

describe('CRUD Operations', () => {
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

	describe('createEntry', () => {
		it('creates an entry with valid data', async () => {
			const result = await createEntry(deps, postsCollection, {
				title: 'Hello World',
				status: 'draft',
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.id).toBeDefined();
			expect(result.data.title).toBe('Hello World');
			expect(result.data.status).toBe('draft');
			expect(result.data.createdAt).toBeDefined();
			expect(result.data.updatedAt).toBeDefined();
			expect(result.data.deletedAt).toBeNull();
		});

		it('creates entry with optional fields', async () => {
			const result = await createEntry(deps, postsCollection, {
				title: 'Test',
				status: 'published',
				views: 42,
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.views).toBe(42);
		});

		it('fails validation for missing required field', async () => {
			const result = await createEntry(deps, postsCollection, {
				status: 'draft',
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.message).toContain('title');
		});

		it('fails validation for invalid field value', async () => {
			const result = await createEntry(deps, postsCollection, {
				title: 'Test',
				status: 'invalid-status',
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('findOne', () => {
		it('finds an entry by ID', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Find Me',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await findOne(deps, postsCollection, created.data.id);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data?.title).toBe('Find Me');
		});

		it('returns null for non-existent ID', async () => {
			const result = await findOne(deps, postsCollection, 'non-existent');
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toBeNull();
		});

		it('excludes soft-deleted entries by default', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'To Delete',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			await deleteEntry(deps, postsCollection, created.data.id);

			const result = await findOne(deps, postsCollection, created.data.id);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).toBeNull();
		});

		it('includes soft-deleted entries when requested', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Deleted',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			await deleteEntry(deps, postsCollection, created.data.id);

			const result = await findOne(deps, postsCollection, created.data.id, {
				includeSoftDeleted: true,
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data).not.toBeNull();
		});
	});

	describe('findMany', () => {
		const seedPosts = async () => {
			for (let i = 1; i <= 5; i++) {
				await createEntry(deps, postsCollection, {
					title: `Post ${i}`,
					status: i % 2 === 0 ? 'published' : 'draft',
					views: i * 10,
				});
			}
		};

		it('returns paginated results', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, { page: 1, limit: 3 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.data).toHaveLength(3);
			expect(result.data.pagination.total).toBe(5);
			expect(result.data.pagination.totalPages).toBe(2);
		});

		it('returns second page', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, { page: 2, limit: 3 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.data).toHaveLength(2);
		});

		it('filters by equality', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, {
				filter: { status: { eq: 'published' } },
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.data).toHaveLength(2);
		});

		it('filters by greater than', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, {
				filter: { views: { gt: 30 } },
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.data).toHaveLength(2);
		});

		it('filters by contains', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, {
				filter: { title: { contains: 'Post 1' } },
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.data).toHaveLength(1);
		});

		it('sorts results', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, {
				sort: [{ field: 'views', order: 'desc' }],
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			const views = result.data.data.map((d) => d.views);
			expect(views[0]).toBe(50);
		});

		it('selects specific fields', async () => {
			await seedPosts();

			const result = await findMany(deps, postsCollection, {
				fields: ['id', 'title'],
				limit: 1,
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			const entry = result.data.data[0];
			expect(entry).toBeDefined();
			expect(entry?.id).toBeDefined();
			expect(entry?.title).toBeDefined();
		});

		it('excludes soft-deleted entries by default', async () => {
			await seedPosts();
			const all = await findMany(deps, postsCollection);
			if (!all.ok) throw new Error('Setup failed');
			const firstId = all.data.data[0]?.id;
			if (!firstId) throw new Error('No entries');

			await deleteEntry(deps, postsCollection, firstId);

			const result = await findMany(deps, postsCollection);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.pagination.total).toBe(4);
		});
	});

	describe('updateEntry', () => {
		it('updates an existing entry', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Original',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await updateEntry(deps, postsCollection, created.data.id, {
				title: 'Updated',
				status: 'published',
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.title).toBe('Updated');
			expect(result.data.status).toBe('published');
		});

		it('sets updatedAt on update', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Test',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await updateEntry(deps, postsCollection, created.data.id, {
				title: 'Changed',
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(typeof result.data.updatedAt).toBe('string');
			expect(result.data.title).toBe('Changed');
		});

		it('fails for non-existent entry', async () => {
			const result = await updateEntry(deps, postsCollection, 'fake-id', {
				title: 'Nope',
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('NOT_FOUND');
		});

		it('fails validation for invalid values', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Test',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await updateEntry(deps, postsCollection, created.data.id, {
				status: 'invalid',
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
		});

		it('rejects unknown fields', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Test',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await updateEntry(deps, postsCollection, created.data.id, {
				unknownField: 'value',
			});

			expect(result.ok).toBe(false);
		});
	});

	describe('deleteEntry', () => {
		it('soft-deletes an entry', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'To Delete',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await deleteEntry(deps, postsCollection, created.data.id);
			expect(result.ok).toBe(true);

			const found = await findOne(deps, postsCollection, created.data.id, {
				includeSoftDeleted: true,
			});
			expect(found.ok).toBe(true);
			if (!found.ok) return;
			expect(found.data?.deletedAt).not.toBeNull();
		});

		it('hard-deletes with forceDelete option', async () => {
			const created = await createEntry(deps, postsCollection, {
				title: 'Gone Forever',
				status: 'draft',
			});
			if (!created.ok) throw new Error('Setup failed');

			const result = await deleteEntry(
				deps,
				postsCollection,
				created.data.id,
				{},
				undefined,
				{ forceDelete: true },
			);
			expect(result.ok).toBe(true);

			const found = await findOne(deps, postsCollection, created.data.id, {
				includeSoftDeleted: true,
			});
			expect(found.ok).toBe(true);
			if (!found.ok) return;
			expect(found.data).toBeNull();
		});

		it('fails for non-existent entry', async () => {
			const result = await deleteEntry(deps, postsCollection, 'fake-id');
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('NOT_FOUND');
		});
	});
});
