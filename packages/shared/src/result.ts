/**
 * Standardized error type for the entire application.
 * Used as the default error type in Result.
 */
export type AppError = {
	/** Machine-readable error code (e.g., VALIDATION_ERROR, NOT_FOUND) */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Additional error details (field errors, stack trace, etc.) */
	details?: unknown;
};

/** Successful result containing data */
export type Success<T> = {
	ok: true;
	data: T;
};

/** Failed result containing an error */
export type Failure<E = AppError> = {
	ok: false;
	error: E;
};

/**
 * A discriminated union representing either a success or failure.
 * Used throughout the application instead of throwing exceptions.
 */
export type Result<T, E = AppError> = Success<T> | Failure<E>;

/**
 * Creates a successful Result.
 * @param data - The success payload
 * @returns A Success result
 */
export const ok = <T>(data: T): Success<T> => ({
	ok: true,
	data,
});

/**
 * Creates a failed Result.
 * @param error - The error payload
 * @returns A Failure result
 */
export const fail = <E = AppError>(error: E): Failure<E> => ({
	ok: false,
	error,
});

/**
 * Creates an AppError with the given properties.
 * @param code - Machine-readable error code
 * @param message - Human-readable message
 * @param details - Optional additional details
 * @returns An AppError object
 */
export const appError = (code: string, message: string, details?: unknown): AppError => ({
	code,
	message,
	...(details !== undefined && { details }),
});

/**
 * Wraps an async function and catches exceptions, returning a Result.
 * @param fn - The async function to wrap
 * @returns A Result containing either the return value or an AppError
 */
export const tryCatch = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
	try {
		const data = await fn();
		return ok(data);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return fail(appError('UNEXPECTED_ERROR', message, error));
	}
};
