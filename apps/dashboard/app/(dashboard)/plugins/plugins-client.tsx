'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Puzzle, PowerOff, AlertCircle, CheckCircle2, Zap, ChevronRight, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dispatchPluginMenuUpdate } from '@/lib/plugin-events';

type PluginInfo = {
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
	hasSettings: boolean;
	isBuiltIn: boolean;
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
	active: { icon: CheckCircle2, color: 'text-green-600', label: 'Active' },
	installed: { icon: PowerOff, color: 'text-muted-foreground', label: 'Installed' },
	inactive: { icon: PowerOff, color: 'text-muted-foreground', label: 'Inactive' },
	error: { icon: AlertCircle, color: 'text-destructive', label: 'Error' },
};

const CATEGORY_COLORS: Record<string, string> = {
	automation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	content: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
	security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	developer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * Client component for plugins list page.
 * Uses optimistic UI — toggles update only the clicked plugin.
 */
export const PluginsClient = ({
	initialPlugins,
	canManage,
}: {
	initialPlugins: PluginInfo[];
	canManage: boolean;
}) => {
	const router = useRouter();
	const [plugins, setPlugins] = useState<PluginInfo[]>(initialPlugins);
	const [toggling, setToggling] = useState<string | null>(null);

	/** Maps plugin names to sidebar menu labels */
	const MENU_LABELS: Record<string, { label: string; icon: string }> = {
		webhook: { label: 'Webhooks', icon: 'webhook' },
		'audit-log': { label: 'Audit Log', icon: 'shield' },
		'slug-generator': { label: 'Slug Generator', icon: 'link' },
	};

	/** Sync sidebar menus whenever plugins state changes */
	const isFirstRender = useRef(true);
	useEffect(() => {
		if (isFirstRender.current) { isFirstRender.current = false; return; }
		const menus = plugins
			.filter((p) => p.status === 'active')
			.map((p) => ({
				name: p.name,
				label: MENU_LABELS[p.name]?.label ?? p.name,
				icon: MENU_LABELS[p.name]?.icon ?? 'puzzle',
			}));
		dispatchPluginMenuUpdate(menus);
	}, [plugins]);

	const deletePlugin = async (e: React.MouseEvent, name: string) => {
		e.stopPropagation();
		if (!confirm(`Permanently delete plugin "${name}"? This cannot be undone.`)) return;
		try {
			const res = await fetch('/api/plugins', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});
			const json = await res.json();
			if (json.ok) {
				setPlugins((prev) => prev.filter((p) => p.name !== name));
			} else {
				alert(json.error?.message ?? 'Failed to delete');
			}
		} catch {}
	};

	const togglePlugin = async (e: React.MouseEvent, name: string, currentlyActive: boolean) => {
		e.stopPropagation();
		if (!canManage) return;
		setToggling(name);

		const newStatus = currentlyActive ? 'installed' as const : 'active' as const;

		/* Optimistic: update ONLY this plugin */
		setPlugins((prev) => prev.map((p) =>
			p.name === name ? { ...p, status: newStatus } : p
		));

		try {
			const res = await fetch('/api/plugins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, enabled: !currentlyActive }),
			});
			const json = await res.json();
			if (!json.ok) {
				/* Revert on failure */
				setPlugins((prev) => prev.map((p) =>
					p.name === name ? { ...p, status: currentlyActive ? 'active' as const : 'installed' as const } : p
				));
			}
		} catch {
			/* Revert on error */
			setPlugins((prev) => prev.map((p) =>
				p.name === name ? { ...p, status: currentlyActive ? 'active' as const : 'installed' as const } : p
			));
		}
		setToggling(null);
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Plugins</h1>
					<p className="text-sm text-muted-foreground">
						Extend functionality with plugins{!canManage && ' — read only'}
					</p>
				</div>
				{canManage && (
					<button type="button" onClick={() => router.push('/plugins/upload')}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground">
						<Upload className="h-4 w-4" /> Upload Plugin
					</button>
				)}
			</div>

			{plugins.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12">
					<Puzzle className="h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No plugins installed</h3>
					<p className="mt-1 text-sm text-muted-foreground">Upload a plugin or check back later</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{plugins.map((plugin) => {
						const isActive = plugin.status === 'active';
						const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;
						const StatusIcon = statusCfg.icon;
						const isToggling = toggling === plugin.name;

						return (
							<div key={plugin.name}
								onClick={() => router.push(`/plugins/${plugin.name}`)}
								className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className={cn(
											'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
											isActive ? 'bg-green-500/10' : 'bg-primary/10',
										)}>
											<Puzzle className={cn('h-5 w-5', isActive ? 'text-green-600' : 'text-primary')} />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-semibold">{plugin.name}</h3>
												<span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[plugin.category] ?? CATEGORY_COLORS.developer)}>
													{plugin.category}
												</span>
											</div>
											<p className="text-xs text-muted-foreground">v{plugin.version}</p>
										</div>
									</div>
									<ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
								</div>

								<p className="mt-3 text-sm text-muted-foreground line-clamp-2">{plugin.description}</p>

								{isActive && plugin.hooksCount > 0 && (
									<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
										<Zap className="h-3 w-3" /> {plugin.hooksCount} hooks active
									</div>
								)}

								{plugin.features.length > 0 && (
									<p className="mt-2 text-xs text-muted-foreground">{plugin.features.length} features</p>
								)}

								<div className="mt-4 flex items-center justify-between border-t border-border pt-3">
									<div className={cn('flex items-center gap-1 text-xs', statusCfg.color)}>
										<StatusIcon className="h-3.5 w-3.5" />{statusCfg.label}
									</div>
									{canManage && (
										<div className="flex items-center gap-1">
											<button type="button"
												onClick={(e) => togglePlugin(e, plugin.name, isActive)}
												disabled={isToggling}
												className={cn(
													'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
													isActive
														? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
														: 'bg-primary text-primary-foreground hover:bg-primary/90',
												)}>
												{isToggling ? 'Saving...' : isActive ? 'Disable' : 'Enable'}
											</button>
											<button type="button"
												onClick={(e) => deletePlugin(e, plugin.name)}
												className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												title="Delete plugin">
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
