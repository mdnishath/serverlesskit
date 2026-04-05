import type { Action, PermissionString } from './auth.types.js';

/**
 * Parses a permission string into its components.
 * @param permission - Permission string (e.g. "posts:create", "*:read", "posts:update:title")
 * @returns Parsed components { resource, action, field }
 */
export const parsePermission = (
	permission: PermissionString,
): { resource: string; action: string; field?: string } => {
	const parts = permission.split(':');
	return {
		resource: parts[0] ?? '*',
		action: parts[1] ?? '*',
		field: parts[2],
	};
};

/**
 * Expands a list of permission strings into a flat Set for O(1) lookups.
 * Handles wildcards: "*" expands to all resources/actions.
 * @param permissions - Array of permission strings
 * @returns A Set of expanded permission keys
 */
export const buildPermissionMap = (permissions: PermissionString[]): Set<string> => {
	const map = new Set<string>();

	for (const perm of permissions) {
		map.add(perm);

		const { resource, action } = parsePermission(perm);

		if (resource === '*' && action === '*') {
			map.add('*');
		}
		if (resource === '*') {
			map.add(`*:${action}`);
		}
		if (action === '*') {
			map.add(`${resource}:*`);
		}
	}

	return map;
};

/**
 * Checks if a permission map grants access for a given resource and action.
 * Supports wildcard matching at resource and action levels.
 * @param permissionMap - The pre-computed permission map
 * @param resource - The resource to check (e.g. "posts")
 * @param action - The action to check (e.g. "create")
 * @returns True if permission is granted
 */
export const hasPermission = (
	permissionMap: Set<string>,
	resource: string,
	action: Action | string,
): boolean => {
	if (permissionMap.has('*')) return true;
	if (permissionMap.has(`${resource}:${action}`)) return true;
	if (permissionMap.has(`*:${action}`)) return true;
	if (permissionMap.has(`${resource}:*`)) return true;
	if (permissionMap.has('*:*')) return true;
	return false;
};

/**
 * Checks if a permission map grants field-level access.
 * Falls back to resource:action check if no field-level permissions exist.
 * @param permissionMap - The pre-computed permission map
 * @param resource - The resource (e.g. "posts")
 * @param action - The action (e.g. "update")
 * @param field - The specific field (e.g. "title")
 * @returns True if field-level permission is granted
 */
export const hasFieldPermission = (
	permissionMap: Set<string>,
	resource: string,
	action: Action | string,
	field: string,
): boolean => {
	if (hasPermission(permissionMap, resource, action)) return true;
	if (permissionMap.has(`${resource}:${action}:${field}`)) return true;
	return false;
};

/**
 * Gets the list of accessible fields for a resource+action.
 * If the user has full resource:action access, returns null (all fields).
 * @param permissionMap - The pre-computed permission map
 * @param resource - The resource (e.g. "posts")
 * @param action - The action (e.g. "update")
 * @param allFields - All available fields for the resource
 * @returns Array of accessible field names, or null if all fields are accessible
 */
export const getAccessibleFields = (
	permissionMap: Set<string>,
	resource: string,
	action: Action | string,
	allFields: string[],
): string[] | null => {
	if (hasPermission(permissionMap, resource, action)) {
		return null;
	}

	return allFields.filter((field) => permissionMap.has(`${resource}:${action}:${field}`));
};
