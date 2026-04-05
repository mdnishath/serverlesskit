import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';
import { generateApiKey, hashApiKey } from '@serverlesskit/auth/config';

const TABLE = '_api_keys';

const ensureTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${TABLE}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"label" TEXT NOT NULL,
			"prefix" TEXT NOT NULL,
			"hashedKey" TEXT NOT NULL,
			"isLive" INTEGER NOT NULL DEFAULT 0,
			"createdAt" TEXT NOT NULL
		);
	`);
};

/**
 * GET /api/api-keys — List all API keys (shows prefix only, never the full key).
 */
export async function GET() {
	try {
		const auth = await requirePermission('settings', 'read');
		if ('error' in auth) return auth.error;

		await ensureTable();
		const db = getDb();
		const result = await db.execute(`SELECT "id","label","prefix","isLive","createdAt" FROM "${TABLE}" ORDER BY "createdAt" DESC`);
		const data = result.rows.map((row) => ({
			id: String(row.id),
			label: String(row.label),
			prefix: String(row.prefix),
			isLive: Boolean(row.isLive),
			createdAt: String(row.createdAt),
		}));
		return NextResponse.json({ ok: true, data });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to list API keys';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}

/**
 * POST /api/api-keys — Create a new API key. Returns the raw key ONCE.
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('settings', 'update');
		if ('error' in auth) return auth.error;

		const { label, isLive } = await request.json();
		await ensureTable();

		const { rawKey, prefix } = generateApiKey(Boolean(isLive));
		const hashedKey = await hashApiKey(rawKey);
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const db = getDb();
		await db.execute({
			sql: `INSERT INTO "${TABLE}" ("id","label","prefix","hashedKey","isLive","createdAt") VALUES (?,?,?,?,?,?)`,
			args: [id, label || 'Unnamed key', prefix, hashedKey, isLive ? 1 : 0, now],
		});

		return NextResponse.json({
			ok: true,
			data: { id, label: label || 'Unnamed key', prefix, rawKey, isLive: Boolean(isLive), createdAt: now },
		}, { status: 201 });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to create API key';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}

/**
 * DELETE /api/api-keys — Revoke an API key by id.
 */
export async function DELETE(request: Request) {
	try {
		const auth = await requirePermission('settings', 'delete');
		if ('error' in auth) return auth.error;

		const { id } = await request.json();
		await ensureTable();
		const db = getDb();
		await db.execute({ sql: `DELETE FROM "${TABLE}" WHERE "id" = ?`, args: [id] });

		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to revoke API key';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}
