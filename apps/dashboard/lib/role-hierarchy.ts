/**
 * Role hierarchy — higher number = more power.
 * super-admin can manage everyone.
 * admin can manage admin, editor, viewer.
 * editor/viewer cannot manage any users.
 */
const ROLE_LEVELS: Record<string, number> = {
	'super-admin': 100,
	admin: 80,
	editor: 40,
	viewer: 10,
};

/**
 * Gets the power level for a role. Custom roles default to viewer level.
 * @param role - The role name
 * @returns Numeric power level
 */
export const getRoleLevel = (role: string): number => {
	return ROLE_LEVELS[role] ?? 10;
};

/**
 * Checks if the actor's role can manage the target's role.
 * A role can only manage roles with strictly lower power levels.
 * @param actorRole - The acting user's role
 * @param targetRole - The target user's role
 * @returns True if actor can manage target
 */
export const canManageRole = (actorRole: string, targetRole: string): boolean => {
	return getRoleLevel(actorRole) > getRoleLevel(targetRole);
};

/**
 * Checks if a role has access to admin features (content types, users, roles, settings).
 * Only super-admin and admin can access admin pages.
 * @param role - The role name
 * @returns True if role has admin access
 */
export const isAdminRole = (role: string): boolean => {
	return getRoleLevel(role) >= ROLE_LEVELS.admin;
};

/**
 * Gets the list of roles that an actor can assign to users.
 * Can only assign roles with lower power level than own.
 * @param actorRole - The acting user's role
 * @param allRoles - All available role names
 * @returns Filtered list of assignable role names
 */
export const getAssignableRoles = (actorRole: string, allRoles: string[]): string[] => {
	const actorLevel = getRoleLevel(actorRole);
	return allRoles.filter((r) => getRoleLevel(r) < actorLevel);
};
