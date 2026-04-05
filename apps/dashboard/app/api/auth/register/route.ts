import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureAuthTables, hashPassword, createSession } from '@/lib/auth';

/**
 * POST /api/auth/register — Create a new account and start a session.
 * First user always becomes super-admin. Subsequent users get the default role
 * set in _settings, or registration may be disabled entirely.
 */
export async function POST(request: Request) {
	try {
		const { name, email, password } = await request.json();

		if (!email || !email.includes('@')) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email is required' } },
				{ status: 422 },
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

		const existing = await db.execute({ sql: `SELECT "id" FROM "_users" WHERE "email" = ?`, args: [email] });
		if (existing.rows.length > 0) {
			return NextResponse.json(
				{ ok: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' } },
				{ status: 409 },
			);
		}

		const id = crypto.randomUUID();
		const passwordHash = await hashPassword(password);
		const now = new Date().toISOString();

		const countResult = await db.execute('SELECT COUNT(*) as c FROM "_users"');
		const isFirstUser = Number(countResult.rows[0]?.c ?? 0) === 0;

		if (!isFirstUser) {
			// Check if registration is enabled
			try {
				const settingsResult = await db.execute(
					`SELECT "value" FROM "_settings" WHERE "key" = 'registration_enabled'`,
				);
				const regEnabled = settingsResult.rows[0]?.value;
				if (regEnabled === 'false') {
					return NextResponse.json(
						{ ok: false, error: { code: 'FORBIDDEN', message: 'Registration is disabled. Contact an administrator.' } },
						{ status: 403 },
					);
				}
			} catch { /* _settings table may not exist yet, allow registration */ }
		}

		let role = 'viewer';
		if (isFirstUser) {
			role = 'super-admin';
		} else {
			try {
				const roleResult = await db.execute(
					`SELECT "value" FROM "_settings" WHERE "key" = 'default_registration_role'`,
				);
				if (roleResult.rows[0]?.value) role = String(roleResult.rows[0].value);
			} catch { /* use default viewer */ }
		}

		await db.execute({
			sql: `INSERT INTO "_users" ("id","name","email","passwordHash","role","isActive","createdAt") VALUES (?,?,?,?,?,?,?)`,
			args: [id, name || email.split('@')[0], email, passwordHash, role, 1, now],
		});

		await createSession(id);

		return NextResponse.json({
			ok: true,
			data: { id, name: name || email.split('@')[0], email, role },
		}, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Registration failed';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
