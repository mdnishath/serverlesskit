export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerAuth, serverHasPerm } from '@/lib/server-data';
import { getPluginsFromDb } from '@/lib/plugin-runtime';
import { PluginsClient } from './plugins-client';

/**
 * Server Component — reads plugin state directly from DB (not singleton).
 * This avoids stale in-memory state when dev server has multiple workers.
 */
export default async function PluginsPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const plugins = serverHasPerm(auth.permissions, 'plugins', 'read')
		? await getPluginsFromDb()
		: [];

	const canManage = serverHasPerm(auth.permissions, 'plugins', 'update');

	return <PluginsClient initialPlugins={plugins} canManage={canManage} />;
}
