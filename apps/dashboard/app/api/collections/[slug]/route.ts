import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCollection, removeCollection } from '@/lib/schema-store';

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * DELETE /api/collections/[slug] — Delete a collection and drop its table.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { slug } = await params;
		const collection = await getCollection(slug);
		if (!collection) {
			return NextResponse.json(
				{ ok: false, error: { code: 'NOT_FOUND', message: `Collection "${slug}" not found` } },
				{ status: 404 },
			);
		}

		const db = getDb();
		await db.execute(`DROP TABLE IF EXISTS "${slug}"`);
		await removeCollection(slug);

		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete collection';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
