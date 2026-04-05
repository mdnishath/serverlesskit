import { HTTP_STATUS } from '@serverlesskit/shared/constants';
import type { PaginationMeta } from '@serverlesskit/shared/types';
import type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from '../api.types.js';

/** Response with HTTP status code */
export type HttpResponse<T = unknown> = {
	status: number;
	body: ApiResponse<T>;
};

/**
 * Creates a success response.
 * @param data - The response payload
 * @param meta - Optional metadata (timing, version, etc.)
 * @returns HttpResponse with 200 status
 */
export const success = <T>(data: T, meta?: Record<string, unknown>): HttpResponse<T> => ({
	status: HTTP_STATUS.OK,
	body: {
		ok: true,
		data,
		...(meta && { meta }),
	} satisfies ApiSuccessResponse<T>,
});

/**
 * Creates a created response (201).
 * @param data - The created resource
 * @returns HttpResponse with 201 status
 */
export const created = <T>(data: T): HttpResponse<T> => ({
	status: HTTP_STATUS.CREATED,
	body: { ok: true, data } satisfies ApiSuccessResponse<T>,
});

/**
 * Creates an error response.
 * @param status - HTTP status code
 * @param code - Machine-readable error code
 * @param message - Human-readable message
 * @param details - Optional error details
 * @returns HttpResponse with error body
 */
export const error = (
	status: number,
	code: string,
	message: string,
	details?: unknown,
): HttpResponse<never> => ({
	status,
	body: {
		ok: false,
		error: { code, message, ...(details !== undefined && { details }) },
	} satisfies ApiErrorResponse,
});

/**
 * Creates a paginated response.
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param durationMs - Optional request duration in ms
 * @returns HttpResponse with paginated data
 */
export const paginated = <T>(
	data: T[],
	pagination: PaginationMeta,
	durationMs?: number,
): HttpResponse<T[]> => ({
	status: HTTP_STATUS.OK,
	body: {
		ok: true,
		data,
		meta: {
			pagination,
			...(durationMs !== undefined && { durationMs }),
		},
	} satisfies ApiSuccessResponse<T[]>,
});

/**
 * Maps common error codes to HTTP status codes.
 * @param code - The AppError code
 * @returns The appropriate HTTP status code
 */
export const errorCodeToStatus = (code: string): number => {
	const mapping: Record<string, number> = {
		VALIDATION_ERROR: HTTP_STATUS.UNPROCESSABLE_ENTITY,
		NOT_FOUND: HTTP_STATUS.NOT_FOUND,
		UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
		FORBIDDEN: HTTP_STATUS.FORBIDDEN,
		CONFLICT: HTTP_STATUS.CONFLICT,
		RATE_LIMITED: HTTP_STATUS.TOO_MANY_REQUESTS,
		DB_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
		INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
	};
	return mapping[code] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
};
