import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { buildPermissionMap } from '@serverlesskit/auth/permissions';
import type { AuthContext } from '@serverlesskit/auth/types';
import { defineCollection, field } from '@serverlesskit/core/schema';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import type { RouteDeps } from '../src/api.types.js';
import {
	generateCreateHandler,
	generateDeleteHandler,
	generateGetHandler,
	generateListHandler,
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

/** Helper to build a mock request */
const makeRequest = (overrides: Record<string, unknown> = {}) => ({
	method: 'GET' as const,
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
	headers: {} as Record<string, string | undefined>,
	...overrides,
});

/** Helper to create an auth context with specific permissions */
const makeAuthCtx = (permissions: string[]): AuthContext => ({
	user: { id: 'u1', email: 'u@test.com', name: 'Test', role: 'custom', isActive: true },
	session: { id: 's1', userId: 'u1', expiresAt: '' },
	permissionMap: buildPermissionMap(permissions),
});

describe('Route Auth Integration', () => {
	let client: Client;
	let baseDeps: Omit<RouteDeps, 'getAuthContext'>;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		await client.execute(createTableSql);
		baseDeps = { crud: { client }, collection: postsCollection };
	});

	afterEach(() => {
		client.close();
	});

	it('list returns 401 when auth returns null', async () => {
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => null };
		const handler = generateListHandler(deps);
		const res = await handler(makeRequest());
		expect(res.status).toBe(401);
	});

	it('list returns 403 when user lacks read permission', async () => {
		const ctx = makeAuthCtx(['posts:create']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };
		const handler = generateListHandler(deps);
		const res = await handler(makeRequest());
		expect(res.status).toBe(403);
	});

	it('list succeeds with read permission', async () => {
		const ctx = makeAuthCtx(['posts:read']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };
		const handler = generateListHandler(deps);
		const res = await handler(makeRequest());
		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});

	it('create returns 401 when unauthenticated', async () => {
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => null };
		const handler = generateCreateHandler(deps);
		const res = await handler(makeRequest({
			method: 'POST', body: { title: 'Test', status: 'draft' },
		}));
		expect(res.status).toBe(401);
	});

	it('create returns 403 when user lacks create permission', async () => {
		const ctx = makeAuthCtx(['posts:read']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };
		const handler = generateCreateHandler(deps);
		const res = await handler(makeRequest({
			method: 'POST', body: { title: 'Test', status: 'draft' },
		}));
		expect(res.status).toBe(403);
	});

	it('create succeeds with create permission', async () => {
		const ctx = makeAuthCtx(['posts:create']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };
		const handler = generateCreateHandler(deps);
		const res = await handler(makeRequest({
			method: 'POST', body: { title: 'Test', status: 'draft' },
		}));
		expect(res.status).toBe(201);
	});

	it('delete returns 403 when user lacks delete permission', async () => {
		const ctx = makeAuthCtx(['posts:create', 'posts:read']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };

		const createHandler = generateCreateHandler({ ...baseDeps, getAuthContext: async () => makeAuthCtx(['posts:create']) });
		const createRes = await createHandler(makeRequest({
			method: 'POST', body: { title: 'ToDelete', status: 'draft' },
		}));
		if (!createRes.body.ok) throw new Error('Setup failed');
		const entryId = (createRes.body.data as Record<string, unknown>).id as string;

		const handler = generateDeleteHandler(deps);
		const res = await handler(makeRequest({ params: { id: entryId } }));
		expect(res.status).toBe(403);
	});

	it('handlers work without auth when getAuthContext is not set', async () => {
		const deps: RouteDeps = { ...baseDeps };
		const handler = generateListHandler(deps);
		const res = await handler(makeRequest());
		expect(res.status).toBe(200);
	});

	it('get returns 401 when unauthenticated', async () => {
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => null };
		const handler = generateGetHandler(deps);
		const res = await handler(makeRequest({ params: { id: 'fake' } }));
		expect(res.status).toBe(401);
	});

	it('update returns 403 without update permission', async () => {
		const ctx = makeAuthCtx(['posts:read']);
		const deps: RouteDeps = { ...baseDeps, getAuthContext: async () => ctx };
		const handler = generateUpdateHandler(deps);
		const res = await handler(makeRequest({
			params: { id: 'fake' }, body: { title: 'X' },
		}));
		expect(res.status).toBe(403);
	});
});
