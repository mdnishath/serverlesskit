import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getDb } from '@/lib/db';

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
 * Simple zip manifest.json extractor.
 * Zip files store local file headers followed by data. We search for
 * the manifest.json filename in the raw bytes and extract the JSON.
 */
const extractManifest = (buffer: ArrayBuffer): Record<string, unknown> | null => {
	const bytes = new Uint8Array(buffer);
	const text = new TextDecoder();

	/* Search for manifest.json in the zip — look for the filename in local file headers */
	const needle = 'manifest.json';
	let manifestStart = -1;

	for (let i = 0; i < bytes.length - needle.length; i++) {
		let match = true;
		for (let j = 0; j < needle.length; j++) {
			if (bytes[i + j] !== needle.charCodeAt(j)) { match = false; break; }
		}
		if (match) {
			/* Found "manifest.json" — the data follows after this filename in the local file header.
			   The local file header has the compressed size at offset -16 from filename start.
			   But for simplicity, just scan forward for the JSON opening brace. */
			for (let k = i + needle.length; k < bytes.length; k++) {
				if (bytes[k] === 0x7B) { /* '{' */
					/* Find the end of JSON — count braces */
					let depth = 0;
					let end = k;
					for (let m = k; m < bytes.length; m++) {
						if (bytes[m] === 0x7B) depth++;
						if (bytes[m] === 0x7D) depth--;
						if (depth === 0) { end = m + 1; break; }
					}
					try {
						const jsonStr = text.decode(bytes.slice(k, end));
						return JSON.parse(jsonStr) as Record<string, unknown>;
					} catch { return null; }
				}
			}
			manifestStart = i;
			break;
		}
	}

	return null;
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

		/* Also create an entry in _plugins if not exists */
		await db.execute(`CREATE TABLE IF NOT EXISTS "${PLUGINS_TABLE}" ("name" TEXT PRIMARY KEY NOT NULL, "enabled" INTEGER NOT NULL DEFAULT 0, "config" TEXT NOT NULL DEFAULT '{}')`);
		await db.execute({
			sql: `INSERT OR IGNORE INTO "${PLUGINS_TABLE}" ("name", "enabled", "config") VALUES (?, 0, '{}')`,
			args: [name],
		});

		return NextResponse.json({
			ok: true,
			data: { name, version, description, author, category },
		}, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to upload plugin';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
