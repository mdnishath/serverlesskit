export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerAuth, serverHasPerm } from '@/lib/server-data';
import { getAllPluginsInfo } from '@/lib/plugin-runtime';
import { PluginsClient } from './plugins-client';

/**
 * Server Component — fetches plugins from runtime at request time.
 */
export default async function PluginsPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const plugins = serverHasPerm(auth.permissions, 'plugins', 'read')
		? await getAllPluginsInfo()
		: [];

	const canManage = serverHasPerm(auth.permissions, 'plugins', 'update');

	return <PluginsClient initialPlugins={plugins} canManage={canManage} />;
}
