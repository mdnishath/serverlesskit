import { NextResponse } from 'next/server';
import { createEntry, findMany } from '@serverlesskit/core/crud';
import { getDb } from '@/lib/db';
import { getCollection } from '@/lib/schema-store';
import { requirePermission } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ collection: string }> };

/**
 * GET /api/content/[collection] — List entries with pagination.
 */
export async function GET(request: Request, { params }: RouteParams) {
	try {
		const { collection: slug } = await params;
		const auth = await requirePermission(slug, 'read');
		if ('error' in auth) return auth.error;

		const collection = await getCollection(slug);
		if (!collection) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: `Collection "${slug}" not found` } },
				{ status: 404 },
			);
		}

		const url = new URL(request.url);
		const page = Number(url.searchParams.get('page') ?? '1');
		const limit = Number(url.searchParams.get('limit') ?? '25');

		const db = getDb();
		const result = await findMany({ client: db }, collection, { page, limit });

		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message } },
				{ status: 500 },
			);
		}

		return NextResponse.json({ ok: true, data: result.data.data, meta: { pagination: result.data.pagination } });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list entries';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/content/[collection] — Create a new entry.
 */
export async function POST(request: Request, { params }: RouteParams) {
	try {
		const { collection: slug } = await params;
		const auth = await requirePermission(slug, 'create');
		if ('error' in auth) return auth.error;

		const collection = await getCollection(slug);
		if (!collection) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: `Collection "${slug}" not found` } },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const db = getDb();
		const result = await createEntry({ client: db }, collection, body);

		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message, details: result.error.details } },
				{ status: result.error.code === 'VALIDATION_ERROR' ? 422 : 500 },
			);
		}

		return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to create entry';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
