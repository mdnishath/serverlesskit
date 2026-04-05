import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '../src/schema/index.js';
import type { CollectionDefinition } from '../src/schema/index.js';
import { createHookManager } from '../src/hooks/lifecycle-hooks.js';
import { createEntry } from '../src/crud/create.js';
import { updateEntry } from '../src/crud/update.js';
import { deleteEntry } from '../src/crud/delete.js';
import type { CrudDeps } from '../src/crud/crud.types.js';

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
	softDelete: false,
});

const createTableSql = `CREATE TABLE "tasks" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "done" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);`;

describe('Lifecycle Hooks', () => {
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

	describe('HookManager', () => {
		it('registers and executes hooks', async () => {
			const hooks = createHookManager();
			const spy = vi.fn();

			hooks.register('tasks', 'beforeCreate', async (payload) => {
				spy(payload);
			});

			expect(hooks.has('tasks', 'beforeCreate')).toBe(true);
			expect(hooks.has('tasks', 'afterCreate')).toBe(false);

			await createEntry(deps, tasksCollection, { title: 'Test', done: false }, {}, hooks);
			expect(spy).toHaveBeenCalledOnce();
		});

		it('beforeCreate hook can modify data', async () => {
			const hooks = createHookManager();

			hooks.register('tasks', 'beforeCreate', async (payload) => {
				return { ...payload, data: { ...payload.data, title: 'Modified by hook' } };
			});

			const result = await createEntry(
				deps,
				tasksCollection,
				{ title: 'Original', done: false },
				{},
				hooks,
			);

			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data.title).toBe('Modified by hook');
		});

		it('afterCreate hook receives created entry', async () => {
			const hooks = createHookManager();
			const spy = vi.fn();

			hooks.register('tasks', 'afterCreate', async (payload) => {
				spy(payload);
			});

			await createEntry(deps, tasksCollection, { title: 'Test', done: false }, {}, hooks);
			expect(spy).toHaveBeenCalledOnce();
			expect(spy.mock.calls[0]?.[0]?.entryId).toBeDefined();
		});

		it('beforeUpdate hook fires', async () => {
			const hooks = createHookManager();
			const spy = vi.fn();
			hooks.register('tasks', 'beforeUpdate', async (payload) => {
				spy(payload);
			});

			const created = await createEntry(
				deps,
				tasksCollection,
				{ title: 'Test', done: false },
				{},
				hooks,
			);
			if (!created.ok) throw new Error('Setup failed');

			await updateEntry(deps, tasksCollection, created.data.id, { title: 'Updated' }, {}, hooks);
			expect(spy).toHaveBeenCalledOnce();
		});

		it('beforeDelete hook fires', async () => {
			const hooks = createHookManager();
			const spy = vi.fn();
			hooks.register('tasks', 'beforeDelete', async (payload) => {
				spy(payload);
			});

			const created = await createEntry(deps, tasksCollection, { title: 'Delete Me', done: false });
			if (!created.ok) throw new Error('Setup failed');

			await deleteEntry(deps, tasksCollection, created.data.id, {}, hooks);
			expect(spy).toHaveBeenCalledOnce();
		});

		it('clears hooks for a specific collection', () => {
			const hooks = createHookManager();
			hooks.register('tasks', 'beforeCreate', async () => {});
			hooks.register('tasks', 'afterCreate', async () => {});

			hooks.clear('tasks');
			expect(hooks.has('tasks', 'beforeCreate')).toBe(false);
			expect(hooks.has('tasks', 'afterCreate')).toBe(false);
		});

		it('clears all hooks', () => {
			const hooks = createHookManager();
			hooks.register('tasks', 'beforeCreate', async () => {});
			hooks.register('posts', 'beforeCreate', async () => {});

			hooks.clear();
			expect(hooks.has('tasks', 'beforeCreate')).toBe(false);
			expect(hooks.has('posts', 'beforeCreate')).toBe(false);
		});

		it('executes multiple hooks in order', async () => {
			const hooks = createHookManager();
			const order: number[] = [];

			hooks.register('tasks', 'beforeCreate', async () => {
				order.push(1);
			});
			hooks.register('tasks', 'beforeCreate', async () => {
				order.push(2);
			});

			await createEntry(deps, tasksCollection, { title: 'Test', done: false }, {}, hooks);
			expect(order).toEqual([1, 2]);
		});
	});
});
