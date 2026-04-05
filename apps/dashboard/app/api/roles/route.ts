import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';

const ROLES_TABLE = '_roles';

/** Ensures _roles table exists */
const ensureTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${ROLES_TABLE}" (
			"name" TEXT PRIMARY KEY NOT NULL,
			"description" TEXT NOT NULL DEFAULT '',
			"permissions" TEXT NOT NULL DEFAULT '[]'
		);
	`);
};

/** Built-in roles that always exist */
const BUILT_IN = [
	{ name: 'super-admin', description: 'Full system access', permissions: ['*'], isBuiltIn: true },
	{ name: 'admin', description: 'Manage content and users', permissions: ['*:create', '*:read', '*:update', '*:delete', '*:manage'], isBuiltIn: true },
	{ name: 'editor', description: 'Can manage content', permissions: ['*:read', '*:create', '*:update', 'media:*'], isBuiltIn: true },
	{ name: 'viewer', description: 'Read-only access', permissions: ['*:read'], isBuiltIn: true },
];

/**
 * GET /api/roles — List all roles (built-in + custom).
 */
export async function GET() {
	try {
		const auth = await requirePermission('roles', 'read');
		if ('error' in auth) return auth.error;

		await ensureTable();
		const db = getDb();
		const result = await db.execute(`SELECT * FROM "${ROLES_TABLE}"`);
		const custom = result.rows.map((row) => ({
			name: String(row.name),
			description: String(row.description),
			permissions: JSON.parse(String(row.permissions)) as string[],
			isBuiltIn: false,
		}));

		return NextResponse.json({ ok: true, data: [...BUILT_IN, ...custom] });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list roles';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * POST /api/roles — Create or update a custom role.
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('roles', 'create');
		if ('error' in auth) return auth.error;

		const { name, description, permissions } = await request.json();
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Role name is required' } },
				{ status: 422 },
			);
		}

		if (BUILT_IN.some((r) => r.name === name)) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: 'Cannot modify built-in roles' } },
				{ status: 403 },
			);
		}

		await ensureTable();
		const db = getDb();
		await db.execute({
			sql: `INSERT OR REPLACE INTO "${ROLES_TABLE}" ("name","description","permissions") VALUES (?,?,?)`,
			args: [name.trim(), description ?? '', JSON.stringify(permissions ?? [])],
		});

		return NextResponse.json({
			ok: true,
			data: { name: name.trim(), description: description ?? '', permissions: permissions ?? [], isBuiltIn: false },
		}, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save role';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * DELETE /api/roles — Delete a custom role by name (JSON body).
 */
export async function DELETE(request: Request) {
	try {
		const auth = await requirePermission('roles', 'delete');
		if ('error' in auth) return auth.error;

		const { name } = await request.json();
		if (BUILT_IN.some((r) => r.name === name)) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: 'Cannot delete built-in roles' } },
				{ status: 403 },
			);
		}

		await ensureTable();
		const db = getDb();
		await db.execute({ sql: `DELETE FROM "${ROLES_TABLE}" WHERE "name" = ?`, args: [name] });
		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete role';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
