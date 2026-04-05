'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
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
 * Client shell with mobile-responsive sidebar drawer.
 * On desktop: fixed sidebar. On mobile: hamburger + slide-out overlay.
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
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<AuthProvider initialUser={initialUser}>
			<CacheWarmer />
			<div className="flex h-screen overflow-hidden">
				{/* Mobile overlay */}
				{mobileOpen && (
					<div
						className="fixed inset-0 z-40 bg-black/50 md:hidden"
						onClick={() => setMobileOpen(false)}
					/>
				)}

				{/* Sidebar — hidden on mobile, slide-in when mobileOpen */}
				<div className={`
					fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0
					${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
				`}>
					<Sidebar initialCollections={initialCollections} onNavigate={() => setMobileOpen(false)} />
				</div>

				<div className="flex flex-1 flex-col overflow-hidden">
					<Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
					<main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
				</div>
			</div>
		</AuthProvider>
	);
};
