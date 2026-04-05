import type { Result } from '@serverlesskit/shared/result';
import { appError, fail, ok } from '@serverlesskit/shared/result';

/** Metadata for an uploaded file */
export type MediaMeta = {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	createdAt: string;
};

/** Interface that all storage adapters must implement */
export type StorageAdapter = {
	/** Uploads a file and returns its metadata */
	upload: (file: { name: string; type: string; size: number; data: ArrayBuffer }) => Promise<Result<MediaMeta>>;
	/** Deletes a file by its ID */
	delete: (id: string) => Promise<Result<void>>;
	/** Gets the public URL for a file */
	getUrl: (id: string) => string;
	/** Lists all uploaded files */
	list: () => Promise<Result<MediaMeta[]>>;
};

/** Allowed file type categories */
export const ALLOWED_TYPES: Record<string, string[]> = {
	image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
	video: ['video/mp4', 'video/webm'],
	document: [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	],
	audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
};

/** All allowed MIME types flattened */
export const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat();

/**
 * Validates a file before upload.
 * @param file - The file to validate
 * @param maxSize - Maximum allowed size in bytes
 * @param allowedTypes - Allowed MIME types (defaults to all)
 * @returns Result indicating validity
 */
export const validateFile = (
	file: { type: string; size: number },
	maxSize: number,
	allowedTypes: string[] = ALL_ALLOWED_TYPES,
): Result<void> => {
	if (!allowedTypes.includes(file.type)) {
		return fail(appError('VALIDATION_ERROR', `File type "${file.type}" is not allowed`));
	}
	if (file.size > maxSize) {
		const maxMb = Math.round(maxSize / 1024 / 1024);
		return fail(appError('VALIDATION_ERROR', `File size exceeds ${maxMb}MB limit`));
	}
	return ok(undefined);
};

/**
 * Gets the file type category from a MIME type.
 * @param mimeType - The MIME type to categorize
 * @returns The category name (image, video, document, audio) or "other"
 */
export const getFileCategory = (mimeType: string): string => {
	for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
		if (types.includes(mimeType)) return category;
	}
	return 'other';
};
