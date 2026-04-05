'use client';

import { useEffect } from 'react';
import { prefetchAll } from '@/lib/prefetch';

/**
 * Invisible component that warms the API cache on dashboard mount.
 * Prefetches collections, users, roles, and media data in the background
 * so subsequent page navigations are instant.
 * @returns null (renders nothing)
 */
export const CacheWarmer = () => {
	useEffect(() => { prefetchAll(); }, []);
	return null;
};
