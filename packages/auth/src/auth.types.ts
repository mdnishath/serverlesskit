/** Standard CRUD actions */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'manage';

/**
 * A permission string in the format "resource:action" or "resource:action:field".
 * Supports wildcards: "*" matches all resources/actions.
 * Examples: "posts:create", "posts:update:title", "*:read", "*"
 */
export type PermissionString = string;

/** Role definition */
export type RoleDefinition = {
	name: string;
	description: string;
	permissions: PermissionString[];
};

/** Stored user record */
export type User = {
	id: string;
	email: string;
	name: string;
	role: string;
	avatarUrl?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

/** Session data attached to a request */
export type Session = {
	userId: string;
	role: string;
	expiresAt: string;
};

/** API key record */
export type ApiKey = {
	id: string;
	/** The key prefix shown to the user (e.g. sk_live_abc...xyz) */
	prefix: string;
	/** The hashed key stored in the database */
	hashedKey: string;
	userId: string;
	label: string;
	permissions: PermissionString[];
	isLive: boolean;
	createdAt: string;
	lastUsedAt?: string;
};

/** Auth context passed through middleware */
export type AuthContext = {
	user: User;
	session: Session;
	/** Pre-computed permission map for O(1) checks */
	permissionMap: Set<string>;
};
