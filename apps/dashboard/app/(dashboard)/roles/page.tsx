'use client';

import { useState } from 'react';
import { Plus, Shield, Check, X, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/use-permissions';
import { useCachedFetch } from '@/lib/use-cached-fetch';

type Role = { name: string; description: string; isBuiltIn: boolean; permissions: string[] };
type ContentType = { slug: string; name: string };

const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
const SYSTEM_RESOURCES = ['collections', 'media', 'users', 'roles', 'settings', 'plugins'];

const hasPermission = (perms: string[], res: string, act: string): boolean =>
	perms.some((p) => p === '*' || p === `*:${act}` || p === `${res}:*` || p === `${res}:${act}`);

export default function RolesPage() {
	const { can } = usePermissions();
	const myCanCreate = can('roles', 'create');
	const myCanUpdate = can('roles', 'update');
	const myCanDelete = can('roles', 'delete');

	const { data: roles, loading: rolesLoading, refetch: refetchRoles } = useCachedFetch<Role[]>('/api/roles');
	const { data: colData } = useCachedFetch<ContentType[]>('/api/collections');
	const contentTypes = (colData ?? []).map((c) => ({ slug: c.slug, name: c.name }));
	const loading = rolesLoading;

	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [newName, setNewName] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [createError, setCreateError] = useState('');
	const [editPerms, setEditPerms] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);

	const selectRole = (role: Role) => {
		setSelectedRole(role); setEditPerms([...role.permissions]); setDirty(false);
	};

	const canEditThis = !selectedRole?.isBuiltIn && myCanUpdate;

	const togglePermission = (resource: string, action: string) => {
		if (!canEditThis) return;
		const perm = `${resource}:${action}`;
		setEditPerms((prev) => {
			setDirty(true);
			return prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm];
		});
	};

	const handleSave = async () => {
		if (!selectedRole || !canEditThis) return;
		setSaving(true);
		const res = await fetch('/api/roles', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: selectedRole.name, description: selectedRole.description, permissions: editPerms }),
		});
		const json = await res.json();
		if (json.ok) {
			refetchRoles();
			setSelectedRole({ ...selectedRole, permissions: editPerms }); setDirty(false);
		}
		setSaving(false);
	};

	const handleCreate = async () => {
		setCreateError('');
		if (!newName.trim()) { setCreateError('Name is required'); return; }
		const slug = newName.trim().toLowerCase().replace(/\s+/g, '-');
		const res = await fetch('/api/roles', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: slug, description: newDesc, permissions: ['*:read'] }),
		});
		const json = await res.json();
		if (!json.ok) { setCreateError(json.error?.message ?? 'Failed'); return; }
		refetchRoles(); selectRole(json.data);
		setShowCreate(false); setNewName(''); setNewDesc('');
	};

	const handleDelete = async (name: string) => {
		if (!confirm(`Delete role "${name}"?`)) return;
		await fetch('/api/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
		refetchRoles();
		if (selectedRole?.name === name) { setSelectedRole(null); setDirty(false); }
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
					<p className="text-muted-foreground">Configure access control for your team</p>
				</div>
				{myCanCreate && (
					<button type="button" onClick={() => setShowCreate(true)}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Plus className="h-4 w-4" /> New Role
					</button>
				)}
			</div>

			{loading ? (
				<div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted" />)}</div>
			) : (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{(roles ?? []).map((role) => (
						<div key={role.name} onClick={() => selectRole(role)} className={cn(
							'flex flex-col items-start rounded-xl border p-4 text-left transition-colors cursor-pointer',
							selectedRole?.name === role.name ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
						)}>
							<div className="flex w-full items-center justify-between">
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-primary" />
									<span className="text-sm font-semibold">{role.name}</span>
								</div>
								{!role.isBuiltIn && myCanDelete && (
									<button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(role.name); }}
										className="rounded p-1 text-destructive hover:bg-destructive/10">
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
							<p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
							<span className={cn('mt-2 rounded px-1.5 py-0.5 text-[10px] font-medium',
								role.isBuiltIn ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
								{role.isBuiltIn ? 'Built-in' : 'Custom'}
							</span>
						</div>
					))}
				</div>
			)}

			{selectedRole && (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<div className="flex items-center justify-between border-b border-border px-6 py-4">
						<div>
							<h2 className="text-lg font-semibold">{selectedRole.name}</h2>
							<p className="text-sm text-muted-foreground">
								{selectedRole.description}
								{(selectedRole.isBuiltIn || !myCanUpdate) && ' — read only'}
							</p>
						</div>
						{canEditThis && dirty && (
							<button type="button" onClick={handleSave} disabled={saving}
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
								<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
							</button>
						)}
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
									<th className="px-6 py-3">Resource</th>
									{ACTIONS.map((a) => <th key={a} className="px-4 py-3 text-center">{a}</th>)}
								</tr>
							</thead>
							<tbody>
								{contentTypes.length > 0 && (
									<tr><td colSpan={ACTIONS.length + 1} className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30">Content Types</td></tr>
								)}
								{contentTypes.map((ct) => (
									<PermRow key={ct.slug} resource={ct.slug} label={ct.name}
										perms={canEditThis ? editPerms : selectedRole.permissions}
										readOnly={!canEditThis} onToggle={togglePermission} />
								))}
								<tr><td colSpan={ACTIONS.length + 1} className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30">System</td></tr>
								{SYSTEM_RESOURCES.map((r) => (
									<PermRow key={r} resource={r} label={r.charAt(0).toUpperCase() + r.slice(1)}
										perms={canEditThis ? editPerms : selectedRole.permissions}
										readOnly={!canEditThis} onToggle={togglePermission} />
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{showCreate && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
						<h2 className="text-lg font-semibold">New Role</h2>
						{createError && <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createError}</div>}
						<div className="mt-4 space-y-3">
							<label className="block space-y-1.5"><span className="text-sm font-medium">Name</span>
								<input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. content-manager"
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
							<label className="block space-y-1.5"><span className="text-sm font-medium">Description</span>
								<input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What can this role do?"
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }}
								className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
							<button type="button" onClick={handleCreate}
								className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create Role</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

const PermRow = ({ resource, label, perms, readOnly, onToggle }: {
	resource: string; label: string; perms: string[]; readOnly: boolean;
	onToggle: (r: string, a: string) => void;
}) => (
	<tr className="border-b border-border last:border-0">
		<td className="px-6 py-3 text-sm font-medium">{label}</td>
		{(['create', 'read', 'update', 'delete', 'manage'] as const).map((action) => {
			const active = hasPermission(perms, resource, action);
			return (
				<td key={action} className="px-4 py-3 text-center">
					<button type="button" onClick={() => !readOnly && onToggle(resource, action)} disabled={readOnly}
						className={cn('mx-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors',
							!readOnly ? 'hover:bg-accent cursor-pointer' : 'cursor-default',
							active ? 'text-green-600' : 'text-muted-foreground/30')}>
						{active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
					</button>
				</td>
			);
		})}
	</tr>
);
