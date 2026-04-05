'use client';

import type { ReactNode } from 'react';

/**
 * Theme provider — no-op wrapper.
 * Theme is now handled by the useTheme hook in lib/use-theme.ts,
 * avoiding the script injection warning from next-themes in Next.js 16.
 * @param props - Provider props with children
 * @returns Children without wrapping
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	return <>{children}</>;
};
