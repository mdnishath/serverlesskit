import { redirect } from 'next/navigation';
import { getServerAuth, getCollectionsData, getEntryData, serverHasPerm } from '@/lib/server-data';
import { EntryEditorClient } from './entry-editor-client';

/**
 * Server Component — fetches collection schema + entry data at request time.
 * HTML arrives with data, no loading skeleton on reload.
 */
export default async function EntryEditorPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
	const { slug, id } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const collections = await getCollectionsData();
	const entry = id !== 'new' && serverHasPerm(auth.permissions, slug, 'read')
		? await getEntryData(slug, id)
		: null;

	return (
		<EntryEditorClient
			slug={slug}
			entryId={id}
			initialCollections={collections}
			initialEntry={entry}
			permissions={auth.permissions}
		/>
	);
}
