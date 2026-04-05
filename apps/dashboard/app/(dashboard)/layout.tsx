import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { CacheWarmer } from '@/components/cache-warmer';

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<AuthProvider>
			<CacheWarmer />
			<div className="flex h-screen overflow-hidden">
				<Sidebar />
				<div className="flex flex-1 flex-col overflow-hidden">
					<Header />
					<main className="flex-1 overflow-y-auto p-6">{children}</main>
				</div>
			</div>
		</AuthProvider>
	);
}
