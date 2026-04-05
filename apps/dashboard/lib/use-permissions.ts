'use client';

import { useAuth } from './auth-context';

/**
 * Checks if a permission list grants a specific resource:action.
 */
export const hasPerm = (perms: string[], resource: string, action: string): boolean =>
	perms.some((p) =>
		p === '*' || p === `*:${action}` || p === `${resource}:*` || p === `${resource}:${action}`,
	);

/**
 * Hook that returns permission check helpers.
 * Reads from shared AuthProvider — NO separate API call.
 * @returns Permission helpers
 */
export const usePermissions = () => {
	const { user, loading } = useAuth();
	const perms = user?.permissions ?? [];

	return {
		me: user,
		loading,
		perms,
		can: (resource: string, action: string) => hasPerm(perms, resource, action),
		canRead: (resource: string) => hasPerm(perms, resource, 'read'),
		canCreate: (resource: string) => hasPerm(perms, resource, 'create'),
		canUpdate: (resource: string) => hasPerm(perms, resource, 'update'),
		canDelete: (resource: string) => hasPerm(perms, resource, 'delete'),
		canManage: (resource: string) => hasPerm(perms, resource, 'manage'),
	};
};
