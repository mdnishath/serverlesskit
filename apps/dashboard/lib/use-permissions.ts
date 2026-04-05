'use client';

import { useState, useEffect } from 'react';

type MeData = {
	id: string;
	name: string;
	email: string;
	role: string;
	permissions: string[];
};

/**
 * Checks if a permission list grants a specific resource:action.
 * @param perms - Permission strings array
 * @param resource - Resource name (e.g. "users", "pages")
 * @param action - Action name (e.g. "read", "create", "delete")
 * @returns True if permitted
 */
export const hasPerm = (perms: string[], resource: string, action: string): boolean =>
	perms.some((p) =>
		p === '*' || p === `*:${action}` || p === `${resource}:*` || p === `${resource}:${action}`,
	);

/**
 * Hook that fetches the current user and their permissions.
 * Returns permission check helpers.
 * @returns User data, loading state, and permission helpers
 */
export const usePermissions = () => {
	const [me, setMe] = useState<MeData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/auth/me')
			.then((r) => r.json())
			.then((json) => { if (json.ok) setMe(json.data); })
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const perms = me?.permissions ?? [];

	return {
		me,
		loading,
		perms,
		/** Check if user can perform action on resource */
		can: (resource: string, action: string) => hasPerm(perms, resource, action),
		/** Check if user can read a resource */
		canRead: (resource: string) => hasPerm(perms, resource, 'read'),
		/** Check if user can create in a resource */
		canCreate: (resource: string) => hasPerm(perms, resource, 'create'),
		/** Check if user can update in a resource */
		canUpdate: (resource: string) => hasPerm(perms, resource, 'update'),
		/** Check if user can delete from a resource */
		canDelete: (resource: string) => hasPerm(perms, resource, 'delete'),
		/** Check if user can manage a resource */
		canManage: (resource: string) => hasPerm(perms, resource, 'manage'),
	};
};
