'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Theme provider wrapper for dark mode support.
 * @param props - Provider props with children
 * @returns ThemeProvider component
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	return (
		<NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
			{children}
		</NextThemesProvider>
	);
};
