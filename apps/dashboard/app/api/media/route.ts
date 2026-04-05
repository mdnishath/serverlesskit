import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { requirePermission } from '@/lib/api-auth';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');
const MEDIA_TABLE = '_media';

/**
 * Ensures the _media table exists.
 */
const ensureTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${MEDIA_TABLE}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"filename" TEXT NOT NULL,
			"originalName" TEXT NOT NULL,
			"mimeType" TEXT NOT NULL,
			"size" INTEGER NOT NULL,
			"url" TEXT NOT NULL,
			"createdAt" TEXT NOT NULL
		);
	`);
};

/**
 * GET /api/media — List all uploaded media.
 */
export async function GET() {
	try {
		const auth = await requirePermission('media', 'read');
		if ('error' in auth) return auth.error;
		await ensureTable();
		const db = getDb();
		const result = await db.execute(`SELECT * FROM "${MEDIA_TABLE}" ORDER BY "createdAt" DESC`);
		const data = result.rows.map((row) => ({
			id: String(row.id),
			filename: String(row.filename),
			originalName: String(row.originalName),
			mimeType: String(row.mimeType),
			size: Number(row.size),
			url: String(row.url),
			createdAt: String(row.createdAt),
		}));
		return NextResponse.json({ ok: true, data });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list media';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/media — Delete a media item by id (sent as JSON body).
 */
export async function DELETE(request: Request) {
	try {
		const auth = await requirePermission('media', 'delete');
		if ('error' in auth) return auth.error;
		const { id } = await request.json();
		if (!id) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Media id is required' } },
				{ status: 400 },
			);
		}

		await ensureTable();
		const db = getDb();
		const result = await db.execute({ sql: `SELECT * FROM "${MEDIA_TABLE}" WHERE "id" = ?`, args: [id] });
		const row = result.rows[0];

		if (row) {
			try {
				await unlink(join(UPLOADS_DIR, String(row.filename)));
			} catch { /* file may already be gone */ }
			await db.execute({ sql: `DELETE FROM "${MEDIA_TABLE}" WHERE "id" = ?`, args: [id] });
		}

		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete media';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
