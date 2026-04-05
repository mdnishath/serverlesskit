import { prefetchUrl } from './use-cached-fetch';

/**
 * Maps a dashboard route path to its required API URLs and prefetches them.
 * Call on hover/focus to warm the cache before navigation.
 * @param path - The dashboard route path (e.g. '/collections', '/users')
 */
export const prefetchRoute = (path: string) => {
	if (path === '/') return;

	if (path === '/collections') {
		prefetchUrl('/api/collections');
		return;
	}

	if (path === '/users') {
		prefetchUrl('/api/users');
		prefetchUrl('/api/roles');
		return;
	}

	if (path === '/media') {
		prefetchUrl('/api/media');
		return;
	}

	if (path === '/roles') {
		prefetchUrl('/api/roles');
		prefetchUrl('/api/collections');
		return;
	}

	/* Dynamic collection entries: /collections/{slug} */
	const slugMatch = path.match(/^\/collections\/([^/]+)$/);
	if (slugMatch) {
		prefetchUrl('/api/collections');
		prefetchUrl(`/api/content/${slugMatch[1]}?limit=100`);
		return;
	}
};

/**
 * Prefetches all major dashboard API endpoints on first load.
 * Call once after login to warm the entire cache in the background.
 */
export const prefetchAll = () => {
	prefetchUrl('/api/collections');
	prefetchUrl('/api/users');
	prefetchUrl('/api/roles');
	prefetchUrl('/api/media');
};
