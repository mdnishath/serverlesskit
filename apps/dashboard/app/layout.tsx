import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { CommandSearch } from '@/components/command-search';
import './globals.css';

export const metadata: Metadata = {
	title: 'ServerlessKit Dashboard',
	description: 'Serverless-first data management system',
};

/**
 * Inline script that runs before React hydration to prevent theme flash.
 * Reads the saved theme from localStorage and applies dark/light class
 * to <html> immediately, before any CSS paints.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('serverlesskit-theme') || 'system';
    var d = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.classList.toggle('dark', d);
    document.documentElement.classList.toggle('light', !d);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className="min-h-screen antialiased">
				<ThemeProvider>
					<CommandSearch />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
