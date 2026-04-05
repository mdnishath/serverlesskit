import { getCurrentUser, ensureAuthTables } from './auth';
import { getDb } from './db';
import { getAllCollections } from './schema-store';
import { buildPermissionMap, hasPermission } from '@serverlesskit/auth/permissions';
import { BUILT_IN_ROLES } from '@serverlesskit/auth/rbac';
import type { DbUser } from './auth';

/**
 * Gets the permission strings for a role (built-in first, then DB).
 * @param roleName - The role name
 * @returns Array of permission strings
 */
export const getRolePermissions = async (roleName: string): Promise<string[]> => {
	const builtIn = BUILT_IN_ROLES[roleName];
	if (builtIn) return [...builtIn.permissions];
	try {
		const db = getDb();
		const result = await db.execute({
			sql: `SELECT "permissions" FROM "_roles" WHERE "name" = ?`,
			args: [roleName],
		});
		if (result.rows[0]) return JSON.parse(String(result.rows[0].permissions)) as string[];
	} catch { /* table may not exist */ }
	return ['*:read'];
};

/** Auth result returned to server components */
export type ServerAuth = {
	user: DbUser;
	permissions: string[];
} | null;

/**
 * Gets the current authenticated user with permissions.
 * Safe to call in Server Components.
 * @returns User + permissions, or null if not authenticated
 */
export const getServerAuth = async (): Promise<ServerAuth> => {
	const user = await getCurrentUser();
	if (!user) return null;
	const permissions = await getRolePermissions(user.role);
	return { user, permissions };
};

/** Checks if user has permission */
export const serverHasPerm = (permissions: string[], resource: string, action: string): boolean => {
	const map = buildPermissionMap(permissions);
	return hasPermission(map, resource, action);
};

/**
 * Fetches collections data server-side.
 * @returns Array of collection summaries
 */
export const getCollectionsData = async () => {
	const collections = await getAllCollections();
	return collections.map((c) => ({
		name: c.name,
		slug: c.slug,
		description: c.description ?? '',
		fieldCount: Object.keys(c.fields).length,
		timestamps: c.timestamps,
		softDelete: c.softDelete,
		fields: c.fields,
	}));
};

/**
 * Fetches all users server-side.
 * @returns Array of user records
 */
export const getUsersData = async () => {
	await ensureAuthTables();
	const db = getDb();
	const result = await db.execute(
		`SELECT "id","name","email","role","isActive","createdAt" FROM "_users" ORDER BY "createdAt" DESC`,
	);
	return result.rows.map((row) => ({
		id: String(row.id),
		name: String(row.name),
		email: String(row.email),
		role: String(row.role),
		isActive: Boolean(row.isActive),
		createdAt: String(row.createdAt),
	}));
};

/** Built-in roles constant for server-side use */
const BUILT_IN = [
	{ name: 'super-admin', description: 'Full system access', permissions: ['*'] as string[], isBuiltIn: true },
	{ name: 'admin', description: 'Manage content and users', permissions: ['*:create', '*:read', '*:update', '*:delete', '*:manage'], isBuiltIn: true },
	{ name: 'editor', description: 'Can manage content', permissions: ['*:read', '*:create', '*:update', 'media:*'], isBuiltIn: true },
	{ name: 'viewer', description: 'Read-only access', permissions: ['*:read'], isBuiltIn: true },
];

/**
 * Fetches all roles (built-in + custom) server-side.
 * @returns Array of role definitions
 */
export const getRolesData = async () => {
	const db = getDb();
	try {
		await db.execute(`CREATE TABLE IF NOT EXISTS "_roles" ("name" TEXT PRIMARY KEY NOT NULL, "description" TEXT NOT NULL DEFAULT '', "permissions" TEXT NOT NULL DEFAULT '[]')`);
		const result = await db.execute(`SELECT * FROM "_roles"`);
		const custom = result.rows.map((row) => ({
			name: String(row.name),
			description: String(row.description),
			permissions: JSON.parse(String(row.permissions)) as string[],
			isBuiltIn: false,
		}));
		return [...BUILT_IN, ...custom];
	} catch {
		return [...BUILT_IN];
	}
};

/**
 * Fetches all media items server-side.
 * @returns Array of media records
 */
export const getMediaData = async () => {
	const db = getDb();
	try {
		await db.execute(`CREATE TABLE IF NOT EXISTS "_media" ("id" TEXT PRIMARY KEY NOT NULL, "filename" TEXT NOT NULL, "originalName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "url" TEXT NOT NULL, "createdAt" TEXT NOT NULL)`);
		const result = await db.execute(`SELECT * FROM "_media" ORDER BY "createdAt" DESC`);
		return result.rows.map((row) => ({
			id: String(row.id),
			filename: String(row.filename),
			originalName: String(row.originalName),
			mimeType: String(row.mimeType),
			size: Number(row.size),
			url: String(row.url),
			createdAt: String(row.createdAt),
		}));
	} catch {
		return [];
	}
};

/**
 * Fetches entries for a collection server-side.
 * @param slug - Collection slug
 * @param limit - Max entries to return
 * @returns Array of entries
 */
export const getEntriesData = async (slug: string, limit = 100): Promise<Array<{ id: string; [key: string]: unknown }>> => {
	const db = getDb();
	try {
		const result = await db.execute({
			sql: `SELECT * FROM "${slug}" ORDER BY "createdAt" DESC LIMIT ?`,
			args: [limit],
		});
		return result.rows.map((row) => {
			const entry: Record<string, unknown> = {};
			for (const key of Object.keys(row)) {
				entry[key] = row[key];
			}
			return entry as { id: string; [key: string]: unknown };
		});
	} catch {
		return [];
	}
};

/**
 * Fetches a single entry by ID server-side.
 * @param slug - Collection slug
 * @param id - Entry ID
 * @returns Entry record or null
 */
export const getEntryData = async (slug: string, id: string) => {
	const db = getDb();
	try {
		const result = await db.execute({
			sql: `SELECT * FROM "${slug}" WHERE "id" = ?`,
			args: [id],
		});
		const row = result.rows[0];
		if (!row) return null;
		const entry: Record<string, unknown> = {};
		for (const key of Object.keys(row)) {
			entry[key] = row[key];
		}
		return entry;
	} catch {
		return null;
	}
};
