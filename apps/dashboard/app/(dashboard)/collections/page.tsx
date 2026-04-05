import { redirect } from 'next/navigation';
import { getServerAuth, getCollectionsData, serverHasPerm } from '@/lib/server-data';
import { CollectionsClient } from './collections-client';

/**
 * Server Component — fetches collections data at request time.
 * HTML is sent with data embedded, so no loading skeleton on page load.
 */
export default async function CollectionsPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const collections = serverHasPerm(auth.permissions, 'collections', 'read')
		? await getCollectionsData()
		: [];

	return (
		<CollectionsClient
			initialCollections={collections}
			permissions={auth.permissions}
		/>
	);
}
