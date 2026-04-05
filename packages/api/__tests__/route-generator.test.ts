import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { defineCollection, field } from '@serverlesskit/core/schema';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import type { RouteDeps } from '../src/api.types.js';
import {
	generateCreateHandler,
	generateDeleteHandler,
	generateGetHandler,
	generateListHandler,
	generateRoutes,
	generateUpdateHandler,
} from '../src/rest/route-generator.js';

const makeCollection = (opts: Parameters<typeof defineCollection>[0]): CollectionDefinition => {
	const r = defineCollection(opts);
	if (!r.ok) throw new Error(r.error.message);
	return r.data;
};

const postsCollection = makeCollection({
	name: 'Posts',
	fields: {
		title: field.text({ required: true, min: 1 }),
		status: field.select({ options: ['draft', 'published'] }),
	},
	timestamps: true,
	softDelete: true,
});

const createTableSql = `CREATE TABLE "posts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "deletedAt" TEXT
);`;

const makeRequest = (overrides: Partial<Parameters<ReturnType<typeof generateListHandler>>[0]> = {}) => ({
	method: 'GET' as const,
	params: {},
	query: {},
	headers: {},
	...overrides,
});

describe('Route Generator', () => {
	let client: Client;
	let deps: RouteDeps;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		deps = { crud: { client }, collection: postsCollection };
		await client.execute(createTableSql);
	});

	afterEach(() => {
		client.close();
	});

	describe('generateListHandler', () => {
		it('returns empty paginated list', async () => {
			const handler = generateListHandler(deps);
			const res = await handler(makeRequest());

			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect(res.body.data).toEqual([]);
				expect(res.body.meta?.pagination).toBeDefined();
			}
		});

		it('returns entries after creation', async () => {
			const createHandler = generateCreateHandler(deps);
			await createHandler(makeRequest({ method: 'POST', body: { title: 'Test', status: 'draft' } }));

			const handler = generateListHandler(deps);
			const res = await handler(makeRequest());

			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect((res.body.data as unknown[]).length).toBe(1);
			}
		});

		it('supports pagination via query params', async () => {
			const createHandler = generateCreateHandler(deps);
			for (let i = 0; i < 5; i++) {
				await createHandler(makeRequest({ method: 'POST', body: { title: `Post ${i}`, status: 'draft' } }));
			}

			const handler = generateListHandler(deps);
			const res = await handler(makeRequest({ query: { page: '1', limit: '2' } }));

			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect((res.body.data as unknown[]).length).toBe(2);
			}
		});
	});

	describe('generateCreateHandler', () => {
		it('creates an entry and returns 201', async () => {
			const handler = generateCreateHandler(deps);
			const res = await handler(makeRequest({
				method: 'POST',
				body: { title: 'New Post', status: 'draft' },
			}));

			expect(res.status).toBe(201);
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				const data = res.body.data as Record<string, unknown>;
				expect(data.title).toBe('New Post');
				expect(data.id).toBeDefined();
			}
		});

		it('returns validation error for invalid data', async () => {
			const handler = generateCreateHandler(deps);
			const res = await handler(makeRequest({
				method: 'POST',
				body: { status: 'draft' },
			}));

			expect(res.status).toBe(422);
			expect(res.body.ok).toBe(false);
		});
	});

	describe('generateGetHandler', () => {
		it('returns a single entry by ID', async () => {
			const createHandler = generateCreateHandler(deps);
			const createRes = await createHandler(makeRequest({
				method: 'POST',
				body: { title: 'Find Me', status: 'published' },
			}));

			const createdId = (createRes.body as { ok: true; data: { id: string } }).data.id;

			const handler = generateGetHandler(deps);
			const res = await handler(makeRequest({ params: { id: createdId } }));

			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		});

		it('returns 404 for non-existent ID', async () => {
			const handler = generateGetHandler(deps);
			const res = await handler(makeRequest({ params: { id: 'fake' } }));

			expect(res.status).toBe(404);
			expect(res.body.ok).toBe(false);
		});
	});

	describe('generateUpdateHandler', () => {
		it('updates an entry', async () => {
			const createHandler = generateCreateHandler(deps);
			const createRes = await createHandler(makeRequest({
				method: 'POST',
				body: { title: 'Original', status: 'draft' },
			}));
			const id = (createRes.body as { ok: true; data: { id: string } }).data.id;

			const handler = generateUpdateHandler(deps);
			const res = await handler(makeRequest({
				method: 'PUT',
				params: { id },
				body: { title: 'Updated' },
			}));

			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
			if (res.body.ok) {
				expect((res.body.data as Record<string, unknown>).title).toBe('Updated');
			}
		});
	});

	describe('generateDeleteHandler', () => {
		it('soft-deletes an entry and returns 204', async () => {
			const createHandler = generateCreateHandler(deps);
			const createRes = await createHandler(makeRequest({
				method: 'POST',
				body: { title: 'Delete Me', status: 'draft' },
			}));
			const id = (createRes.body as { ok: true; data: { id: string } }).data.id;

			const handler = generateDeleteHandler(deps);
			const res = await handler(makeRequest({ method: 'DELETE', params: { id } }));

			expect(res.status).toBe(204);
		});

		it('returns 404 for non-existent entry', async () => {
			const handler = generateDeleteHandler(deps);
			const res = await handler(makeRequest({ method: 'DELETE', params: { id: 'fake' } }));

			expect(res.status).toBe(404);
		});
	});

	describe('generateRoutes', () => {
		it('generates 6 routes for a collection', () => {
			const routes = generateRoutes(deps);
			const keys = Object.keys(routes);
			expect(keys).toHaveLength(6);
			expect(keys.some((k) => k.startsWith('GET'))).toBe(true);
			expect(keys.some((k) => k.startsWith('POST'))).toBe(true);
			expect(keys.some((k) => k.startsWith('PUT'))).toBe(true);
			expect(keys.some((k) => k.startsWith('PATCH'))).toBe(true);
			expect(keys.some((k) => k.startsWith('DELETE'))).toBe(true);
		});
	});
});
