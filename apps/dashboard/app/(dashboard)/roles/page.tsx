import { redirect } from 'next/navigation';
import { getServerAuth, getRolesData, getCollectionsData, serverHasPerm } from '@/lib/server-data';
import { RolesClient } from './roles-client';

/**
 * Server Component — fetches roles + collections at request time.
 * HTML arrives with data, no loading skeleton on reload.
 */
export default async function RolesPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const [roles, collections] = await Promise.all([
		serverHasPerm(auth.permissions, 'roles', 'read') ? getRolesData() : [],
		getCollectionsData(),
	]);

	return (
		<RolesClient
			initialRoles={roles}
			initialCollections={collections.map((c) => ({ slug: c.slug, name: c.name }))}
			permissions={auth.permissions}
		/>
	);
}
