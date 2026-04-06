import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getDb } from '@/lib/db';

const SEO_TABLE = '_seo_meta';

/**
 * Ensures _seo_meta table exists.
 */
const ensureTable = async () => {
	const db = getDb();
	await db.execute(`CREATE TABLE IF NOT EXISTS "${SEO_TABLE}" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "collection" TEXT NOT NULL, "entryId" TEXT NOT NULL, "metaTitle" TEXT NOT NULL DEFAULT '', "metaDescription" TEXT NOT NULL DEFAULT '', "focusKeyword" TEXT NOT NULL DEFAULT '', "canonicalUrl" TEXT NOT NULL DEFAULT '', "ogTitle" TEXT NOT NULL DEFAULT '', "ogDescription" TEXT NOT NULL DEFAULT '', "ogImage" TEXT NOT NULL DEFAULT '', "noIndex" INTEGER NOT NULL DEFAULT 0, "noFollow" INTEGER NOT NULL DEFAULT 0, "updatedAt" TEXT NOT NULL, UNIQUE("collection", "entryId"))`);
};

/**
 * GET /api/plugins/seo?collection=xxx&entryId=yyy — Get SEO data for an entry.
 * GET /api/plugins/seo?collection=xxx — Get all SEO data for a collection.
 * GET /api/plugins/seo — Get all SEO data (overview).
 */
export async function GET(request: Request) {
	try {
		const auth = await requirePermission('plugins', 'read');
		if ('error' in auth) return auth.error;

		await ensureTable();
		const db = getDb();
		const url = new URL(request.url);
		const collection = url.searchParams.get('collection');
		const entryId = url.searchParams.get('entryId');

		if (collection && entryId) {
			const result = await db.execute({
				sql: `SELECT * FROM "${SEO_TABLE}" WHERE "collection" = ? AND "entryId" = ?`,
				args: [collection, entryId],
			});
			const row = result.rows[0];
			if (!row) {
				return NextResponse.json({ ok: true, data: null });
			}
			return NextResponse.json({
				ok: true,
				data: {
					collection: String(row.collection),
					entryId: String(row.entryId),
					metaTitle: String(row.metaTitle),
					metaDescription: String(row.metaDescription),
					focusKeyword: String(row.focusKeyword),
					canonicalUrl: String(row.canonicalUrl),
					ogTitle: String(row.ogTitle),
					ogDescription: String(row.ogDescription),
					ogImage: String(row.ogImage),
					noIndex: Boolean(row.noIndex),
					noFollow: Boolean(row.noFollow),
				},
			});
		}

		/* List all SEO data, optionally filtered by collection */
		let sql = `SELECT * FROM "${SEO_TABLE}"`;
		const args: string[] = [];
		if (collection) {
			sql += ` WHERE "collection" = ?`;
			args.push(collection);
		}
		sql += ` ORDER BY "updatedAt" DESC LIMIT 200`;

		const result = await db.execute({ sql, args });
		const data = result.rows.map((row) => ({
			collection: String(row.collection),
			entryId: String(row.entryId),
			metaTitle: String(row.metaTitle),
			metaDescription: String(row.metaDescription),
			focusKeyword: String(row.focusKeyword),
			noIndex: Boolean(row.noIndex),
			updatedAt: String(row.updatedAt),
		}));

		return NextResponse.json({ ok: true, data });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * POST /api/plugins/seo — Save SEO data for an entry.
 * Body: { collection, entryId, metaTitle, metaDescription, ... }
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('plugins', 'update');
		if ('error' in auth) return auth.error;

		const body = await request.json();
		const { collection, entryId } = body;
		if (!collection || !entryId) {
			return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'collection and entryId required' } }, { status: 400 });
		}

		await ensureTable();
		const db = getDb();
		await db.execute({
			sql: `INSERT OR REPLACE INTO "${SEO_TABLE}" ("collection", "entryId", "metaTitle", "metaDescription", "focusKeyword", "canonicalUrl", "ogTitle", "ogDescription", "ogImage", "noIndex", "noFollow", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				collection, entryId,
				String(body.metaTitle ?? ''),
				String(body.metaDescription ?? ''),
				String(body.focusKeyword ?? ''),
				String(body.canonicalUrl ?? ''),
				String(body.ogTitle ?? ''),
				String(body.ogDescription ?? ''),
				String(body.ogImage ?? ''),
				body.noIndex ? 1 : 0,
				body.noFollow ? 1 : 0,
				new Date().toISOString(),
			],
		});

		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
