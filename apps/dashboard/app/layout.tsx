import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { CommandSearch } from '@/components/command-search';
import './globals.css';

export const metadata: Metadata = {
	title: 'ServerlessKit Dashboard',
	description: 'Serverless-first data management system',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-screen antialiased">
				<ThemeProvider>
						<CommandSearch />
						{children}
					</ThemeProvider>
			</body>
		</html>
	);
}
