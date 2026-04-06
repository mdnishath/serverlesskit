import { NextResponse } from 'next/server';
import { unzipSync } from 'fflate';
import { requirePermission } from '@/lib/api-auth';
import { getDb } from '@/lib/db';
import { registerUploadedPlugin } from '@/lib/plugin-runtime';

const PLUGINS_TABLE = '_plugins';
const PLUGIN_META_TABLE = '_plugin_meta';

/**
 * Ensures the plugin meta table exists for storing uploaded plugin metadata.
 */
const ensureMetaTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${PLUGIN_META_TABLE}" (
			"name" TEXT PRIMARY KEY NOT NULL,
			"version" TEXT NOT NULL DEFAULT '1.0.0',
			"description" TEXT NOT NULL DEFAULT '',
			"author" TEXT NOT NULL DEFAULT '',
			"category" TEXT NOT NULL DEFAULT 'developer',
			"features" TEXT NOT NULL DEFAULT '[]',
			"hooks" TEXT NOT NULL DEFAULT '[]',
			"settings" TEXT NOT NULL DEFAULT '[]',
			"installedAt" TEXT NOT NULL
		);
	`);
};

/**
 * Extracts manifest.json from a zip buffer using fflate.
 * @param buffer - The zip file as ArrayBuffer
 * @returns Parsed manifest object or null
 */
const extractManifest = (buffer: ArrayBuffer): Record<string, unknown> | null => {
	try {
		const files = unzipSync(new Uint8Array(buffer));
		/* Look for manifest.json (could be at root or inside a folder) */
		for (const [path, data] of Object.entries(files)) {
			const filename = path.split('/').pop();
			if (filename === 'manifest.json') {
				const text = new TextDecoder().decode(data);
				return JSON.parse(text) as Record<string, unknown>;
			}
		}
		return null;
	} catch {
		return null;
	}
};

/**
 * POST /api/plugins/upload — Upload a .zip plugin and install it.
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('plugins', 'update');
		if ('error' in auth) return auth.error;

		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file || !file.name.endsWith('.zip')) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'A .zip file is required' } },
				{ status: 400 },
			);
		}

		const buffer = await file.arrayBuffer();
		const manifest = extractManifest(buffer);

		if (!manifest || !manifest.name) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'No valid manifest.json found in the zip. It must contain a "name" field.' } },
				{ status: 400 },
			);
		}

		const name = String(manifest.name);
		const version = String(manifest.version ?? '1.0.0');
		const description = String(manifest.description ?? '');
		const author = String(manifest.author ?? '');
		const category = String(manifest.category ?? 'developer');
		const features = JSON.stringify(manifest.features ?? []);
		const hooks = JSON.stringify(manifest.hooks ?? []);
		const settings = JSON.stringify(manifest.settings ?? []);

		await ensureMetaTable();
		const db = getDb();

		/* Store plugin metadata */
		await db.execute({
			sql: `INSERT OR REPLACE INTO "${PLUGIN_META_TABLE}" ("name", "version", "description", "author", "category", "features", "hooks", "settings", "installedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [name, version, description, author, category, features, hooks, settings, new Date().toISOString()],
		});

		/* Clear any stale deleted marker and ensure clean _plugins row */
		await db.execute(`CREATE TABLE IF NOT EXISTS "${PLUGINS_TABLE}" ("name" TEXT PRIMARY KEY NOT NULL, "enabled" INTEGER NOT NULL DEFAULT 0, "config" TEXT NOT NULL DEFAULT '{}')`);
		await db.execute({
			sql: `INSERT OR REPLACE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, '{}')`,
			args: [name],
		});

		/* Reset runtime so it reloads from DB */
		await registerUploadedPlugin();

		return NextResponse.json({
			ok: true,
			data: { name, version, description, author, category },
		}, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to upload plugin';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
