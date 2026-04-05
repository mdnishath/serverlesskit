import { NextResponse } from 'next/server';
import { defineCollection } from '@serverlesskit/core/schema';
import { collectionToSql } from '@serverlesskit/db/schema-to-drizzle';
import { getDb } from '@/lib/db';
import { getAllCollections, getCollection, registerCollection } from '@/lib/schema-store';
import { requirePermission } from '@/lib/api-auth';

/**
 * GET /api/collections — List all registered collections with field definitions.
 */
export async function GET() {
	const auth = await requirePermission('collections', 'read');
	if ('error' in auth) return auth.error;
	const collections = await getAllCollections();
	const data = collections.map((c) => ({
		name: c.name,
		slug: c.slug,
		description: c.description,
		fieldCount: Object.keys(c.fields).length,
		timestamps: c.timestamps,
		softDelete: c.softDelete,
		fields: c.fields,
	}));

	return NextResponse.json({ ok: true, data });
}

/**
 * POST /api/collections — Create a new collection and sync its table to DB.
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('collections', 'create');
		if ('error' in auth) return auth.error;

		const body = await request.json();

		if (await getCollection(body.slug ?? '')) {
			return NextResponse.json(
				{ ok: false, error: { code: 'CONFLICT', message: `Collection "${body.slug}" already exists` } },
				{ status: 409 },
			);
		}

		const result = defineCollection(body);
		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message, details: result.error.details } },
				{ status: 422 },
			);
		}

		const collection = result.data;
		const db = getDb();

		const statements = collectionToSql(collection);
		for (const sql of statements) {
			await db.execute(sql);
		}

		await registerCollection(collection);

		return NextResponse.json(
			{ ok: true, data: { name: collection.name, slug: collection.slug } },
			{ status: 201 },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create collection';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
