'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, User, Mail, Shield, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRecord = {
	id: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	lastLogin: string;
	avatarUrl?: string;
};

const MOCK_USERS: UserRecord[] = [
	{
		id: '1',
		name: 'Admin User',
		email: 'admin@serverlesskit.dev',
		role: 'super-admin',
		isActive: true,
		lastLogin: '2026-04-05T00:00:00Z',
	},
];

const ROLE_COLORS: Record<string, string> = {
	'super-admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
	editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function UsersPage() {
	const [users] = useState<UserRecord[]>(MOCK_USERS);
	const [search, setSearch] = useState('');
	const [showInvite, setShowInvite] = useState(false);

	const filtered = users.filter(
		(u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Users</h1>
					<p className="text-muted-foreground">Manage user accounts and invitations</p>
				</div>
				<button
					type="button"
					onClick={() => setShowInvite(true)}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					Invite User
				</button>
			</div>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or email..."
					className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<div className="rounded-xl border border-border bg-card shadow-sm">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
							<th className="px-6 py-3">User</th>
							<th className="px-6 py-3">Role</th>
							<th className="px-6 py-3">Status</th>
							<th className="px-6 py-3">Last Login</th>
							<th className="px-6 py-3 w-12" />
						</tr>
					</thead>
					<tbody>
						{filtered.map((user) => (
							<tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50">
								<td className="px-6 py-4">
									<div className="flex items-center gap-3">
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
											<User className="h-4 w-4" />
										</div>
										<div>
											<p className="text-sm font-medium">{user.name}</p>
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
									<span className={cn('inline-flex items-center gap-1 text-xs', user.isActive ? 'text-green-600' : 'text-muted-foreground')}>
										<span className={cn('h-2 w-2 rounded-full', user.isActive ? 'bg-green-500' : 'bg-gray-400')} />
										{user.isActive ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td className="px-6 py-4 text-sm text-muted-foreground">
									{new Date(user.lastLogin).toLocaleDateString()}
								</td>
								<td className="px-6 py-4">
									<button type="button" className="rounded p-1 hover:bg-accent">
										<MoreHorizontal className="h-4 w-4" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{showInvite && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
						<h2 className="text-lg font-semibold">Invite User</h2>
						<p className="mt-1 text-sm text-muted-foreground">Send an invitation email to join your team.</p>
						<div className="mt-4 space-y-3">
							<label className="block space-y-1.5">
								<span className="text-sm font-medium">Email</span>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<input type="email" placeholder="user@example.com" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
								</div>
							</label>
							<label className="block space-y-1.5">
								<span className="text-sm font-medium">Role</span>
								<select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
									<option value="viewer">Viewer</option>
									<option value="editor">Editor</option>
									<option value="admin">Admin</option>
								</select>
							</label>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<button type="button" onClick={() => setShowInvite(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
							<button type="button" onClick={() => setShowInvite(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Send Invite</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
