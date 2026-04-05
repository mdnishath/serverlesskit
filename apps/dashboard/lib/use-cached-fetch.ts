'use client';

import { useState, useEffect, useRef } from 'react';

/** Simple in-memory cache shared across all hook instances */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

/**
 * Fetches data with client-side caching.
 * Shows cached data instantly (no skeleton), refreshes in background.
 * @param url - The API URL to fetch
 * @param deps - Additional dependency array for re-fetching
 * @returns data, loading (only true on first load with no cache), and refetch function
 */
export const useCachedFetch = <T>(url: string, deps: unknown[] = []) => {
	const cached = cache.get(url);
	const hasFreshCache = cached && (Date.now() - cached.timestamp) < CACHE_TTL;

	const [data, setData] = useState<T | null>(hasFreshCache ? (cached.data as T) : null);
	const [loading, setLoading] = useState(!hasFreshCache);
	const mountedRef = useRef(true);

	const fetchData = async () => {
		try {
			const res = await fetch(url);
			const json = await res.json();
			if (!mountedRef.current) return;
			if (json.ok) {
				cache.set(url, { data: json.data, timestamp: Date.now() });
				setData(json.data);
			}
		} catch { /* ignore */ }
		if (mountedRef.current) setLoading(false);
	};

	useEffect(() => {
		mountedRef.current = true;
		fetchData();
		return () => { mountedRef.current = false; };
	}, [url, ...deps]);

	const refetch = () => {
		cache.delete(url);
		setLoading(true);
		fetchData();
	};

	/** Invalidate cache for a URL pattern */
	const invalidate = (pattern?: string) => {
		if (pattern) {
			for (const key of cache.keys()) {
				if (key.includes(pattern)) cache.delete(key);
			}
		} else {
			cache.delete(url);
		}
	};

	return { data, loading, refetch, invalidate };
};
