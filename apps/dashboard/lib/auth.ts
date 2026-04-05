import { cookies } from 'next/headers';
import { getDb } from './db';

const USERS_TABLE = '_users';
const SESSIONS_TABLE = '_sessions';
const SESSION_COOKIE = 'sk_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Ensures auth-related tables exist.
 */
export const ensureAuthTables = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${USERS_TABLE}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"name" TEXT NOT NULL,
			"email" TEXT NOT NULL UNIQUE,
			"passwordHash" TEXT NOT NULL,
			"role" TEXT NOT NULL DEFAULT 'viewer',
			"isActive" INTEGER NOT NULL DEFAULT 1,
			"createdAt" TEXT NOT NULL
		);
	`);
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${SESSIONS_TABLE}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"userId" TEXT NOT NULL,
			"expiresAt" TEXT NOT NULL
		);
	`);
};

/**
 * Hashes a password using PBKDF2 (Web Crypto — works everywhere, no native deps).
 * @param password - Plain text password
 * @returns Hash string in format "salt:hash"
 */
export const hashPassword = async (password: string): Promise<string> => {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
	);
	const hashBuffer = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		keyMaterial, 256,
	);
	const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
	const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
	return `${saltHex}:${hashHex}`;
};

/**
 * Verifies a password against a stored hash.
 * @param password - Plain text password
 * @param stored - Stored hash in format "salt:hash"
 * @returns True if password matches
 */
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
	const [saltHex, expectedHash] = stored.split(':');
	if (!saltHex || !expectedHash) return false;
	const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => Number.parseInt(b, 16)));
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
	);
	const hashBuffer = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		keyMaterial, 256,
	);
	const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashHex === expectedHash;
};

/** User record from DB */
export type DbUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	createdAt: string;
};

/**
 * Creates a new session for a user and sets the httpOnly cookie.
 * @param userId - The user ID
 * @returns The session token
 */
export const createSession = async (userId: string): Promise<string> => {
	const db = getDb();
	const sessionId = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

	await db.execute({
		sql: `INSERT INTO "${SESSIONS_TABLE}" ("id", "userId", "expiresAt") VALUES (?, ?, ?)`,
		args: [sessionId, userId, expiresAt],
	});

	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_DURATION_MS / 1000,
	});

	return sessionId;
};

/**
 * Gets the current user from the session cookie.
 * @returns The user record or null if not authenticated
 */
export const getCurrentUser = async (): Promise<DbUser | null> => {
	try {
		const cookieStore = await cookies();
		const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
		if (!sessionId) return null;

		await ensureAuthTables();
		const db = getDb();

		const sessionResult = await db.execute({
			sql: `SELECT * FROM "${SESSIONS_TABLE}" WHERE "id" = ?`,
			args: [sessionId],
		});
		const session = sessionResult.rows[0];
		if (!session) return null;

		if (new Date(String(session.expiresAt)) < new Date()) {
			await db.execute({ sql: `DELETE FROM "${SESSIONS_TABLE}" WHERE "id" = ?`, args: [sessionId] });
			return null;
		}

		const userResult = await db.execute({
			sql: `SELECT "id","name","email","role","isActive","createdAt" FROM "${USERS_TABLE}" WHERE "id" = ?`,
			args: [String(session.userId)],
		});
		const user = userResult.rows[0];
		if (!user || !user.isActive) return null;

		return {
			id: String(user.id),
			name: String(user.name),
			email: String(user.email),
			role: String(user.role),
			isActive: Boolean(user.isActive),
			createdAt: String(user.createdAt),
		};
	} catch {
		return null;
	}
};

/**
 * Destroys the current session.
 */
export const destroySession = async (): Promise<void> => {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
	if (sessionId) {
		const db = getDb();
		await db.execute({ sql: `DELETE FROM "${SESSIONS_TABLE}" WHERE "id" = ?`, args: [sessionId] });
	}
	cookieStore.delete(SESSION_COOKIE);
};
