import type { Action, AuthContext, RoleDefinition } from './auth.types.js';
import {
	buildPermissionMap,
	getAccessibleFields,
	hasFieldPermission,
	hasPermission,
} from './permissions.js';

/**
 * Creates a role definition.
 * @param config - Role name, description, and permissions
 * @returns A frozen RoleDefinition
 */
export const defineRole = (config: RoleDefinition): Readonly<RoleDefinition> => {
	return Object.freeze({ ...config });
};

/** Super admin — full system access */
export const ROLE_SUPER_ADMIN = defineRole({
	name: 'super-admin',
	description: 'Full system access',
	permissions: ['*'],
});

/** Admin — manage content and users */
export const ROLE_ADMIN = defineRole({
	name: 'admin',
	description: 'Manage content and users',
	permissions: ['*:create', '*:read', '*:update', '*:delete', '*:manage'],
});

/** Editor — manage content */
export const ROLE_EDITOR = defineRole({
	name: 'editor',
	description: 'Can manage content',
	permissions: ['*:read', '*:create', '*:update', 'media:*'],
});

/** Viewer — read-only access */
export const ROLE_VIEWER = defineRole({
	name: 'viewer',
	description: 'Read-only access',
	permissions: ['*:read'],
});

/** All built-in roles indexed by name */
export const BUILT_IN_ROLES: Record<string, RoleDefinition> = {
	'super-admin': ROLE_SUPER_ADMIN,
	admin: ROLE_ADMIN,
	editor: ROLE_EDITOR,
	viewer: ROLE_VIEWER,
};

/**
 * Creates a role registry for managing custom + built-in roles.
 * @returns A registry with methods to add, get, and list roles
 */
export const createRoleRegistry = () => {
	const roles = new Map<string, RoleDefinition>(Object.entries(BUILT_IN_ROLES));

	return {
		/**
		 * Adds or updates a role in the registry.
		 * @param role - The role definition
		 */
		add: (role: RoleDefinition): void => {
			roles.set(role.name, defineRole(role));
		},

		/**
		 * Gets a role definition by name.
		 * @param name - The role name
		 * @returns The role definition or undefined
		 */
		get: (name: string): RoleDefinition | undefined => {
			return roles.get(name);
		},

		/**
		 * Lists all registered roles.
		 * @returns Array of all role definitions
		 */
		getAll: (): RoleDefinition[] => {
			return Array.from(roles.values());
		},

		/**
		 * Removes a role (cannot remove built-in roles).
		 * @param name - The role name to remove
		 * @returns True if removed
		 */
		remove: (name: string): boolean => {
			if (BUILT_IN_ROLES[name]) return false;
			return roles.delete(name);
		},
	};
};

/**
 * Checks if an auth context has permission for a resource+action.
 * @param ctx - The auth context with pre-computed permission map
 * @param resource - The resource (e.g. "posts")
 * @param action - The action (e.g. "create")
 * @returns True if permitted
 */
export const checkPermission = (
	ctx: AuthContext,
	resource: string,
	action: Action | string,
): boolean => {
	return hasPermission(ctx.permissionMap, resource, action);
};

/**
 * Checks if an auth context has field-level permission.
 * @param ctx - The auth context
 * @param resource - The resource
 * @param action - The action
 * @param field - The specific field
 * @returns True if permitted
 */
export const checkFieldPermission = (
	ctx: AuthContext,
	resource: string,
	action: Action | string,
	field: string,
): boolean => {
	return hasFieldPermission(ctx.permissionMap, resource, action, field);
};

/**
 * Gets accessible fields for a user in a given resource+action context.
 * @param ctx - The auth context
 * @param resource - The resource
 * @param action - The action
 * @param allFields - All available fields
 * @returns Array of accessible fields, or null if all are accessible
 */
export const getContextAccessibleFields = (
	ctx: AuthContext,
	resource: string,
	action: Action | string,
	allFields: string[],
): string[] | null => {
	return getAccessibleFields(ctx.permissionMap, resource, action, allFields);
};

/**
 * Creates an AuthContext from a user and role definition.
 * Pre-computes the permission map for O(1) permission checks.
 * @param user - The user record
 * @param role - The role definition
 * @param session - The session data
 * @returns A fully populated AuthContext
 */
export const createAuthContext = (
	user: AuthContext['user'],
	role: RoleDefinition,
	session: AuthContext['session'],
): AuthContext => {
	return {
		user,
		session,
		permissionMap: buildPermissionMap(role.permissions),
	};
};
