'use client';

import { useState } from 'react';
import { Plus, Shield, Check, X, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = {
	name: string;
	description: string;
	isBuiltIn: boolean;
	permissions: Record<string, Set<string>>;
};

const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
const RESOURCES = ['collections', 'entries', 'media', 'users', 'roles', 'settings', 'plugins'];

const BUILT_IN_ROLES: Role[] = [
	{
		name: 'super-admin',
		description: 'Full system access',
		isBuiltIn: true,
		permissions: Object.fromEntries(RESOURCES.map((r) => [r, new Set(ACTIONS)])),
	},
	{
		name: 'admin',
		description: 'Manage content and users',
		isBuiltIn: true,
		permissions: Object.fromEntries(RESOURCES.map((r) => [r, new Set(ACTIONS)])),
	},
	{
		name: 'editor',
		description: 'Can manage content',
		isBuiltIn: true,
		permissions: Object.fromEntries(
			RESOURCES.map((r) => [
				r,
				new Set(['collections', 'entries', 'media'].includes(r) ? ['create', 'read', 'update'] : ['read']),
			]),
		),
	},
	{
		name: 'viewer',
		description: 'Read-only access',
		isBuiltIn: true,
		permissions: Object.fromEntries(RESOURCES.map((r) => [r, new Set(['read'])])),
	},
];

export default function RolesPage() {
	const [roles] = useState<Role[]>(BUILT_IN_ROLES);
	const [selectedRole, setSelectedRole] = useState<Role>(BUILT_IN_ROLES[0]!);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
					<p className="text-muted-foreground">Configure access control for your team</p>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					New Role
				</button>
			</div>

			<div className="grid grid-cols-4 gap-3">
				{roles.map((role) => (
					<button
						key={role.name}
						type="button"
						onClick={() => setSelectedRole(role)}
						className={cn(
							'flex flex-col items-start rounded-xl border p-4 text-left transition-colors',
							selectedRole.name === role.name ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
						)}
					>
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4 text-primary" />
							<span className="text-sm font-semibold">{role.name}</span>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
						{role.isBuiltIn && (
							<span className="mt-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
								Built-in
							</span>
						)}
					</button>
				))}
			</div>

			{selectedRole && (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<div className="flex items-center justify-between border-b border-border px-6 py-4">
						<div>
							<h2 className="text-lg font-semibold">{selectedRole.name}</h2>
							<p className="text-sm text-muted-foreground">{selectedRole.description}</p>
						</div>
						{!selectedRole.isBuiltIn && (
							<div className="flex gap-2">
								<button type="button" className="rounded-lg border border-border p-2 hover:bg-accent">
									<Pencil className="h-4 w-4" />
								</button>
								<button type="button" className="rounded-lg border border-destructive p-2 text-destructive hover:bg-destructive/10">
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						)}
					</div>

					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
									<th className="px-6 py-3">Resource</th>
									{ACTIONS.map((action) => (
										<th key={action} className="px-4 py-3 text-center">
											{action}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{RESOURCES.map((resource) => (
									<tr key={resource} className="border-b border-border last:border-0">
										<td className="px-6 py-3 text-sm font-medium capitalize">{resource}</td>
										{ACTIONS.map((action) => {
											const hasIt = selectedRole.permissions[resource]?.has(action);
											return (
												<td key={action} className="px-4 py-3 text-center">
													{hasIt ? (
														<Check className="mx-auto h-4 w-4 text-green-600" />
													) : (
														<X className="mx-auto h-4 w-4 text-muted-foreground/30" />
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
