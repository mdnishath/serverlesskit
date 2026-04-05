'use client';

import { useState } from 'react';
import { Puzzle, Settings, PowerOff, AlertCircle, CheckCircle2, Zap, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

type PluginInfo = {
	name: string;
	version: string;
	description: string;
	author: string;
	status: 'installed' | 'active' | 'inactive' | 'error';
	error?: string;
	hooksCount: number;
	routesCount: number;
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
	active: { icon: CheckCircle2, color: 'text-green-600', label: 'Active' },
	installed: { icon: PowerOff, color: 'text-muted-foreground', label: 'Installed' },
	inactive: { icon: PowerOff, color: 'text-muted-foreground', label: 'Inactive' },
	error: { icon: AlertCircle, color: 'text-destructive', label: 'Error' },
};

/**
 * Client component for plugins page.
 * @param props - initialPlugins from server, canManage permission
 */
export const PluginsClient = ({
	initialPlugins,
	canManage,
}: {
	initialPlugins: PluginInfo[];
	canManage: boolean;
}) => {
	const [plugins, setPlugins] = useState<PluginInfo[]>(initialPlugins);
	const [toggling, setToggling] = useState<string | null>(null);

	const togglePlugin = async (name: string, currentlyActive: boolean) => {
		if (!canManage) return;
		setToggling(name);
		try {
			const res = await fetch('/api/plugins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, enabled: !currentlyActive }),
			});
			const json = await res.json();
			if (json.ok) setPlugins(json.data);
		} catch { /* toggle failed */ }
		setToggling(null);
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Plugins</h1>
				<p className="text-sm text-muted-foreground">
					Extend functionality with plugins{!canManage && ' — read only'}
				</p>
			</div>

			{plugins.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12">
					<Puzzle className="h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No plugins installed</h3>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{plugins.map((plugin) => {
						const isActive = plugin.status === 'active';
						const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;
						const StatusIcon = statusCfg.icon;
						const isToggling = toggling === plugin.name;

						return (
							<div key={plugin.name} className="rounded-xl border border-border bg-card p-5 shadow-sm">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className={cn(
											'flex h-10 w-10 items-center justify-center rounded-lg',
											isActive ? 'bg-green-500/10' : 'bg-primary/10',
										)}>
											<Puzzle className={cn('h-5 w-5', isActive ? 'text-green-600' : 'text-primary')} />
										</div>
										<div>
											<h3 className="text-sm font-semibold">{plugin.name}</h3>
											<p className="text-xs text-muted-foreground">v{plugin.version}</p>
										</div>
									</div>
									<div className={cn('flex items-center gap-1 text-xs', statusCfg.color)}>
										<StatusIcon className="h-3.5 w-3.5" />{statusCfg.label}
									</div>
								</div>

								<p className="mt-3 text-sm text-muted-foreground">{plugin.description}</p>

								{plugin.error && (
									<div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
										{plugin.error}
									</div>
								)}

								{isActive && (plugin.hooksCount > 0 || plugin.routesCount > 0) && (
									<div className="mt-2 flex gap-3 text-xs text-muted-foreground">
										{plugin.hooksCount > 0 && (
											<span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {plugin.hooksCount} hooks</span>
										)}
										{plugin.routesCount > 0 && (
											<span className="flex items-center gap-1"><Route className="h-3 w-3" /> {plugin.routesCount} routes</span>
										)}
									</div>
								)}

								<div className="mt-4 flex items-center justify-between border-t border-border pt-3">
									<span className="text-xs text-muted-foreground">by {plugin.author}</span>
									{canManage && (
										<button type="button"
											onClick={() => togglePlugin(plugin.name, isActive)}
											disabled={isToggling}
											className={cn(
												'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
												isActive
													? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
													: 'bg-primary text-primary-foreground hover:bg-primary/90',
											)}>
											{isToggling ? 'Saving...' : isActive ? 'Disable' : 'Enable'}
										</button>
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
