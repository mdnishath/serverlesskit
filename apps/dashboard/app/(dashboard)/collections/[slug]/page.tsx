import { redirect } from 'next/navigation';
import { getServerAuth, getCollectionsData, getEntriesData, serverHasPerm } from '@/lib/server-data';
import { EntriesClient } from './entries-client';

/**
 * Server Component — fetches collection + entries at request time.
 * HTML arrives with data, no loading skeleton on reload.
 */
export default async function CollectionEntriesPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const [collections, entries] = await Promise.all([
		getCollectionsData(),
		serverHasPerm(auth.permissions, slug, 'read') ? getEntriesData(slug) : [],
	]);

	return (
		<EntriesClient
			slug={slug}
			initialCollections={collections}
			initialEntries={entries}
			permissions={auth.permissions}
		/>
	);
}
