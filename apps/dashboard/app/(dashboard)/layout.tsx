import type { ReactNode } from 'react';
import { getServerAuth, getCollectionsData } from '@/lib/server-data';
import { getActivePluginMenus } from '@/lib/plugin-runtime';
import { DashboardShell } from './dashboard-shell';

/**
 * Server Component layout — fetches auth, collections, and active plugin menus.
 * Passes all data to client shell for instant render.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const [auth, collections, pluginMenus] = await Promise.all([
		getServerAuth(),
		getCollectionsData(),
		getActivePluginMenus(),
	]);

	const initialUser = auth ? {
		id: auth.user.id,
		name: auth.user.name,
		email: auth.user.email,
		role: auth.user.role,
		permissions: auth.permissions,
	} : null;

	const initialCollections = collections.map((c) => ({ slug: c.slug, name: c.name }));

	return (
		<DashboardShell
			initialUser={initialUser}
			initialCollections={initialCollections}
			pluginMenus={pluginMenus}
		>
			{children}
		</DashboardShell>
	);
}
