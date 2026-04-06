export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerAuth, serverHasPerm } from '@/lib/server-data';
import { getPluginDetail } from '@/lib/plugin-runtime';
import { PluginDetailClient } from './plugin-detail-client';

/**
 * Server Component — fetches plugin detail from runtime.
 */
export default async function PluginDetailPage({ params }: { params: Promise<{ name: string }> }) {
	const { name } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const plugin = await getPluginDetail(name);
	if (!plugin) redirect('/plugins');

	const canManage = serverHasPerm(auth.permissions, 'plugins', 'update');

	return <PluginDetailClient plugin={plugin} canManage={canManage} />;
}
