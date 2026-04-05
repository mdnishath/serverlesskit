import type { AuthContext } from '@serverlesskit/auth/types';
import type { CrudDeps } from '@serverlesskit/core/crud';
import type { HookManager } from '@serverlesskit/core/hooks';
import type { CollectionDefinition } from '@serverlesskit/core/schema';

/** HTTP methods supported by generated routes */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A standardized API success response */
export type ApiSuccessResponse<T = unknown> = {
	ok: true;
	data: T;
	meta?: Record<string, unknown>;
};

/** A standardized API error response */
export type ApiErrorResponse = {
	ok: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
};

/** Union of all API response shapes */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Dependencies needed by route handlers */
export type RouteDeps = {
	crud: CrudDeps;
	collection: CollectionDefinition;
	hooks?: HookManager;
	getAuthContext?: (headers: Record<string, string | undefined>) => Promise<AuthContext | null>;
};

/** A generated route handler function */
export type RouteHandler = (request: {
	method: HttpMethod;
	params: Record<string, string>;
	query: Record<string, string>;
	body?: Record<string, unknown>;
	headers: Record<string, string | undefined>;
}) => Promise<{ status: number; body: ApiResponse }>;
