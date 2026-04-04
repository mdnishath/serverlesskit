/** Current version of ServerlessKit */
export const VERSION = '0.1.0';

/** Application display name */
export const APP_NAME = 'ServerlessKit';

/** Default pagination limit */
export const DEFAULT_PAGE_LIMIT = 25;

/** Maximum allowed pagination limit */
export const MAX_PAGE_LIMIT = 100;

/** Default page number */
export const DEFAULT_PAGE = 1;

/** Length of generated nanoid primary keys */
export const NANOID_LENGTH = 21;

/** Prefix for live API keys */
export const API_KEY_PREFIX_LIVE = 'sk_live_';

/** Prefix for test API keys */
export const API_KEY_PREFIX_TEST = 'sk_test_';

/** System table prefix for internal tables */
export const SYSTEM_TABLE_PREFIX = '_';

/** Maximum file upload size in bytes (50MB) */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/** HTTP status codes used throughout the app */
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
} as const;

/** Standard error codes */
export const ERROR_CODES = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	CONFLICT: 'CONFLICT',
	RATE_LIMITED: 'RATE_LIMITED',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	ENV_VALIDATION_ERROR: 'ENV_VALIDATION_ERROR',
	UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;
