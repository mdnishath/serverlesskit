'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'serverlesskit-theme';

/**
 * Gets the resolved theme based on system preference.
 * @param theme - The current theme setting
 * @returns 'light' or 'dark'
 */
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
	if (theme === 'system') {
		return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark' : 'light';
	}
	return theme;
};

/**
 * Applies the theme class to the document element.
 * @param resolved - The resolved theme
 */
const applyTheme = (resolved: 'light' | 'dark') => {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.remove('light', 'dark');
	document.documentElement.classList.add(resolved);
};

/**
 * Custom theme hook — replaces next-themes to avoid script injection warnings in Next.js 16.
 * @returns theme, setTheme, and resolvedTheme
 */
export const useTheme = () => {
	const [theme, setThemeState] = useState<Theme>('system');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial = stored ?? 'system';
		setThemeState(initial);
		applyTheme(resolveTheme(initial));
		setMounted(true);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
			if (current === 'system') applyTheme(resolveTheme('system'));
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		localStorage.setItem(STORAGE_KEY, next);
		applyTheme(resolveTheme(next));
	}, []);

	return {
		theme,
		setTheme,
		resolvedTheme: mounted ? resolveTheme(theme) : undefined,
		mounted,
	};
};
