import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';

/** Vercel-specific adapter configuration */
export type VercelAdapterConfig = {
	adapter: 'vercel';
	/** Turso database URL */
	databaseUrl: string;
	/** Turso auth token */
	databaseToken: string;
	/** Storage provider for media */
	storage?: 'vercel-blob' | 's3';
	/** Custom Vercel region */
	region?: string;
};

/** Vercel serverless function request/response types */
export type VercelRequest = {
	method: string;
	url: string;
	headers: Record<string, string | undefined>;
	body?: unknown;
};

export type VercelResponse = {
	status: number;
	headers: Record<string, string>;
	body: string;
};

/**
 * Creates a Vercel-compatible request handler from ServerlessKit route handlers.
 * @param config - Vercel adapter configuration
 * @returns An adapter object with handler and config
 */
export const createVercelAdapter = (config: VercelAdapterConfig) => {
	/**
	 * Converts a standard Request to a simplified handler input.
	 * @param request - Web standard Request
	 * @returns Parsed request object
	 */
	const parseRequest = async (request: Request): Promise<VercelRequest> => {
		const url = new URL(request.url);
		const headers: Record<string, string | undefined> = {};
		request.headers.forEach((value, key) => {
			headers[key] = value;
		});

		let body: unknown = undefined;
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			try {
				body = await request.json();
			} catch {
				// no body or non-JSON
			}
		}

		return {
			method: request.method,
			url: url.pathname + url.search,
			headers,
			body,
		};
	};

	/**
	 * Creates a standard Response from handler output.
	 * @param status - HTTP status code
	 * @param body - Response body object
	 * @returns Web standard Response
	 */
	const createResponse = (status: number, body: unknown): Response => {
		return new Response(JSON.stringify(body), {
			status,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
				'X-Powered-By': 'ServerlessKit',
			},
		});
	};

	return {
		name: 'vercel' as const,
		config,
		parseRequest,
		createResponse,

		/**
		 * Gets the database config for this adapter.
		 * @returns Database connection config
		 */
		getDatabaseConfig: () => ({
			provider: 'turso' as const,
			url: config.databaseUrl,
			authToken: config.databaseToken,
		}),

		/**
		 * Generates vercel.json configuration.
		 * @returns Vercel config object
		 */
		generateConfig: (): Record<string, unknown> => ({
			framework: 'nextjs',
			regions: config.region ? [config.region] : undefined,
			functions: {
				'api/**': { maxDuration: 30 },
			},
		}),
	};
};

/**
 * Validates Vercel adapter configuration.
 * @param config - Config to validate
 * @returns Result indicating validity
 */
export const validateVercelConfig = (config: VercelAdapterConfig): Result<void> => {
	if (!config.databaseUrl) {
		return fail(appError('VALIDATION_ERROR', 'databaseUrl is required for Vercel adapter'));
	}
	if (!config.databaseToken) {
		return fail(appError('VALIDATION_ERROR', 'databaseToken is required for Vercel adapter'));
	}
	return ok(undefined);
};
