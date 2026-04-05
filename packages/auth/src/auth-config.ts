import { API_KEY_PREFIX_LIVE, API_KEY_PREFIX_TEST } from '@serverlesskit/shared/constants';
import { nanoid } from 'nanoid';

/** Auth system configuration */
export type AuthConfig = {
	/** Secret used for signing tokens */
	secret: string;
	/** Session duration in seconds (default: 7 days) */
	sessionDuration?: number;
	/** API key hash algorithm */
	hashAlgorithm?: string;
};

/**
 * Generates a new API key with the appropriate prefix.
 * @param isLive - Whether this is a live (production) key
 * @returns Object with the raw key (show once) and the prefix for display
 */
export const generateApiKey = (isLive: boolean): { rawKey: string; prefix: string } => {
	const prefix = isLive ? API_KEY_PREFIX_LIVE : API_KEY_PREFIX_TEST;
	const secret = nanoid(32);
	const rawKey = `${prefix}${secret}`;
	return {
		rawKey,
		prefix: `${prefix}${secret.slice(0, 4)}...${secret.slice(-4)}`,
	};
};

/**
 * Hashes an API key for secure storage.
 * Uses Web Crypto API (available in all serverless runtimes).
 * @param key - The raw API key to hash
 * @returns The hex-encoded SHA-256 hash
 */
export const hashApiKey = async (key: string): Promise<string> => {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verifies an API key against a stored hash.
 * @param rawKey - The raw API key from the request
 * @param storedHash - The stored hash to verify against
 * @returns True if the key matches
 */
export const verifyApiKey = async (rawKey: string, storedHash: string): Promise<boolean> => {
	const hash = await hashApiKey(rawKey);
	return hash === storedHash;
};

/** Default auth configuration values */
export const DEFAULT_AUTH_CONFIG: Required<AuthConfig> = {
	secret: '',
	sessionDuration: 7 * 24 * 60 * 60,
	hashAlgorithm: 'SHA-256',
};
