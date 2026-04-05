'use client';

import { useState } from 'react';
import { Plus, Search, User, Mail, Trash2, Pencil, Key, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCachedFetch } from '@/lib/use-cached-fetch';

type UserRecord = {
	id: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	createdAt: string;
};

type CurrentUser = { id: string; role: string };

const ROLE_COLORS: Record<string, string> = {
	'super-admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
	editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const ROLE_LEVELS: Record<string, number> = { 'super-admin': 100, admin: 80, editor: 40, viewer: 10 };
const getLevel = (r: string) => ROLE_LEVELS[r] ?? 10;

const formatDate = (iso: string) => {
	const d = new Date(iso);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Client component for users page.
 * Receives server-fetched data for instant render on reload.
 * @param props - initialUsers, initialRoles, currentUser
 */
export const UsersClient = ({
	initialUsers,
	initialRoles,
	currentUser: me,
}: {
	initialUsers: UserRecord[];
	initialRoles: string[];
	currentUser: CurrentUser;
}) => {
	const { data: freshUsers, refetch: refetchUsers } = useCachedFetch<UserRecord[]>('/api/users');
	const { data: freshRolesData } = useCachedFetch<{ name: string }[]>('/api/roles');
	const users = freshUsers ?? initialUsers;
	const availableRoles = freshRolesData ? freshRolesData.map((r) => r.name) : initialRoles;

	const [search, setSearch] = useState('');
	const [modal, setModal] = useState<'create' | 'edit' | 'password' | null>(null);
	const [editUser, setEditUser] = useState<UserRecord | null>(null);
	const [formName, setFormName] = useState('');
	const [formEmail, setFormEmail] = useState('');
	const [formRole, setFormRole] = useState('viewer');
	const [formPassword, setFormPassword] = useState('');
	const [formError, setFormError] = useState('');
	const [formLoading, setFormLoading] = useState(false);

	const myLevel = getLevel(me.role);
	const canManage = (targetRole: string) => myLevel > getLevel(targetRole);
	const assignableRoles = availableRoles.filter((r) => getLevel(r) < myLevel);

	const filtered = users.filter(
		(u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
	);

	const openCreate = () => {
		setFormName(''); setFormEmail(''); setFormRole(assignableRoles[0] ?? 'viewer');
		setFormPassword(''); setFormError(''); setEditUser(null); setModal('create');
	};

	const openEdit = (user: UserRecord) => {
		setEditUser(user); setFormName(user.name); setFormEmail(user.email);
		setFormRole(user.role); setFormError(''); setModal('edit');
	};

	const openPassword = (user: UserRecord) => {
		setEditUser(user); setFormPassword(''); setFormError(''); setModal('password');
	};

	const closeModal = () => { setModal(null); setEditUser(null); setFormError(''); };

	const handleCreate = async () => {
		setFormError(''); setFormLoading(true);
		const res = await fetch('/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: formName, email: formEmail, role: formRole, password: formPassword }),
		});
		const json = await res.json();
		setFormLoading(false);
		if (!json.ok) { setFormError(json.error?.message ?? 'Failed'); return; }
		refetchUsers();
		closeModal();
	};

	const handleEdit = async () => {
		if (!editUser) return;
		setFormError(''); setFormLoading(true);
		const body: Record<string, unknown> = { id: editUser.id };
		if (formName !== editUser.name) body.name = formName;
		if (formEmail !== editUser.email) body.email = formEmail;
		if (formRole !== editUser.role && me.id !== editUser.id) body.role = formRole;
		const res = await fetch('/api/users', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		const json = await res.json();
		setFormLoading(false);
		if (!json.ok) { setFormError(json.error?.message ?? 'Failed'); return; }
		refetchUsers();
		closeModal();
	};

	const handleChangePassword = async () => {
		if (!editUser) return;
		setFormError(''); setFormLoading(true);
		const res = await fetch('/api/users', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: editUser.id, password: formPassword }),
		});
		const json = await res.json();
		setFormLoading(false);
		if (!json.ok) { setFormError(json.error?.message ?? 'Failed'); return; }
		closeModal();
	};

	const handleDelete = async (id: string, name: string) => {
		if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
		const res = await fetch('/api/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});
		const json = await res.json();
		if (!json.ok) { alert(json.error?.message ?? 'Failed to delete'); return; }
		refetchUsers();
	};

	const handleToggleActive = async (user: UserRecord) => {
		const res = await fetch('/api/users', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
		});
		const json = await res.json();
		if (json.ok) refetchUsers();
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Users</h1>
					<p className="text-muted-foreground">Manage user accounts</p>
				</div>
				{assignableRoles.length > 0 && (
					<button type="button" onClick={openCreate}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Plus className="h-4 w-4" /> Add User
					</button>
				)}
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or email..."
					className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
			</div>

			<div className="rounded-xl border border-border bg-card shadow-sm">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
							<th className="px-6 py-3">User</th>
							<th className="px-6 py-3">Role</th>
							<th className="px-6 py-3">Status</th>
							<th className="px-6 py-3">Created</th>
							<th className="px-6 py-3 w-48 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((user) => {
							const isSelf = me.id === user.id;
							const canEdit = isSelf || canManage(user.role);
							const canDel = !isSelf && canManage(user.role);
							return (
								<tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
												<User className="h-4 w-4" />
											</div>
											<div>
												<p className="text-sm font-medium">{user.name}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p>
												<p className="text-xs text-muted-foreground">{user.email}</p>
											</div>
										</div>
									</td>
									<td className="px-6 py-4">
										<span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_COLORS[user.role] ?? ROLE_COLORS.viewer)}>
											{user.role}
										</span>
									</td>
									<td className="px-6 py-4">
										{canEdit && !isSelf ? (
											<button type="button" onClick={() => handleToggleActive(user)}
												className={cn('inline-flex items-center gap-1 text-xs', user.isActive ? 'text-green-600' : 'text-muted-foreground')}>
												<span className={cn('h-2 w-2 rounded-full', user.isActive ? 'bg-green-500' : 'bg-gray-400')} />
												{user.isActive ? 'Active' : 'Inactive'}
											</button>
										) : (
											<span className={cn('inline-flex items-center gap-1 text-xs', user.isActive ? 'text-green-600' : 'text-muted-foreground')}>
												<span className={cn('h-2 w-2 rounded-full', user.isActive ? 'bg-green-500' : 'bg-gray-400')} />
												{user.isActive ? 'Active' : 'Inactive'}
											</span>
										)}
									</td>
									<td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
									<td className="px-6 py-4">
										<div className="flex items-center justify-end gap-1">
											{canEdit && (
												<>
													<button type="button" onClick={() => openEdit(user)} title="Edit user"
														className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
													<button type="button" onClick={() => openPassword(user)} title="Change password"
														className="rounded-md p-1.5 hover:bg-accent"><Key className="h-3.5 w-3.5" /></button>
												</>
											)}
											{canDel && (
												<button type="button" onClick={() => handleDelete(user.id, user.name)} title="Delete user"
													className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* ── Create / Edit / Password Modal ── */}
			{modal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">
								{modal === 'create' ? 'Add User' : modal === 'edit' ? `Edit ${editUser?.name}` : `Change Password — ${editUser?.name}`}
							</h2>
							<button type="button" onClick={closeModal} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
						</div>

						{formError && (
							<div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
						)}

						{modal === 'password' ? (
							<div className="space-y-3">
								<label className="block space-y-1.5">
									<span className="text-sm font-medium">New Password</span>
									<input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
										placeholder="Min 6 characters" minLength={6}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
								</label>
								<div className="flex justify-end gap-3 pt-2">
									<button type="button" onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
									<button type="button" onClick={handleChangePassword} disabled={formPassword.length < 6 || formLoading}
										className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
										{formLoading ? 'Saving...' : 'Update Password'}
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-3">
								<label className="block space-y-1.5">
									<span className="text-sm font-medium">Name</span>
									<input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
								</label>
								<label className="block space-y-1.5">
									<span className="text-sm font-medium">Email</span>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com"
											className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</div>
								</label>
								{me.id !== editUser?.id && (
									<label className="block space-y-1.5">
										<span className="text-sm font-medium">Role</span>
										<select value={formRole} onChange={(e) => setFormRole(e.target.value)}
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
											{modal === 'edit' && <option value={editUser?.role}>{editUser?.role}</option>}
											{assignableRoles.filter((r) => r !== editUser?.role).map((r) => <option key={r} value={r}>{r}</option>)}
										</select>
									</label>
								)}
								{modal === 'create' && (
									<label className="block space-y-1.5">
										<span className="text-sm font-medium">Password</span>
										<input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
											placeholder="Min 6 characters" minLength={6}
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</label>
								)}
								<div className="flex justify-end gap-3 pt-2">
									<button type="button" onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
									<button type="button" onClick={modal === 'create' ? handleCreate : handleEdit}
										disabled={!formEmail || formLoading || (modal === 'create' && formPassword.length < 6)}
										className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
										{formLoading ? 'Saving...' : modal === 'create' ? 'Create User' : 'Save Changes'}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
