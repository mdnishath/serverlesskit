import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { buildPermissionMap } from '@serverlesskit/auth/permissions';
import type { AuthContext } from '@serverlesskit/auth/types';
import { ROLE_EDITOR, ROLE_SUPER_ADMIN, ROLE_VIEWER } from '@serverlesskit/auth/rbac';
import { defineCollection, field } from '@serverlesskit/core/schema';
import type { CollectionDefinition } from '@serverlesskit/core/schema';
import type { RouteDeps } from '../../src/api.types.js';
import {
	generateCreateHandler,
	generateDeleteHandler,
	generateListHandler,
	generateUpdateHandler,
} from '../../src/rest/route-generator.js';

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
  "id" TEXT PRIMARY KEY NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL, "deletedAt" TEXT
);`;

/** Helper to build auth context from a role definition */
const makeCtx = (role: { permissions: string[] }): AuthContext => ({
	user: { id: 'u1', email: 'u@test.com', name: 'Test', role: 'test', isActive: true },
	session: { id: 's1', userId: 'u1', expiresAt: '' },
	permissionMap: buildPermissionMap(role.permissions),
});

const makeRequest = (overrides: Record<string, unknown> = {}) => ({
	method: 'GET' as const,
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
	headers: {} as Record<string, string | undefined>,
	...overrides,
});

describe('Integration: API + Auth Flow', () => {
	let client: Client;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		await client.execute(createTableSql);
	});

	afterEach(() => { client.close(); });

	const makeDeps = (ctx: AuthContext | null): RouteDeps => ({
		crud: { client },
		collection: postsCollection,
		getAuthContext: async () => ctx,
	});

	/** Creates a post via super-admin, returns its ID */
	const seedPost = async (title: string): Promise<string> => {
		const deps = makeDeps(makeCtx(ROLE_SUPER_ADMIN));
		const res = await generateCreateHandler(deps)(makeRequest({
			method: 'POST', body: { title, status: 'draft' },
		}));
		if (!res.body.ok) throw new Error('Seed failed');
		return (res.body.data as Record<string, unknown>).id as string;
	};

	it('editor can create, read, update but NOT delete', async () => {
		const ctx = makeCtx(ROLE_EDITOR);
		const deps = makeDeps(ctx);

		const createRes = await generateCreateHandler(deps)(makeRequest({
			method: 'POST', body: { title: 'Editor Post', status: 'draft' },
		}));
		expect(createRes.status).toBe(201);
		const postId = (createRes.body as { ok: true; data: { id: string } }).data.id;

		expect((await generateListHandler(deps)(makeRequest())).status).toBe(200);

		expect((await generateUpdateHandler(deps)(makeRequest({
			method: 'PUT', params: { id: postId }, body: { title: 'Updated' },
		}))).status).toBe(200);

		expect((await generateDeleteHandler(deps)(makeRequest({
			params: { id: postId },
		}))).status).toBe(403);
	});

	it('viewer can only read', async () => {
		const postId = await seedPost('Viewer Test');
		const deps = makeDeps(makeCtx(ROLE_VIEWER));

		expect((await generateListHandler(deps)(makeRequest())).status).toBe(200);
		expect((await generateCreateHandler(deps)(makeRequest({
			method: 'POST', body: { title: 'X', status: 'draft' },
		}))).status).toBe(403);
		expect((await generateUpdateHandler(deps)(makeRequest({
			method: 'PUT', params: { id: postId }, body: { title: 'No' },
		}))).status).toBe(403);
		expect((await generateDeleteHandler(deps)(makeRequest({
			params: { id: postId },
		}))).status).toBe(403);
	});

	it('super-admin can do everything', async () => {
		const deps = makeDeps(makeCtx(ROLE_SUPER_ADMIN));

		const createRes = await generateCreateHandler(deps)(makeRequest({
			method: 'POST', body: { title: 'Admin Post', status: 'draft' },
		}));
		expect(createRes.status).toBe(201);
		const postId = (createRes.body as { ok: true; data: { id: string } }).data.id;

		expect((await generateListHandler(deps)(makeRequest())).status).toBe(200);
		expect((await generateUpdateHandler(deps)(makeRequest({
			method: 'PUT', params: { id: postId }, body: { title: 'Updated' },
		}))).status).toBe(200);
		expect((await generateDeleteHandler(deps)(makeRequest({
			params: { id: postId },
		}))).status).toBe(204);
	});

	it('unauthenticated user gets 401 on all operations', async () => {
		const deps = makeDeps(null);

		expect((await generateListHandler(deps)(makeRequest())).status).toBe(401);
		expect((await generateCreateHandler(deps)(makeRequest({
			method: 'POST', body: { title: 'X', status: 'draft' },
		}))).status).toBe(401);
		expect((await generateUpdateHandler(deps)(makeRequest({
			method: 'PUT', params: { id: 'x' }, body: { title: 'X' },
		}))).status).toBe(401);
		expect((await generateDeleteHandler(deps)(makeRequest({
			params: { id: 'x' },
		}))).status).toBe(401);
	});
});
