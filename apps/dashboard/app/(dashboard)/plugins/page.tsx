'use client';

import { useState } from 'react';
import { Puzzle, Settings, PowerOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/use-permissions';

type PluginStatus = 'active' | 'inactive' | 'error';
type PluginCard = { name: string; version: string; description: string; author: string; status: PluginStatus; error?: string };

const MOCK_PLUGINS: PluginCard[] = [
	{ name: 'email', version: '1.0.0', description: 'Send emails via SMTP/Resend on CRUD events', author: 'ServerlessKit', status: 'inactive' },
	{ name: 'backup', version: '1.0.0', description: 'Scheduled database backups to storage', author: 'ServerlessKit', status: 'inactive' },
	{ name: 'webhook', version: '1.0.0', description: 'Send webhooks on CRUD events', author: 'ServerlessKit', status: 'inactive' },
];

const STATUS_CONFIG: Record<PluginStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
	active: { icon: CheckCircle2, color: 'text-green-600', label: 'Active' },
	inactive: { icon: PowerOff, color: 'text-muted-foreground', label: 'Inactive' },
	error: { icon: AlertCircle, color: 'text-destructive', label: 'Error' },
};

export default function PluginsPage() {
	const { can } = usePermissions();
	const canManage = can('plugins', 'update');
	const [plugins, setPlugins] = useState<PluginCard[]>(MOCK_PLUGINS);

	const togglePlugin = (name: string) => {
		if (!canManage) { alert('You do not have permission to manage plugins'); return; }
		setPlugins((prev) => prev.map((p) => p.name === name ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p));
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Plugins</h1>
				<p className="text-sm text-muted-foreground">Extend functionality with plugins{!canManage && ' — read only'}</p>
			</div>

			{plugins.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12">
					<Puzzle className="h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No plugins installed</h3>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{plugins.map((plugin) => {
						const statusCfg = STATUS_CONFIG[plugin.status];
						const StatusIcon = statusCfg.icon;
						return (
							<div key={plugin.name} className="rounded-xl border border-border bg-card p-5 shadow-sm">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
											<Puzzle className="h-5 w-5 text-primary" />
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
								<div className="mt-4 flex items-center justify-between border-t border-border pt-3">
									<span className="text-xs text-muted-foreground">by {plugin.author}</span>
									{canManage && (
										<div className="flex gap-2">
											<button type="button" className="rounded-lg border border-border p-1.5 hover:bg-accent" aria-label="Settings">
												<Settings className="h-3.5 w-3.5" />
											</button>
											<button type="button" onClick={() => togglePlugin(plugin.name)}
												className={cn('rounded-lg px-3 py-1.5 text-xs font-medium',
													plugin.status === 'active' ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
												{plugin.status === 'active' ? 'Disable' : 'Enable'}
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
}
