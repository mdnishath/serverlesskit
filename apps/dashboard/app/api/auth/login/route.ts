import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureAuthTables, verifyPassword, createSession } from '@/lib/auth';

/**
 * POST /api/auth/login — Authenticate with email and password.
 */
export async function POST(request: Request) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
				{ status: 422 },
			);
		}

		await ensureAuthTables();
		const db = getDb();

		const result = await db.execute({
			sql: `SELECT * FROM "_users" WHERE "email" = ?`,
			args: [email],
		});
		const user = result.rows[0];

		if (!user) {
			return NextResponse.json(
				{ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
				{ status: 401 },
			);
		}

		if (!user.isActive) {
			return NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: 'Account is deactivated' } },
				{ status: 403 },
			);
		}

		const valid = await verifyPassword(password, String(user.passwordHash));
		if (!valid) {
			return NextResponse.json(
				{ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
				{ status: 401 },
			);
		}

		await createSession(String(user.id));

		return NextResponse.json({
			ok: true,
			data: {
				id: String(user.id),
				name: String(user.name),
				email: String(user.email),
				role: String(user.role),
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Login failed';
		return NextResponse.json(
			{ ok: false, error: { code: 'INTERNAL_ERROR', message } },
			{ status: 500 },
		);
	}
}
