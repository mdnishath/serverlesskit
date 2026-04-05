import { redirect } from 'next/navigation';
import { getServerAuth, getUsersData, getRolesData, serverHasPerm } from '@/lib/server-data';
import { UsersClient } from './users-client';

/**
 * Server Component — fetches users + roles at request time.
 * HTML arrives with data, no loading skeleton on reload.
 */
export default async function UsersPage() {
	const auth = await getServerAuth();
	if (!auth) redirect('/login');

	const [users, roles] = await Promise.all([
		serverHasPerm(auth.permissions, 'users', 'read') ? getUsersData() : [],
		getRolesData(),
	]);

	return (
		<UsersClient
			initialUsers={users}
			initialRoles={roles.map((r) => r.name)}
			currentUser={{ id: auth.user.id, role: auth.user.role }}
		/>
	);
}
