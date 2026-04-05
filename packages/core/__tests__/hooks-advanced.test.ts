import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../src/schema/index.js';
import type { CollectionDefinition } from '../src/schema/index.js';
import { createHookManager } from '../src/hooks/lifecycle-hooks.js';
import { createEntry } from '../src/crud/create.js';
import { updateEntry } from '../src/crud/update.js';
import { deleteEntry } from '../src/crud/delete.js';
import { findOne } from '../src/crud/read.js';
import type { CrudDeps } from '../src/crud/crud.types.js';

/** Helper to create a validated collection */
const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const tasksCollection = makeCollection({
	name: 'Tasks',
	fields: {
		title: field.text({ required: true }),
		done: field.boolean(),
	},
	timestamps: true,
	softDelete: true,
});

const createTableSql = `CREATE TABLE "tasks" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "done" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "deletedAt" TEXT
);`;

describe('Hooks — Advanced Cases', () => {
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

	it('afterUpdate hook fires with updated entry', async () => {
		const hooks = createHookManager();
		const spy = vi.fn();
		hooks.register('tasks', 'afterUpdate', async (payload) => {
			spy(payload);
		});

		const created = await createEntry(deps, tasksCollection, { title: 'Original', done: false });
		if (!created.ok) throw new Error('Setup failed');

		await updateEntry(deps, tasksCollection, created.data.id, { title: 'Changed' }, {}, hooks);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0]?.[0]?.entry?.title).toBe('Changed');
		expect(spy.mock.calls[0]?.[0]?.entryId).toBe(created.data.id);
	});

	it('afterDelete hook fires with deleted entry', async () => {
		const hooks = createHookManager();
		const spy = vi.fn();
		hooks.register('tasks', 'afterDelete', async (payload) => {
			spy(payload);
		});

		const created = await createEntry(deps, tasksCollection, { title: 'To Remove', done: false });
		if (!created.ok) throw new Error('Setup failed');

		await deleteEntry(deps, tasksCollection, created.data.id, {}, hooks);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0]?.[0]?.entryId).toBe(created.data.id);
	});

	it('beforeUpdate hook can modify data', async () => {
		const hooks = createHookManager();
		hooks.register('tasks', 'beforeUpdate', async (payload) => {
			return { ...payload, data: { ...payload.data, title: 'Hook-modified' } };
		});

		const created = await createEntry(deps, tasksCollection, { title: 'Original', done: false });
		if (!created.ok) throw new Error('Setup failed');

		const result = await updateEntry(
			deps, tasksCollection, created.data.id, { title: 'User input' }, {}, hooks,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.title).toBe('Hook-modified');
	});

	it('hook that throws propagates as DB_ERROR', async () => {
		const hooks = createHookManager();
		hooks.register('tasks', 'beforeCreate', async () => {
			throw new Error('Hook explosion');
		});

		const result = await createEntry(
			deps, tasksCollection, { title: 'Test', done: false }, {}, hooks,
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('Hook explosion');
	});

	it('afterUpdate hook throwing propagates as error', async () => {
		const hooks = createHookManager();
		hooks.register('tasks', 'afterUpdate', async () => {
			throw new Error('After update boom');
		});

		const created = await createEntry(deps, tasksCollection, { title: 'Test', done: false });
		if (!created.ok) throw new Error('Setup failed');

		const result = await updateEntry(
			deps, tasksCollection, created.data.id, { title: 'New' }, {}, hooks,
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('After update boom');
	});

	it('afterDelete hook throwing propagates as error', async () => {
		const hooks = createHookManager();
		hooks.register('tasks', 'afterDelete', async () => {
			throw new Error('After delete boom');
		});

		const created = await createEntry(deps, tasksCollection, { title: 'Test', done: false });
		if (!created.ok) throw new Error('Setup failed');

		const result = await deleteEntry(deps, tasksCollection, created.data.id, {}, hooks);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('After delete boom');
	});

	it('multiple hooks on same event execute in order', async () => {
		const hooks = createHookManager();
		const order: number[] = [];

		hooks.register('tasks', 'afterCreate', async () => { order.push(1); });
		hooks.register('tasks', 'afterCreate', async () => { order.push(2); });
		hooks.register('tasks', 'afterCreate', async () => { order.push(3); });

		await createEntry(deps, tasksCollection, { title: 'Test', done: false }, {}, hooks);
		expect(order).toEqual([1, 2, 3]);
	});

	it('hook manager has() returns false for unregistered events', () => {
		const hooks = createHookManager();
		hooks.register('tasks', 'beforeCreate', async () => {});

		expect(hooks.has('tasks', 'beforeRead')).toBe(false);
		expect(hooks.has('tasks', 'afterRead')).toBe(false);
		expect(hooks.has('other', 'beforeCreate')).toBe(false);
	});
});
