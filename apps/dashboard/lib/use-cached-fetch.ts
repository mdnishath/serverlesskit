'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/** Cache entry with data and timestamp */
type CacheEntry = { data: unknown; timestamp: number };

/** In-memory cache shared across all hook instances */
const cache = new Map<string, CacheEntry>();

/** In-flight request deduplication map */
const inflight = new Map<string, Promise<unknown>>();

/** Cache TTL — 10 minutes (stale data is background-refreshed anyway) */
const CACHE_TTL = 10 * 60_000;

/** Listeners for cache updates — allows components to re-render on prefetch */
const listeners = new Map<string, Set<() => void>>();

/**
 * Subscribes to cache updates for a URL.
 * @param url - The URL to subscribe to
 * @param cb - Callback invoked when cache is updated
 * @returns Unsubscribe function
 */
const subscribe = (url: string, cb: () => void): (() => void) => {
	if (!listeners.has(url)) listeners.set(url, new Set());
	listeners.get(url)!.add(cb);
	return () => { listeners.get(url)?.delete(cb); };
};

/** Notifies all subscribers of a cache update */
const notify = (url: string) => {
	listeners.get(url)?.forEach((cb) => cb());
};

/**
 * Fetches a URL with deduplication. Returns cached JSON data.
 * If a request for the same URL is already in-flight, reuses that promise.
 * @param url - API URL to fetch
 * @returns Parsed data from the response, or null on error
 */
const deduplicatedFetch = async (url: string): Promise<unknown> => {
	const existing = inflight.get(url);
	if (existing) return existing;

	const promise = fetch(url)
		.then((res) => res.json())
		.then((json) => {
			if (json.ok) {
				cache.set(url, { data: json.data, timestamp: Date.now() });
				notify(url);
				return json.data;
			}
			return null;
		})
		.catch(() => null)
		.finally(() => { inflight.delete(url); });

	inflight.set(url, promise);
	return promise;
};

/**
 * Prefetches a URL into the cache without a component.
 * Skips if fresh data already exists in cache.
 * @param url - API URL to prefetch
 */
export const prefetchUrl = (url: string) => {
	const entry = cache.get(url);
	if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) return;
	deduplicatedFetch(url);
};

/**
 * Fetches data with client-side caching and stale-while-revalidate.
 * Shows cached data instantly (no skeleton), refreshes in background.
 * Deduplicates concurrent requests for the same URL.
 * @param url - The API URL to fetch
 * @param deps - Additional dependency array for re-fetching
 * @returns data, loading (only true on first load with no cache), refetch, and invalidate
 */
export const useCachedFetch = <T>(url: string, deps: unknown[] = []) => {
	const cached = cache.get(url);
	const hasCache = !!cached;

	const [data, setData] = useState<T | null>(hasCache ? (cached.data as T) : null);
	const [loading, setLoading] = useState(!hasCache);
	const mountedRef = useRef(true);

	const fetchData = useCallback(async () => {
		const result = await deduplicatedFetch(url);
		if (!mountedRef.current) return;
		if (result !== null) setData(result as T);
		setLoading(false);
	}, [url]);

	/* Subscribe to external cache updates (e.g. from prefetch) */
	useEffect(() => {
		return subscribe(url, () => {
			const entry = cache.get(url);
			if (entry) setData(entry.data as T);
		});
	}, [url]);

	useEffect(() => {
		mountedRef.current = true;
		/* Always background-refresh, even if cached */
		fetchData();
		return () => { mountedRef.current = false; };
	}, [url, ...deps]);

	const refetch = useCallback(() => {
		cache.delete(url);
		setLoading(true);
		fetchData();
	}, [url, fetchData]);

	/** Invalidate cache for a URL pattern */
	const invalidate = useCallback((pattern?: string) => {
		if (pattern) {
			for (const key of cache.keys()) {
				if (key.includes(pattern)) cache.delete(key);
			}
		} else {
			cache.delete(url);
		}
	}, [url]);

	return { data, loading, refetch, invalidate };
};
