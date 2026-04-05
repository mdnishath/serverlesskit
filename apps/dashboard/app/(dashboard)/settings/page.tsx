'use client';

import { useState } from 'react';
import { Save, Key, Plus, Eye, EyeOff, Database, HardDrive, Globe, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'api' | 'media' | 'database';

const TABS: { id: Tab; label: string }[] = [
	{ id: 'general', label: 'General' },
	{ id: 'api', label: 'API Keys' },
	{ id: 'media', label: 'Media' },
	{ id: 'database', label: 'Database' },
];

export default function SettingsPage() {
	const [tab, setTab] = useState<Tab>('general');

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">System configuration</p>
			</div>

			<div className="flex gap-1 border-b border-border">
				{TABS.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						className={cn(
							'px-4 py-2.5 text-sm font-medium transition-colors',
							tab === t.id
								? 'border-b-2 border-primary text-foreground'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === 'general' && <GeneralSettings />}
			{tab === 'api' && <ApiKeySettings />}
			{tab === 'media' && <MediaSettings />}
			{tab === 'database' && <DatabaseSettings />}
		</div>
	);
}

const GeneralSettings = () => {
	const [siteName, setSiteName] = useState('ServerlessKit');
	const [siteDescription, setSiteDescription] = useState('');
	const [timezone, setTimezone] = useState('UTC');

	return (
		<div className="max-w-2xl space-y-6">
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
				<h2 className="text-sm font-semibold flex items-center gap-2">
					<Globe className="h-4 w-4" /> General
				</h2>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Site Name</span>
					<input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Description</span>
					<input type="text" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} placeholder="A short description of your site" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Timezone</span>
					<select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
						<option value="UTC">UTC</option>
						<option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
						<option value="America/New_York">America/New_York (EST)</option>
						<option value="Europe/London">Europe/London (GMT)</option>
					</select>
				</label>
				<div className="flex justify-end pt-2">
					<button type="button" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Save className="h-4 w-4" /> Save
					</button>
				</div>
			</div>
		</div>
	);
};

const ApiKeySettings = () => {
	const [keys, setKeys] = useState<{ id: string; prefix: string; label: string; isLive: boolean; createdAt: string }[]>([]);
	const [showCreate, setShowCreate] = useState(false);
	const [newLabel, setNewLabel] = useState('');
	const [newIsLive, setNewIsLive] = useState(false);

	const createKey = () => {
		const id = crypto.randomUUID();
		const prefix = newIsLive ? 'sk_live_' : 'sk_test_';
		setKeys([...keys, { id, prefix: `${prefix}xxxx...xxxx`, label: newLabel || 'Unnamed key', isLive: newIsLive, createdAt: new Date().toISOString() }]);
		setShowCreate(false);
		setNewLabel('');
	};

	return (
		<div className="max-w-2xl space-y-4">
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</h2>
					<button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
						<Plus className="h-3.5 w-3.5" /> Create Key
					</button>
				</div>

				{keys.length === 0 ? (
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
									<span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', key.isLive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>
										{key.isLive ? 'Live' : 'Test'}
									</span>
									<button type="button" className="rounded p-1 text-destructive hover:bg-destructive/10 text-xs">Revoke</button>
								</div>
							</div>
						))}
					</div>
				)}

				{showCreate && (
					<div className="space-y-3 border-t border-border pt-4">
						<label className="block space-y-1.5">
							<span className="text-sm font-medium">Label</span>
							<input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Production API" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
						</label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={newIsLive} onChange={(e) => setNewIsLive(e.target.checked)} className="h-4 w-4 rounded border-border" />
							<span className="text-sm">Live key (production)</span>
						</label>
						<div className="flex justify-end gap-2">
							<button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
							<button type="button" onClick={createKey} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Create</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const MediaSettings = () => (
	<div className="max-w-2xl space-y-4">
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
			<h2 className="text-sm font-semibold flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage</h2>
			<label className="block space-y-1.5">
				<span className="text-sm font-medium">Provider</span>
				<select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
					<option value="local">Local Storage</option>
					<option value="r2">Cloudflare R2</option>
					<option value="s3">AWS S3</option>
					<option value="vercel-blob">Vercel Blob</option>
				</select>
			</label>
			<label className="block space-y-1.5">
				<span className="text-sm font-medium">Max Upload Size (MB)</span>
				<input type="number" defaultValue={50} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
			</label>
			<label className="block space-y-1.5">
				<span className="text-sm font-medium">Allowed File Types</span>
				<input type="text" defaultValue="image/*,video/*,application/pdf" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
			</label>
			<div className="flex justify-end pt-2">
				<button type="button" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
					<Save className="h-4 w-4" /> Save
				</button>
			</div>
		</div>
	</div>
);

const DatabaseSettings = () => (
	<div className="max-w-2xl space-y-4">
		<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
			<h2 className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Database</h2>
			<div className="space-y-2 text-sm">
				<div className="flex justify-between py-2 border-b border-border">
					<span className="text-muted-foreground">Provider</span>
					<span className="font-medium">Turso (libSQL)</span>
				</div>
				<div className="flex justify-between py-2 border-b border-border">
					<span className="text-muted-foreground">Status</span>
					<span className="inline-flex items-center gap-1 font-medium text-green-600">
						<span className="h-2 w-2 rounded-full bg-green-500" /> Connected
					</span>
				</div>
				<div className="flex justify-between py-2 border-b border-border">
					<span className="text-muted-foreground">Tables</span>
					<span className="font-medium">0</span>
				</div>
				<div className="flex justify-between py-2">
					<span className="text-muted-foreground">Migrations</span>
					<span className="font-medium">0 applied</span>
				</div>
			</div>
		</div>
	</div>
);
