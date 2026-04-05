import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';

const SETTINGS_TABLE = '_settings';

const ensureTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${SETTINGS_TABLE}" (
			"key" TEXT PRIMARY KEY NOT NULL,
			"value" TEXT NOT NULL
		);
	`);
};

/**
 * GET /api/settings — Get all settings.
 */
export async function GET() {
	try {
		const auth = await requirePermission('settings', 'read');
		if ('error' in auth) return auth.error;

		await ensureTable();
		const db = getDb();
		const result = await db.execute(`SELECT * FROM "${SETTINGS_TABLE}"`);
		const settings: Record<string, string> = {};
		for (const row of result.rows) {
			settings[String(row.key)] = String(row.value);
		}
		return NextResponse.json({ ok: true, data: settings });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to load settings';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}

/**
 * POST /api/settings — Save settings (key-value pairs).
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('settings', 'update');
		if ('error' in auth) return auth.error;

		const body = await request.json();
		await ensureTable();
		const db = getDb();

		for (const [key, value] of Object.entries(body)) {
			await db.execute({
				sql: `INSERT OR REPLACE INTO "${SETTINGS_TABLE}" ("key", "value") VALUES (?, ?)`,
				args: [key, String(value)],
			});
		}

		return NextResponse.json({ ok: true, data: body });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to save settings';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}
