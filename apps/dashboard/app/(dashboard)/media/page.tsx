import { redirect } from 'next/navigation';
import { getServerAuth, getMediaData, serverHasPerm } from '@/lib/server-data';
import { MediaClient } from './media-client';

/**
 * Server Component — fetches media data at request time.
 * HTML arrives with data, no loading skeleton on reload.
 */
export default async function MediaPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const media = serverHasPerm(auth.permissions, 'media', 'read')
		? await getMediaData()
		: [];

	return (
		<MediaClient
			initialMedia={media}
			permissions={auth.permissions}
		/>
	);
}
