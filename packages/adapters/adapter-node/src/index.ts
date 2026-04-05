import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

/** Node.js adapter configuration */
export type NodeAdapterConfig = {
	adapter: 'node';
	/** Server port (default: 3000) */
	port?: number;
	/** Server host (default: 0.0.0.0) */
	host?: string;
	/** Database file path for local SQLite */
	databasePath?: string;
	/** Turso URL for remote database */
	databaseUrl?: string;
	/** Turso auth token */
	databaseToken?: string;
};

/** Parsed HTTP request */
type ParsedRequest = {
	method: string;
	url: string;
	headers: Record<string, string | undefined>;
	body?: unknown;
};

/**
 * Parses an incoming Node.js HTTP request.
 * @param req - Node.js IncomingMessage
 * @returns Parsed request object
 */
const parseNodeRequest = (req: IncomingMessage): Promise<ParsedRequest> => {
	return new Promise((resolve) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => {
			let body: unknown = undefined;
			if (chunks.length > 0) {
				try {
					body = JSON.parse(Buffer.concat(chunks).toString());
				} catch {
					// non-JSON body
				}
			}
			const headers: Record<string, string | undefined> = {};
			for (const [key, value] of Object.entries(req.headers)) {
				headers[key] = Array.isArray(value) ? value[0] : value;
			}
			resolve({
				method: req.method ?? 'GET',
				url: req.url ?? '/',
				headers,
				body,
			});
		});
	});
};

/**
 * Sends a JSON response via Node.js ServerResponse.
 * @param res - Node.js ServerResponse
 * @param status - HTTP status code
 * @param body - Response body
 */
const sendResponse = (res: ServerResponse, status: number, body: unknown): void => {
	const json = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(json),
		'Cache-Control': 'no-store',
		'X-Powered-By': 'ServerlessKit',
	});
	res.end(json);
};

/** Route handler type */
type RouteHandler = (req: ParsedRequest) => Promise<{ status: number; body: unknown }>;

/**
 * Creates a self-hosted Node.js HTTP server for ServerlessKit.
 * @param config - Node adapter configuration
 * @returns Server control methods
 */
export const createNodeAdapter = (config: NodeAdapterConfig) => {
	const port = config.port ?? 3000;
	const host = config.host ?? '0.0.0.0';
	const routes = new Map<string, RouteHandler>();

	return {
		name: 'node' as const,
		config,

		/**
		 * Registers a route handler.
		 * @param pattern - "METHOD /path" pattern
		 * @param handler - The route handler
		 */
		addRoute: (pattern: string, handler: RouteHandler): void => {
			routes.set(pattern, handler);
		},

		/**
		 * Gets the database config for this adapter.
		 * @returns Database connection config
		 */
		getDatabaseConfig: () => {
			if (config.databaseUrl && config.databaseToken) {
				return {
					provider: 'turso' as const,
					url: config.databaseUrl,
					authToken: config.databaseToken,
				};
			}
			return {
				provider: 'local' as const,
				url: config.databasePath ?? 'file:./data.db',
			};
		},

		/**
		 * Starts the HTTP server.
		 * @returns The HTTP server instance
		 */
		start: () => {
			const server = createServer(async (req, res) => {
				const parsed = await parseNodeRequest(req);
				const routeKey = `${parsed.method} ${parsed.url?.split('?')[0]}`;

				const handler = routes.get(routeKey);
				if (handler) {
					try {
						const result = await handler(parsed);
						sendResponse(res, result.status, result.body);
					} catch {
						sendResponse(res, 500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
					}
				} else {
					sendResponse(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
				}
			});

			server.listen(port, host);
			return server;
		},

		/**
		 * Generates Docker-related configuration files content.
		 * @returns Dockerfile and docker-compose.yml content
		 */
		generateDockerConfig: (): { dockerfile: string; compose: string } => ({
			dockerfile: [
				'FROM node:20-slim',
				'WORKDIR /app',
				'COPY package.json pnpm-lock.yaml ./',
				'RUN corepack enable && pnpm install --frozen-lockfile --prod',
				'COPY . .',
				'RUN pnpm build',
				'EXPOSE 3000',
				'CMD ["node", "dist/index.js"]',
			].join('\n'),
			compose: [
				'version: "3.8"',
				'services:',
				'  app:',
				'    build: .',
				`    ports:`,
				`      - "${port}:${port}"`,
				'    environment:',
				'      - NODE_ENV=production',
				'    restart: unless-stopped',
			].join('\n'),
		}),
	};
};

/**
 * Validates Node adapter configuration.
 * @param config - Config to validate
 * @returns Result indicating validity
 */
export const validateNodeConfig = (config: NodeAdapterConfig): Result<void> => {
	if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
		return fail(appError('VALIDATION_ERROR', 'Port must be between 1 and 65535'));
	}
	return ok(undefined);
};
