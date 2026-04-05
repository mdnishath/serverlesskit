import { NextResponse } from 'next/server';
import { MAX_UPLOAD_SIZE } from '@serverlesskit/shared/constants';

/**
 * POST /api/upload — Handles file uploads.
 * Currently returns a mock response. Will be connected to StorageAdapter later.
 */
export async function POST(request: Request) {
	try {
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
		const media = {
			id,
			filename: `${id}-${file.name}`,
			originalName: file.name,
			mimeType: file.type,
			size: file.size,
			url: `/uploads/${id}-${file.name}`,
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json({ ok: true, data: media }, { status: 201 });
	} catch {
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Upload failed' } },
			{ status: 500 },
		);
	}
}
