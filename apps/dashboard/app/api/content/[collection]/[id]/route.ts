import { NextResponse } from 'next/server';
import { findOne, updateEntry, deleteEntry } from '@serverlesskit/core/crud';
import { getDb } from '@/lib/db';
import { getCollection } from '@/lib/schema-store';
import { requirePermission } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ collection: string; id: string }> };

/**
 * GET /api/content/[collection]/[id] — Get a single entry by ID.
 */
export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { collection: slug, id } = await params;
		const auth = await requirePermission(slug, 'read');
		if ('error' in auth) return auth.error;
		const collection = await getCollection(slug);
		if (!collection) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: `Collection "${slug}" not found` } },
				{ status: 404 },
			);
		}

		const db = getDb();
		const result = await findOne({ client: db }, collection, id);

		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message } },
				{ status: 500 },
			);
		}
		if (!result.data) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } },
				{ status: 404 },
			);
		}

		return NextResponse.json({ ok: true, data: result.data });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to get entry';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/content/[collection]/[id] — Update an entry.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
	try {
		const { collection: slug, id } = await params;
		const auth = await requirePermission(slug, 'update');
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
		const result = await updateEntry({ client: db }, collection, id, body);

		if (!result.ok) {
			const status = result.error.code === 'NOT_FOUND' ? 404
				: result.error.code === 'VALIDATION_ERROR' ? 422 : 500;
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message } },
				{ status },
			);
		}

		return NextResponse.json({ ok: true, data: result.data });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update entry';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/content/[collection]/[id] — Delete an entry.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { collection: slug, id } = await params;
		const auth = await requirePermission(slug, 'delete');
		if ('error' in auth) return auth.error;
		const collection = await getCollection(slug);
		if (!collection) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: `Collection "${slug}" not found` } },
				{ status: 404 },
			);
		}

		const db = getDb();
		const result = await deleteEntry({ client: db }, collection, id);

		if (!result.ok) {
			const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
			return NextResponse.json(
				{ ok: false, error: { code: result.error.code, message: result.error.message } },
				{ status },
			);
		}

		return NextResponse.json({ ok: true, data: null }, { status: 200 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete entry';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
