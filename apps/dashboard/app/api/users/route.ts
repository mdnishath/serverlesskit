import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureAuthTables, hashPassword, getCurrentUser } from '@/lib/auth';
import { requirePermission } from '@/lib/api-auth';
import { canManageRole, getAssignableRoles, getRoleLevel } from '@/lib/role-hierarchy';

/**
 * GET /api/users — List all users.
 */
export async function GET() {
	try {
		const auth = await requirePermission('users', 'read');
		if ('error' in auth) return auth.error;

		await ensureAuthTables();
		const db = getDb();
		const result = await db.execute(
			`SELECT "id","name","email","role","isActive","createdAt" FROM "_users" ORDER BY "createdAt" DESC`,
		);
		const data = result.rows.map((row) => ({
			id: String(row.id),
			name: String(row.name),
			email: String(row.email),
			role: String(row.role),
			isActive: Boolean(row.isActive),
			createdAt: String(row.createdAt),
		}));
		return NextResponse.json({ ok: true, data });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list users';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * POST /api/users — Create a new user (respects role hierarchy).
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('users', 'create');
		if ('error' in auth) return auth.error;

		const { name, email, role, password } = await request.json();

		if (!email || !email.includes('@')) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email is required' } },
				{ status: 422 },
			);
		}

		const targetRole = role || 'viewer';

		if (!canManageRole(auth.user.role, targetRole)) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: `You cannot create users with role "${targetRole}"` } },
				{ status: 403 },
			);
		}

		if (!password || password.length < 6) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } },
				{ status: 422 },
			);
		}

		await ensureAuthTables();
		const db = getDb();
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const passwordHash = await hashPassword(password);

		await db.execute({
			sql: `INSERT INTO "_users" ("id","name","email","passwordHash","role","isActive","createdAt") VALUES (?,?,?,?,?,?,?)`,
			args: [id, name || email.split('@')[0], email, passwordHash, targetRole, 1, now],
		});

		return NextResponse.json({
			ok: true,
			data: { id, name: name || email.split('@')[0], email, role: targetRole, isActive: true, createdAt: now },
		}, { status: 201 });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to create user';
		if (msg.includes('UNIQUE')) {
			return NextResponse.json(
				{ ok: false, error: { code: 'CONFLICT', message: 'A user with this email already exists' } },
				{ status: 409 },
			);
		}
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}

/**
 * PATCH /api/users — Update a user (name, email, role, password, isActive).
 */
export async function PATCH(request: Request) {
	try {
		const auth = await requirePermission('users', 'update');
		if ('error' in auth) return auth.error;

		const { id, name, email, role, password, isActive } = await request.json();
		if (!id) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'User id is required' } },
				{ status: 400 },
			);
		}

		await ensureAuthTables();
		const db = getDb();

		const targetResult = await db.execute({ sql: `SELECT * FROM "_users" WHERE "id" = ?`, args: [id] });
		const target = targetResult.rows[0];
		if (!target) {
			return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
		}

		const isSelf = auth.user.id === id;
		const targetRole = String(target.role);

		if (!isSelf && !canManageRole(auth.user.role, targetRole)) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: `You cannot modify a "${targetRole}" user` } },
				{ status: 403 },
			);
		}

		if (role && role !== targetRole && !canManageRole(auth.user.role, role)) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: `You cannot assign role "${role}"` } },
				{ status: 403 },
			);
		}

		if (isSelf && role && role !== auth.user.role) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: 'You cannot change your own role' } },
				{ status: 403 },
			);
		}

		const updates: string[] = [];
		const args: (string | number | null)[] = [];

		if (name !== undefined) { updates.push('"name" = ?'); args.push(name); }
		if (email !== undefined) { updates.push('"email" = ?'); args.push(email); }
		if (role !== undefined && !isSelf) { updates.push('"role" = ?'); args.push(role); }
		if (isActive !== undefined && !isSelf) { updates.push('"isActive" = ?'); args.push(isActive ? 1 : 0); }
		if (password && password.length >= 6) {
			const hash = await hashPassword(password);
			updates.push('"passwordHash" = ?');
			args.push(hash);
		}

		if (updates.length === 0) {
			return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nothing to update' } }, { status: 400 });
		}

		args.push(id);
		await db.execute({ sql: `UPDATE "_users" SET ${updates.join(', ')} WHERE "id" = ?`, args });

		return NextResponse.json({ ok: true, data: { id } });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to update user';
		if (msg.includes('UNIQUE')) {
			return NextResponse.json({ ok: false, error: { code: 'CONFLICT', message: 'Email already in use' } }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
	}
}

/**
 * DELETE /api/users — Delete a user (respects role hierarchy).
 */
export async function DELETE(request: Request) {
	try {
		const auth = await requirePermission('users', 'delete');
		if ('error' in auth) return auth.error;

		const { id } = await request.json();

		if (auth.user.id === id) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: 'You cannot delete your own account' } },
				{ status: 403 },
			);
		}

		await ensureAuthTables();
		const db = getDb();

		const targetResult = await db.execute({ sql: `SELECT "role" FROM "_users" WHERE "id" = ?`, args: [id] });
		const target = targetResult.rows[0];
		if (!target) {
			return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
		}

		if (!canManageRole(auth.user.role, String(target.role))) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: `You cannot delete a "${target.role}" user` } },
				{ status: 403 },
			);
		}

		await db.execute({ sql: `DELETE FROM "_sessions" WHERE "userId" = ?`, args: [id] });
		await db.execute({ sql: `DELETE FROM "_users" WHERE "id" = ?`, args: [id] });

		return NextResponse.json({ ok: true, data: null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete user';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
