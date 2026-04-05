import type { ReactNode } from 'react';
import { Header } from '@/components/header';
import { getServerAuth, getCollectionsData } from '@/lib/server-data';
import { DashboardShell } from './dashboard-shell';

/**
 * Server Component layout — fetches auth + collections from DB.
 * Passes data to client shell for instant sidebar + header render.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const [auth, collections] = await Promise.all([
		getServerAuth(),
		getCollectionsData(),
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
		<DashboardShell initialUser={initialUser} initialCollections={initialCollections}>
			{children}
		</DashboardShell>
	);
}
