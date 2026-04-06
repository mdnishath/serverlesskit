import { redirect } from 'next/navigation';
import { getServerAuth, getCollectionsData, getEntryData, serverHasPerm } from '@/lib/server-data';
import { getDb } from '@/lib/db';
import { EntryEditorClient } from './entry-editor-client';

/**
 * Checks if the serverlesskit-seo plugin is active.
 */
const isSeoPluginActive = async (): Promise<boolean> => {
	try {
		const db = getDb();
		const result = await db.execute(`SELECT "enabled" FROM "_plugins" WHERE "name" = 'serverlesskit-seo'`);
		return result.rows.length > 0 && Number(result.rows[0].enabled) === 1;
	} catch { return false; }
};

/**
 * Server Component — fetches collection schema + entry data + SEO status.
 */
export default async function EntryEditorPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
	const { slug, id } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const [collections, entry, seoEnabled] = await Promise.all([
		getCollectionsData(),
		id !== 'new' && serverHasPerm(auth.permissions, slug, 'read') ? getEntryData(slug, id) : null,
		isSeoPluginActive(),
	]);

	return (
		<EntryEditorClient
			slug={slug}
			entryId={id}
			initialCollections={collections}
			initialEntry={entry}
			permissions={auth.permissions}
			seoEnabled={seoEnabled}
		/>
	);
}
