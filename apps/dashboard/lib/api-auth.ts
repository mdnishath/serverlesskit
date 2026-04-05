import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { getDb } from './db';
import { buildPermissionMap, hasPermission } from '@serverlesskit/auth/permissions';
import { BUILT_IN_ROLES } from '@serverlesskit/auth/rbac';
import type { DbUser } from './auth';

/**
 * Gets the permission strings for a role (checks built-in first, then DB).
 * @param roleName - The role name
 * @returns Array of permission strings
 */
const getRolePermissions = async (roleName: string): Promise<string[]> => {
	const builtIn = BUILT_IN_ROLES[roleName];
	if (builtIn) return [...builtIn.permissions];

	try {
		const db = getDb();
		const result = await db.execute({
			sql: `SELECT "permissions" FROM "_roles" WHERE "name" = ?`,
			args: [roleName],
		});
		if (result.rows[0]) {
			return JSON.parse(String(result.rows[0].permissions)) as string[];
		}
	} catch { /* table may not exist yet */ }

	return ['*:read'];
};

/**
 * Checks auth and RBAC permission for an API route.
 * Returns the user if authorized, or an error response.
 * @param resource - The resource to check (e.g. "collections", "posts")
 * @param action - The action to check (e.g. "read", "create", "delete")
 * @returns User or error response
 */
export const requirePermission = async (
	resource: string,
	action: string,
): Promise<{ user: DbUser } | { error: NextResponse }> => {
	const user = await getCurrentUser();
	if (!user) {
		return {
			error: NextResponse.json(
				{ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 },
			),
		};
	}

	const permissions = await getRolePermissions(user.role);
	const permissionMap = buildPermissionMap(permissions);

	if (!hasPermission(permissionMap, resource, action)) {
		return {
			error: NextResponse.json(
				{ ok: false, error: { code: 'FORBIDDEN', message: `No permission for ${resource}:${action}` } },
				{ status: 403 },
			),
		};
	}

	return { user };
};
