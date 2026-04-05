import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { BUILT_IN_ROLES } from '@serverlesskit/auth/rbac';

/**
 * GET /api/auth/me — Get the currently authenticated user with their permissions.
 */
export async function GET() {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
			{ status: 401 },
		);
	}

	let permissions: string[] = [];
	const builtIn = BUILT_IN_ROLES[user.role];
	if (builtIn) {
		permissions = [...builtIn.permissions];
	} else {
		try {
			const db = getDb();
			const result = await db.execute({ sql: `SELECT "permissions" FROM "_roles" WHERE "name" = ?`, args: [user.role] });
			if (result.rows[0]) permissions = JSON.parse(String(result.rows[0].permissions));
		} catch { permissions = ['*:read']; }
	}

	return NextResponse.json({ ok: true, data: { ...user, permissions } });
}
