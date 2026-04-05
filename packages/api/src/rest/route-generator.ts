import { hasPermission } from '@serverlesskit/auth/permissions';
import type { AuthContext } from '@serverlesskit/auth/types';
import { createEntry, deleteEntry, findMany, findOne, updateEntry } from '@serverlesskit/core/crud';
import type { RouteDeps, RouteHandler } from '../api.types.js';
import { parseQueryParams } from './query-parser.js';
import { created, error, errorCodeToStatus, paginated, success } from './response.js';

/**
 * Checks auth and permission for a route. Returns AuthContext or error response.
 * @param deps - Route dependencies
 * @param headers - Request headers
 * @param action - The CRUD action to check
 * @returns AuthContext if authorized, or null if no auth is configured
 */
const checkAuth = async (
	deps: RouteDeps,
	headers: Record<string, string | undefined>,
	action: string,
): Promise<{ ctx: AuthContext | null; errorResponse?: ReturnType<typeof error> }> => {
	if (!deps.getAuthContext) {
		return { ctx: null };
	}

	const ctx = await deps.getAuthContext(headers);
	if (!ctx) {
		return { ctx: null, errorResponse: error(401, 'UNAUTHORIZED', 'Authentication required') };
	}

	if (!hasPermission(ctx.permissionMap, deps.collection.slug, action)) {
		return {
			ctx,
			errorResponse: error(403, 'FORBIDDEN', `No permission for ${deps.collection.slug}:${action}`),
		};
	}

	return { ctx };
};

/**
 * Generates a handler for GET /api/content/{collection} (list entries).
 * @param deps - Route dependencies
 * @returns A RouteHandler for listing entries
 */
export const generateListHandler = (deps: RouteDeps): RouteHandler => {
	return async (request) => {
		const { errorResponse } = await checkAuth(deps, request.headers, 'read');
		if (errorResponse) return errorResponse;

		const start = Date.now();
		const options = parseQueryParams(request.query);
		const result = await findMany(deps.crud, deps.collection, options);

		if (!result.ok) {
			return error(errorCodeToStatus(result.error.code), result.error.code, result.error.message);
		}

		return paginated(result.data.data, result.data.pagination, Date.now() - start);
	};
};

/**
 * Generates a handler for GET /api/content/{collection}/:id (get single entry).
 * @param deps - Route dependencies
 * @returns A RouteHandler for getting a single entry
 */
export const generateGetHandler = (deps: RouteDeps): RouteHandler => {
	return async (request) => {
		const { errorResponse } = await checkAuth(deps, request.headers, 'read');
		if (errorResponse) return errorResponse;

		const result = await findOne(deps.crud, deps.collection, request.params.id ?? '');

		if (!result.ok) {
			return error(errorCodeToStatus(result.error.code), result.error.code, result.error.message);
		}
		if (!result.data) {
			return error(404, 'NOT_FOUND', 'Entry not found');
		}

		return success(result.data);
	};
};

/**
 * Generates a handler for POST /api/content/{collection} (create entry).
 * @param deps - Route dependencies
 * @returns A RouteHandler for creating entries
 */
export const generateCreateHandler = (deps: RouteDeps): RouteHandler => {
	return async (request) => {
		const { ctx, errorResponse } = await checkAuth(deps, request.headers, 'create');
		if (errorResponse) return errorResponse;

		const context = ctx ? { userId: ctx.user.id, role: ctx.user.role } : {};
		const result = await createEntry(
			deps.crud,
			deps.collection,
			request.body ?? {},
			context,
			deps.hooks,
		);

		if (!result.ok) {
			return error(
				errorCodeToStatus(result.error.code),
				result.error.code,
				result.error.message,
				result.error.details,
			);
		}

		return created(result.data);
	};
};

/**
 * Generates a handler for PUT/PATCH /api/content/{collection}/:id (update entry).
 * @param deps - Route dependencies
 * @returns A RouteHandler for updating entries
 */
export const generateUpdateHandler = (deps: RouteDeps): RouteHandler => {
	return async (request) => {
		const { ctx, errorResponse } = await checkAuth(deps, request.headers, 'update');
		if (errorResponse) return errorResponse;

		const context = ctx ? { userId: ctx.user.id, role: ctx.user.role } : {};
		const id = request.params.id ?? '';
		const result = await updateEntry(
			deps.crud,
			deps.collection,
			id,
			request.body ?? {},
			context,
			deps.hooks,
		);

		if (!result.ok) {
			return error(
				errorCodeToStatus(result.error.code),
				result.error.code,
				result.error.message,
				result.error.details,
			);
		}

		return success(result.data);
	};
};

/**
 * Generates a handler for DELETE /api/content/{collection}/:id (delete entry).
 * @param deps - Route dependencies
 * @returns A RouteHandler for deleting entries
 */
export const generateDeleteHandler = (deps: RouteDeps): RouteHandler => {
	return async (request) => {
		const { ctx, errorResponse } = await checkAuth(deps, request.headers, 'delete');
		if (errorResponse) return errorResponse;

		const context = ctx ? { userId: ctx.user.id, role: ctx.user.role } : {};
		const id = request.params.id ?? '';
		const result = await deleteEntry(deps.crud, deps.collection, id, context, deps.hooks);

		if (!result.ok) {
			return error(errorCodeToStatus(result.error.code), result.error.code, result.error.message);
		}

		return { status: 204, body: { ok: true as const, data: null } };
	};
};

/**
 * Generates all REST route handlers for a collection.
 * @param deps - Route dependencies
 * @returns Map of method+pattern to handler
 */
export const generateRoutes = (deps: RouteDeps): Record<string, RouteHandler> => {
	const base = `/api/v1/content/${deps.collection.slug}`;

	return {
		[`GET ${base}`]: generateListHandler(deps),
		[`GET ${base}/:id`]: generateGetHandler(deps),
		[`POST ${base}`]: generateCreateHandler(deps),
		[`PUT ${base}/:id`]: generateUpdateHandler(deps),
		[`PATCH ${base}/:id`]: generateUpdateHandler(deps),
		[`DELETE ${base}/:id`]: generateDeleteHandler(deps),
	};
};
