import { NextResponse } from 'next/server';
import { MAX_UPLOAD_SIZE } from '@serverlesskit/shared/constants';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getDb } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');

/**
 * POST /api/upload — Handles file uploads, saves to public/uploads/ and persists metadata to DB.
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('media', 'create');
		if ('error' in auth) return auth.error;
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
				{ status: 400 },
			);
		}

		if (file.size > MAX_UPLOAD_SIZE) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'File too large (max 50MB)' } },
				{ status: 400 },
			);
		}

		const id = crypto.randomUUID();
		const filename = `${id}-${file.name}`;

		await mkdir(UPLOADS_DIR, { recursive: true });
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(join(UPLOADS_DIR, filename), buffer);

		const media = {
			id,
			filename,
			originalName: file.name,
			mimeType: file.type,
			size: file.size,
			url: `/uploads/${filename}`,
			createdAt: new Date().toISOString(),
		};

		const db = getDb();
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "_media" (
				"id" TEXT PRIMARY KEY NOT NULL,
				"filename" TEXT NOT NULL,
				"originalName" TEXT NOT NULL,
				"mimeType" TEXT NOT NULL,
				"size" INTEGER NOT NULL,
				"url" TEXT NOT NULL,
				"createdAt" TEXT NOT NULL
			);
		`);
		await db.execute({
			sql: `INSERT INTO "_media" ("id","filename","originalName","mimeType","size","url","createdAt") VALUES (?,?,?,?,?,?,?)`,
			args: [media.id, media.filename, media.originalName, media.mimeType, media.size, media.url, media.createdAt],
		});

		return NextResponse.json({ ok: true, data: media }, { status: 201 });
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Upload failed' } },
			{ status: 500 },
		);
	}
}
