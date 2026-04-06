import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/plugins/audit-log/logs — Fetch audit log entries.
 */
export async function GET() {
	try {
		const auth = await requirePermission('plugins', 'read');
		if ('error' in auth) return auth.error;

		const db = getDb();
		try {
			const result = await db.execute(`SELECT * FROM "_audit_log" ORDER BY "id" DESC LIMIT 200`);
			const data = result.rows.map((row) => ({
				id: Number(row.id),
				event: String(row.event),
				collection: String(row.collection),
				entryId: String(row.entryId ?? ''),
				userId: String(row.userId ?? ''),
				timestamp: String(row.timestamp),
				details: String(row.details ?? '{}'),
			}));
			return NextResponse.json({ ok: true, data });
		} catch {
			/* Table might not exist yet if audit-log plugin was never activated */
			return NextResponse.json({ ok: true, data: [] });
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to fetch logs';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
