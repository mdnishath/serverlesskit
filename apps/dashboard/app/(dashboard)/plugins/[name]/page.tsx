export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerAuth, serverHasPerm } from '@/lib/server-data';
import { getPluginDetail } from '@/lib/plugin-runtime';
import { PluginDetailClient } from './plugin-detail-client';
import { WebhookPage } from '@/components/plugin-pages/webhook-page';
import { AuditLogPage } from '@/components/plugin-pages/audit-log-page';
import { SlugGeneratorPage } from '@/components/plugin-pages/slug-generator-page';
import { SeoToolkitPage } from '@/components/plugin-pages/seo-toolkit-page';
import { SocialSharePage } from '@/components/plugin-pages/social-share-page';

/** Map of plugin names to their custom page components */
const CUSTOM_PAGES: Record<string, (props: { config: Record<string, unknown>; canManage: boolean }) => React.JSX.Element> = {
	webhook: (props) => <WebhookPage {...props} />,
	'audit-log': (props) => <AuditLogPage canManage={props.canManage} />,
	'slug-generator': () => <SlugGeneratorPage />,
	'seo-toolkit': (props) => <SeoToolkitPage {...props} />,
	'social-share': (props) => <SocialSharePage {...props} />,
};

/**
 * Server Component — routes to custom plugin page or generic detail page.
 * Plugins with custom pages get full WordPress-like UI.
 * Others get the auto-generated detail/settings page.
 */
export default async function PluginDetailPage({ params }: { params: Promise<{ name: string }> }) {
	const { name } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const plugin = await getPluginDetail(name);
	if (!plugin) redirect('/plugins');

	const canManage = serverHasPerm(auth.permissions, 'plugins', 'update');

	/* Check for custom plugin page */
	const customPage = CUSTOM_PAGES[name];
	if (customPage) return customPage({ config: plugin.config, canManage });

	/* Fallback to generic detail + settings page */
	return <PluginDetailClient plugin={plugin} canManage={canManage} />;
}
