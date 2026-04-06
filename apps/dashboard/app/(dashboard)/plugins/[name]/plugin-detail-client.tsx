'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft, Puzzle, CheckCircle2, PowerOff, AlertCircle,
	Save, Zap, Check, Settings, BookOpen, List, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingField } from '@/lib/plugins/registry';

type PluginDetail = {
	name: string;
	version: string;
	description: string;
	author: string;
	status: 'installed' | 'active' | 'inactive' | 'error';
	error?: string;
	hooksCount: number;
	routesCount: number;
	category: string;
	features: string[];
	settingsSchema: SettingField[];
	hooks: string[];
	readme: string;
	config: Record<string, unknown>;
	isBuiltIn: boolean;
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
	active: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10', label: 'Active' },
	installed: { icon: PowerOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Installed' },
	inactive: { icon: PowerOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Inactive' },
	error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Error' },
};

const CATEGORY_COLORS: Record<string, string> = {
	automation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	content: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
	security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	developer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * Client component for plugin detail page.
 * Shows plugin info, features, hooks, settings form, and readme.
 * @param props - plugin detail data and canManage permission
 */
export const PluginDetailClient = ({
	plugin: initial,
	canManage,
}: {
	plugin: PluginDetail;
	canManage: boolean;
}) => {
	const router = useRouter();
	const [plugin, setPlugin] = useState(initial);
	const [config, setConfig] = useState<Record<string, unknown>>(initial.config);
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [toggling, setToggling] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [tab, setTab] = useState<'overview' | 'settings'>('overview');

	const isActive = plugin.status === 'active';
	const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;
	const StatusIcon = statusCfg.icon;
	const hasSettings = plugin.settingsSchema.length > 0;

	const handleToggle = async () => {
		setToggling(true);
		try {
			const res = await fetch('/api/plugins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: plugin.name, enabled: !isActive }),
			});
			const json = await res.json();
			if (json.ok) {
				const updated = json.data.find((p: { name: string }) => p.name === plugin.name);
				if (updated) setPlugin((prev) => ({ ...prev, status: updated.status, hooksCount: updated.hooksCount, error: updated.error }));
			}
		} catch { /* toggle failed */ }
		setToggling(false);
	};

	const handleDelete = async () => {
		if (!confirm(`Permanently delete plugin "${plugin.name}"? This cannot be undone.`)) return;
		setDeleting(true);
		try {
			const res = await fetch('/api/plugins', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: plugin.name }),
			});
			const json = await res.json();
			if (json.ok) router.push('/plugins');
			else alert(json.error?.message ?? 'Failed to delete');
		} catch { alert('Network error'); }
		setDeleting(false);
	};

	const handleSaveConfig = async () => {
		setSaving(true); setSaveMsg('');
		try {
			const res = await fetch('/api/plugins', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: plugin.name, config }),
			});
			const json = await res.json();
			if (json.ok) {
				setSaveMsg('Settings saved');
				setPlugin(json.data);
				setConfig(json.data.config);
			} else {
				setSaveMsg(json.error?.message ?? 'Failed');
			}
		} catch { setSaveMsg('Network error'); }
		setSaving(false);
		setTimeout(() => setSaveMsg(''), 3000);
	};

	const updateField = (key: string, value: unknown) => {
		setConfig((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex items-start gap-3">
					<button type="button" onClick={() => router.push('/plugins')} className="mt-1 rounded-lg p-2 hover:bg-accent">
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', isActive ? 'bg-green-500/10' : 'bg-primary/10')}>
						<Puzzle className={cn('h-6 w-6', isActive ? 'text-green-600' : 'text-primary')} />
					</div>
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-xl font-bold tracking-tight sm:text-2xl">{plugin.name}</h1>
							<span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[plugin.category] ?? CATEGORY_COLORS.developer)}>
								{plugin.category}
							</span>
						</div>
						<p className="text-sm text-muted-foreground">v{plugin.version} by {plugin.author}</p>
						<p className="mt-1 text-sm text-muted-foreground">{plugin.description}</p>
					</div>
				</div>
				<div className="flex items-center gap-3 sm:shrink-0">
					<div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1', statusCfg.bg)}>
						<StatusIcon className={cn('h-3.5 w-3.5', statusCfg.color)} />
						<span className={cn('text-xs font-medium', statusCfg.color)}>{statusCfg.label}</span>
					</div>
					{canManage && (
						<div className="flex items-center gap-2">
							<button type="button" onClick={handleToggle} disabled={toggling}
								className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
									isActive ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
										: 'bg-primary text-primary-foreground hover:bg-primary/90')}>
								{toggling ? 'Saving...' : isActive ? 'Disable' : 'Enable'}
							</button>
							{!plugin.isBuiltIn && (
								<button type="button" onClick={handleDelete} disabled={deleting}
									className="rounded-lg border border-destructive p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
									title="Delete plugin permanently">
									<Trash2 className="h-4 w-4" />
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{plugin.error && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{plugin.error}</div>
			)}

			{/* Tabs */}
			{hasSettings && (
				<div className="flex gap-1 border-b border-border">
					<button type="button" onClick={() => setTab('overview')}
						className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
							tab === 'overview' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
						<BookOpen className="h-4 w-4" /> Overview
					</button>
					<button type="button" onClick={() => setTab('settings')}
						className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
							tab === 'settings' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
						<Settings className="h-4 w-4" /> Settings
					</button>
				</div>
			)}

			{tab === 'overview' && (
				<>
					{/* Features */}
					{plugin.features.length > 0 && (
						<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
							<h2 className="flex items-center gap-2 text-sm font-semibold"><List className="h-4 w-4" /> Features</h2>
							<ul className="mt-3 space-y-2">
								{plugin.features.map((f) => (
									<li key={f} className="flex items-start gap-2 text-sm">
										<Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
										<span>{f}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Hooks */}
					{plugin.hooks.length > 0 && (
						<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
							<h2 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4" /> Lifecycle Hooks</h2>
							<div className="mt-3 flex flex-wrap gap-2">
								{plugin.hooks.map((h) => (
									<span key={h} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{h}</span>
								))}
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								These hooks run automatically on every CRUD operation when the plugin is active.
							</p>
						</div>
					)}

					{/* Readme */}
					{plugin.readme && (
						<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
							<h2 className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" /> Documentation</h2>
							<div className="mt-3 prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground whitespace-pre-line">
								{plugin.readme.split('\n').map((line, i) => {
									if (line.startsWith('## ')) return <h3 key={i} className="mt-4 text-base font-semibold text-foreground">{line.slice(3)}</h3>;
									if (line.startsWith('### ')) return <h4 key={i} className="mt-3 text-sm font-semibold text-foreground">{line.slice(4)}</h4>;
									if (line.startsWith('- ')) return <p key={i} className="ml-4 flex gap-2"><span>-</span><span>{line.slice(2)}</span></p>;
									if (line.startsWith('```')) return null;
									if (line.startsWith('|')) return <p key={i} className="font-mono text-xs">{line}</p>;
									return line.trim() ? <p key={i}>{line}</p> : <br key={i} />;
								})}
							</div>
						</div>
					)}
				</>
			)}

			{tab === 'settings' && hasSettings && (
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
					<h2 className="flex items-center gap-2 text-sm font-semibold"><Settings className="h-4 w-4" /> Configuration</h2>

					{saveMsg && (
						<div className={cn('mt-3 rounded-lg border px-3 py-2 text-sm',
							saveMsg === 'Settings saved' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/5 text-destructive')}>
							{saveMsg}
						</div>
					)}

					<div className="mt-4 space-y-4">
						{plugin.settingsSchema.map((field) => (
							<label key={field.key} className="block space-y-1.5">
								<span className="text-sm font-medium">
									{field.label}
									{field.required && <span className="text-destructive"> *</span>}
								</span>
								{field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
								{field.type === 'boolean' ? (
									<div className="flex items-center gap-2 pt-1">
										<input type="checkbox" checked={Boolean(config[field.key])}
											onChange={(e) => updateField(field.key, e.target.checked)}
											disabled={!canManage}
											className="h-4 w-4 rounded border-border" />
										<span className="text-sm">Enabled</span>
									</div>
								) : field.type === 'textarea' ? (
									<textarea value={String(config[field.key] ?? '')}
										onChange={(e) => updateField(field.key, e.target.value)}
										placeholder={field.placeholder} readOnly={!canManage} rows={4}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
								) : field.type === 'select' ? (
									<select value={String(config[field.key] ?? '')}
										onChange={(e) => updateField(field.key, e.target.value)}
										disabled={!canManage}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
										<option value="">Select...</option>
										{(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
									</select>
								) : (
									<input type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
										value={String(config[field.key] ?? '')}
										onChange={(e) => updateField(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
										placeholder={field.placeholder} readOnly={!canManage}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
								)}
							</label>
						))}
					</div>

					{canManage && (
						<div className="mt-6 flex justify-end">
							<button type="button" onClick={handleSaveConfig} disabled={saving}
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
								<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
