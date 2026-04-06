export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerAuth, serverHasPerm } from '@/lib/server-data';
import { getPluginDetail } from '@/lib/plugin-runtime';
import { PluginDetailClient } from './plugin-detail-client';
import { WebhookPage } from '@/components/plugin-pages/webhook-page';
import { AuditLogPage } from '@/components/plugin-pages/audit-log-page';
import { SlugGeneratorPage } from '@/components/plugin-pages/slug-generator-page';

/**
 * Server Component — routes to custom plugin page or generic detail page.
 * Built-in plugins get full custom React pages (like WordPress plugin pages).
 * Uploaded plugins get the auto-generated detail/settings page.
 */
export default async function PluginDetailPage({ params }: { params: Promise<{ name: string }> }) {
	const { name } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const plugin = await getPluginDetail(name);
	if (!plugin) redirect('/plugins');

	const canManage = serverHasPerm(auth.permissions, 'plugins', 'update');

	/* Built-in plugins have their own custom pages */
	if (name === 'webhook') return <WebhookPage config={plugin.config} canManage={canManage} />;
	if (name === 'audit-log') return <AuditLogPage canManage={canManage} />;
	if (name === 'slug-generator') return <SlugGeneratorPage />;

	/* Uploaded/unknown plugins get the generic detail + settings page */
	return <PluginDetailClient plugin={plugin} canManage={canManage} />;
}
