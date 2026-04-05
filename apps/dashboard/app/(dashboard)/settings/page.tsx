'use client';

import { useState, useEffect } from 'react';
import { Save, Key, Plus, Database, HardDrive, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/use-permissions';

type Tab = 'general' | 'api' | 'media' | 'database';
const TABS: { id: Tab; label: string }[] = [
	{ id: 'general', label: 'General' },
	{ id: 'api', label: 'API Keys' },
	{ id: 'media', label: 'Media' },
	{ id: 'database', label: 'Database' },
];

export default function SettingsPage() {
	const { can } = usePermissions();
	const canUpdate = can('settings', 'update');
	const [tab, setTab] = useState<Tab>('general');

	return (
		<div className="space-y-4 sm:space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Settings</h1>
				<p className="text-sm text-muted-foreground">System configuration{!canUpdate && ' — read only'}</p>
			</div>
			<div className="flex gap-1 overflow-x-auto border-b border-border">
				{TABS.map((t) => (
					<button key={t.id} type="button" onClick={() => setTab(t.id)}
						className={cn('shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
							tab === t.id ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
						{t.label}
					</button>
				))}
			</div>
			{tab === 'general' && <GeneralSettings readOnly={!canUpdate} />}
			{tab === 'api' && <ApiKeySettings readOnly={!canUpdate} />}
			{tab === 'media' && <MediaSettings readOnly={!canUpdate} />}
			{tab === 'database' && <DatabaseSettings />}
		</div>
	);
}

const GeneralSettings = ({ readOnly }: { readOnly: boolean }) => {
	const [siteName, setSiteName] = useState('ServerlessKit');
	const [siteDescription, setSiteDescription] = useState('');
	const [timezone, setTimezone] = useState('UTC');
	const [regEnabled, setRegEnabled] = useState('true');
	const [defaultRole, setDefaultRole] = useState('viewer');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [roles, setRoles] = useState<string[]>([]);

	useEffect(() => {
		Promise.all([
			fetch('/api/settings').then((r) => r.json()),
			fetch('/api/roles').then((r) => r.json()),
		]).then(([settingsJson, rolesJson]) => {
			if (settingsJson.ok) {
				const s = settingsJson.data;
				if (s.site_name) setSiteName(s.site_name);
				if (s.site_description) setSiteDescription(s.site_description);
				if (s.timezone) setTimezone(s.timezone);
				if (s.registration_enabled) setRegEnabled(s.registration_enabled);
				if (s.default_registration_role) setDefaultRole(s.default_registration_role);
			}
			if (rolesJson.ok) setRoles(rolesJson.data.map((r: { name: string }) => r.name));
		});
	}, []);

	const handleSave = async () => {
		setSaving(true); setMessage('');
		await fetch('/api/settings', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ site_name: siteName, site_description: siteDescription, timezone, registration_enabled: regEnabled, default_registration_role: defaultRole }),
		});
		setSaving(false); setMessage('Settings saved');
		setTimeout(() => setMessage(''), 3000);
	};

	const inputClass = `w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${readOnly ? 'opacity-60' : ''}`;

	return (
		<div className="max-w-2xl space-y-4">
			{message && <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600">{message}</div>}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 sm:p-6">
				<h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> General</h2>
				<label className="block space-y-1.5"><span className="text-sm font-medium">Site Name</span>
					<input type="text" value={siteName} onChange={(e) => !readOnly && setSiteName(e.target.value)} readOnly={readOnly} className={inputClass} /></label>
				<label className="block space-y-1.5"><span className="text-sm font-medium">Description</span>
					<input type="text" value={siteDescription} onChange={(e) => !readOnly && setSiteDescription(e.target.value)} readOnly={readOnly} placeholder="A short description" className={inputClass} /></label>
				<label className="block space-y-1.5"><span className="text-sm font-medium">Timezone</span>
					<select value={timezone} onChange={(e) => !readOnly && setTimezone(e.target.value)} disabled={readOnly} className={inputClass}>
						<option value="UTC">UTC</option>
						<option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
						<option value="America/New_York">America/New_York (EST)</option>
						<option value="Europe/London">Europe/London (GMT)</option>
					</select></label>
			</div>
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 sm:p-6">
				<h2 className="text-sm font-semibold">Registration</h2>
				<label className="flex items-center gap-3">
					<input type="checkbox" checked={regEnabled === 'true'} onChange={(e) => !readOnly && setRegEnabled(e.target.checked ? 'true' : 'false')}
						disabled={readOnly} className="h-4 w-4 rounded border-border" />
					<div>
						<span className="text-sm font-medium">Allow public registration</span>
						<p className="text-xs text-muted-foreground">If disabled, only admins can create new users</p>
					</div>
				</label>
				<label className="block space-y-1.5"><span className="text-sm font-medium">Default role for new registrations</span>
					<select value={defaultRole} onChange={(e) => !readOnly && setDefaultRole(e.target.value)} disabled={readOnly} className={inputClass}>
						{roles.map((r) => <option key={r} value={r}>{r}</option>)}
					</select></label>
			</div>
			{!readOnly && (
				<div className="flex justify-end">
					<button type="button" onClick={handleSave} disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
						<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
					</button>
				</div>
			)}
		</div>
	);
};

const ApiKeySettings = ({ readOnly }: { readOnly: boolean }) => {
	const [keys, setKeys] = useState<{ id: string; prefix: string; label: string; isLive: boolean; createdAt: string }[]>([]);
	const [showCreate, setShowCreate] = useState(false);
	const [newLabel, setNewLabel] = useState('');
	const [newIsLive, setNewIsLive] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newRawKey, setNewRawKey] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/api-keys').then((r) => r.json())
			.then((json) => { if (json.ok) setKeys(json.data); })
			.finally(() => setLoading(false));
	}, []);

	const createKey = async () => {
		setCreating(true);
		const res = await fetch('/api/api-keys', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ label: newLabel, isLive: newIsLive }),
		});
		const json = await res.json();
		setCreating(false);
		if (json.ok) {
			setNewRawKey(json.data.rawKey);
			setKeys((prev) => [{ id: json.data.id, prefix: json.data.prefix, label: json.data.label, isLive: json.data.isLive, createdAt: json.data.createdAt }, ...prev]);
			setShowCreate(false); setNewLabel(''); setNewIsLive(false);
		}
	};

	const revokeKey = async (id: string) => {
		if (!confirm('Revoke this API key? This cannot be undone.')) return;
		await fetch('/api/api-keys', {
			method: 'DELETE', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});
		setKeys((prev) => prev.filter((k) => k.id !== id));
	};

	const copyKey = () => {
		navigator.clipboard.writeText(newRawKey);
	};

	return (
		<div className="max-w-2xl space-y-4">
			{newRawKey && (
				<div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
					<p className="text-sm font-semibold text-green-600">API Key Created — Copy it now! You won't see it again.</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 rounded bg-background px-3 py-2 font-mono text-xs break-all border border-border">{newRawKey}</code>
						<button type="button" onClick={copyKey} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Copy</button>
					</div>
					<button type="button" onClick={() => setNewRawKey('')} className="text-xs text-muted-foreground hover:underline">Dismiss</button>
				</div>
			)}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 sm:p-6">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</h2>
					{!readOnly && (
						<button type="button" onClick={() => setShowCreate(true)}
							className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
							<Plus className="h-3.5 w-3.5" /> Create Key
						</button>
					)}
				</div>
				{loading ? (
					<div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
				) : keys.length === 0 ? (
					<p className="text-sm text-muted-foreground">No API keys created yet.</p>
				) : (
					<div className="space-y-2">
						{keys.map((key) => (
							<div key={key.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
								<div>
									<p className="text-sm font-medium">{key.label}</p>
									<p className="font-mono text-xs text-muted-foreground">{key.prefix}</p>
								</div>
								<div className="flex items-center gap-2">
									<span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
										key.isLive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>
										{key.isLive ? 'Live' : 'Test'}
									</span>
									{!readOnly && (
										<button type="button" onClick={() => revokeKey(key.id)}
											className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Revoke</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
				{showCreate && !readOnly && (
					<div className="space-y-3 border-t border-border pt-4">
						<label className="block space-y-1.5"><span className="text-sm font-medium">Label</span>
							<input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Production API"
								className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={newIsLive} onChange={(e) => setNewIsLive(e.target.checked)} className="h-4 w-4 rounded border-border" />
							<span className="text-sm">Live key (production)</span></label>
						<div className="flex justify-end gap-2">
							<button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
							<button type="button" onClick={createKey} disabled={creating}
								className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
								{creating ? 'Creating...' : 'Create'}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const MediaSettings = ({ readOnly }: { readOnly: boolean }) => {
	const inputClass = `w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${readOnly ? 'opacity-60' : ''}`;
	return (
		<div className="max-w-2xl rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 sm:p-6">
			<h2 className="text-sm font-semibold flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage</h2>
			<label className="block space-y-1.5"><span className="text-sm font-medium">Provider</span>
				<select disabled={readOnly} className={inputClass}>
					<option value="local">Local Storage</option><option value="r2">Cloudflare R2</option>
					<option value="s3">AWS S3</option><option value="vercel-blob">Vercel Blob</option>
				</select></label>
			<label className="block space-y-1.5"><span className="text-sm font-medium">Max Upload Size (MB)</span>
				<input type="number" defaultValue={50} readOnly={readOnly} className={inputClass} /></label>
			<label className="block space-y-1.5"><span className="text-sm font-medium">Allowed File Types</span>
				<input type="text" defaultValue="image/*,video/*,application/pdf" readOnly={readOnly} className={inputClass} /></label>
			{!readOnly && (
				<div className="flex justify-end pt-2">
					<button type="button" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Save className="h-4 w-4" /> Save
					</button>
				</div>
			)}
		</div>
	);
};

const DatabaseSettings = () => (
	<div className="max-w-2xl rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 sm:p-6">
		<h2 className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Database</h2>
		<div className="space-y-2 text-sm">
			<div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Provider</span><span className="font-medium">Turso (libSQL)</span></div>
			<div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Status</span>
				<span className="inline-flex items-center gap-1 font-medium text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> Connected</span></div>
		</div>
	</div>
);
