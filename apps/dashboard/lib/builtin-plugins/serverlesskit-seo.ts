import { definePlugin } from '@serverlesskit/plugin-sdk';
import { getDb } from '../db';

const SEO_TABLE = '_seo_meta';

/**
 * Ensures the SEO metadata table exists.
 */
const ensureSeoTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${SEO_TABLE}" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"collection" TEXT NOT NULL,
			"entryId" TEXT NOT NULL,
			"metaTitle" TEXT NOT NULL DEFAULT '',
			"metaDescription" TEXT NOT NULL DEFAULT '',
			"focusKeyword" TEXT NOT NULL DEFAULT '',
			"canonicalUrl" TEXT NOT NULL DEFAULT '',
			"ogTitle" TEXT NOT NULL DEFAULT '',
			"ogDescription" TEXT NOT NULL DEFAULT '',
			"ogImage" TEXT NOT NULL DEFAULT '',
			"noIndex" INTEGER NOT NULL DEFAULT 0,
			"noFollow" INTEGER NOT NULL DEFAULT 0,
			"updatedAt" TEXT NOT NULL,
			UNIQUE("collection", "entryId")
		);
	`);
};

/**
 * ServerlessKit SEO — Yoast-like SEO plugin for all content types.
 * Adds SEO metadata fields to every entry in every collection.
 */
export const serverlesskitSeoPlugin = definePlugin({
	name: 'serverlesskit-seo',
	version: '1.0.0',
	description: 'Complete SEO toolkit — meta tags, Open Graph, focus keywords, SEO analysis for all content types',
	author: 'ServerlessKit',
	setup: (api) => {
		let tableReady = false;

		/* Initialize SEO record when a new entry is created */
		api.registerHook('afterCreate', async (payload) => {
			try {
				if (!tableReady) { await ensureSeoTable(); tableReady = true; }
				const p = payload as { collection?: string; data?: { id?: string; title?: string; name?: string } };
				if (!p.collection || !p.data?.id) return payload;

				const title = String(p.data.title ?? p.data.name ?? '');
				const db = getDb();
				await db.execute({
					sql: `INSERT OR IGNORE INTO "${SEO_TABLE}" ("collection", "entryId", "metaTitle", "metaDescription", "updatedAt") VALUES (?, ?, ?, '', ?)`,
					args: [p.collection, p.data.id, title, new Date().toISOString()],
				});
			} catch { /* non-blocking */ }
			return payload;
		});

		/* Clean up SEO data when an entry is deleted */
		api.registerHook('afterDelete', async (payload) => {
			try {
				if (!tableReady) { await ensureSeoTable(); tableReady = true; }
				const p = payload as { collection?: string; entryId?: string };
				if (!p.collection || !p.entryId) return payload;

				const db = getDb();
				await db.execute({
					sql: `DELETE FROM "${SEO_TABLE}" WHERE "collection" = ? AND "entryId" = ?`,
					args: [p.collection, p.entryId],
				});
			} catch { /* non-blocking */ }
			return payload;
		});
	},
});
