import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../src/schema/index.js';
import type { CollectionDefinition } from '../src/schema/index.js';
import { createEntry } from '../src/crud/create.js';
import { findOne } from '../src/crud/read.js';
import { updateEntry } from '../src/crud/update.js';
import { deleteEntry } from '../src/crud/delete.js';
import type { CrudDeps } from '../src/crud/crud.types.js';

/** Helper to create a validated collection */
const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const itemsCollection = makeCollection({
	name: 'Items',
	fields: {
		title: field.text({ required: true }),
		count: field.number({ integer: true, required: false }),
		active: field.boolean(),
		category: field.select({ options: ['a', 'b', 'c'] }),
	},
	timestamps: true,
	softDelete: true,
});

const createTableSql = `CREATE TABLE "items" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "count" INTEGER,
  "active" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "deletedAt" TEXT
);`;

describe('CRUD Edge Cases', () => {
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

	it('creates entry with all field types simultaneously', async () => {
		const result = await createEntry(deps, itemsCollection, {
			title: 'Full Entry',
			count: 42,
			active: true,
			category: 'a',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.title).toBe('Full Entry');
		expect(result.data.count).toBe(42);
		expect(result.data.active).toBe(true);
		expect(result.data.category).toBe('a');
	});

	it('stores boolean false as integer 0', async () => {
		const created = await createEntry(deps, itemsCollection, {
			title: 'Bool Test', active: false, category: 'b',
		});
		if (!created.ok) throw new Error('Setup failed');

		const found = await findOne(deps, itemsCollection, created.data.id);
		expect(found.ok).toBe(true);
		if (!found.ok) return;
		expect(found.data?.active).toBe(0);
	});

	it('creates entry with null optional fields', async () => {
		const result = await createEntry(deps, itemsCollection, {
			title: 'Sparse', active: false, category: 'c',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.count).toBeUndefined();
	});

	it('update with empty object only changes updatedAt', async () => {
		const created = await createEntry(deps, itemsCollection, {
			title: 'NoChange', active: true, category: 'a',
		});
		if (!created.ok) throw new Error('Setup failed');
		const originalUpdatedAt = created.data.updatedAt;

		await new Promise((r) => setTimeout(r, 10));

		const result = await updateEntry(deps, itemsCollection, created.data.id, {});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.title).toBe('NoChange');
		expect(result.data.updatedAt).not.toBe(originalUpdatedAt);
	});

	it('update soft-deleted entry returns NOT_FOUND', async () => {
		const created = await createEntry(deps, itemsCollection, {
			title: 'Deleted', active: true, category: 'b',
		});
		if (!created.ok) throw new Error('Setup failed');

		await deleteEntry(deps, itemsCollection, created.data.id);

		const result = await updateEntry(deps, itemsCollection, created.data.id, {
			title: 'Revived?',
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('NOT_FOUND');
	});

	it('soft-delete already deleted entry still succeeds', async () => {
		const created = await createEntry(deps, itemsCollection, {
			title: 'Double Delete', active: true, category: 'c',
		});
		if (!created.ok) throw new Error('Setup failed');

		const first = await deleteEntry(deps, itemsCollection, created.data.id);
		expect(first.ok).toBe(true);

		const second = await deleteEntry(deps, itemsCollection, created.data.id);
		expect(second.ok).toBe(true);
	});

	it('concurrent creates produce unique IDs', async () => {
		const promises = Array.from({ length: 5 }, (_, i) =>
			createEntry(deps, itemsCollection, {
				title: `Concurrent ${i}`, active: true, category: 'a',
			}),
		);

		const results = await Promise.all(promises);
		const ids = results
			.filter((r) => r.ok)
			.map((r) => (r as { ok: true; data: { id: string } }).data.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(5);
	});

	it('hard-delete on soft-deleted entry removes it completely', async () => {
		const created = await createEntry(deps, itemsCollection, {
			title: 'To Purge', active: false, category: 'a',
		});
		if (!created.ok) throw new Error('Setup failed');

		await deleteEntry(deps, itemsCollection, created.data.id);

		const hardDel = await deleteEntry(
			deps, itemsCollection, created.data.id, {}, undefined, { forceDelete: true },
		);
		expect(hardDel.ok).toBe(true);

		const found = await findOne(deps, itemsCollection, created.data.id, {
			includeSoftDeleted: true,
		});
		expect(found.ok).toBe(true);
		if (!found.ok) return;
		expect(found.data).toBeNull();
	});
});
