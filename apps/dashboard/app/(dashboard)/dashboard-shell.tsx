'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { CacheWarmer } from '@/components/cache-warmer';

type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	permissions: string[];
};

type ContentType = { slug: string; name: string };

/**
 * Client shell that wraps the dashboard with auth context, sidebar, and header.
 * Receives server-fetched data so everything renders instantly on page load.
 * @param props - initialUser, initialCollections, children
 */
export const DashboardShell = ({
	initialUser,
	initialCollections,
	children,
}: {
	initialUser: AuthUser | null;
	initialCollections: ContentType[];
	children: ReactNode;
}) => {
	return (
		<AuthProvider initialUser={initialUser}>
			<CacheWarmer />
			<div className="flex h-screen overflow-hidden">
				<Sidebar initialCollections={initialCollections} />
				<div className="flex flex-1 flex-col overflow-hidden">
					<Header />
					<main className="flex-1 overflow-y-auto p-6">{children}</main>
				</div>
			</div>
		</AuthProvider>
	);
};
