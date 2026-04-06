'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Search, RefreshCw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuditEntry = {
	id: number;
	event: string;
	collection: string;
	entryId: string;
	userId: string;
	timestamp: string;
	details: string;
};

const EVENT_COLORS: Record<string, string> = {
	create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
	update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/**
 * Custom dashboard page for the Audit Log plugin.
 * Shows activity log with search and filter — like a WordPress activity plugin.
 */
export const AuditLogPage = ({ canManage }: { canManage: boolean }) => {
	const [logs, setLogs] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [eventFilter, setEventFilter] = useState<string>('all');

	const fetchLogs = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/plugins/audit-log/logs');
			const json = await res.json();
			if (json.ok) setLogs(json.data);
		} catch {}
		setLoading(false);
	};

	useEffect(() => { fetchLogs(); }, []);

	const filtered = logs.filter((log) => {
		if (eventFilter !== 'all' && log.event !== eventFilter) return false;
		if (search) {
			const q = search.toLowerCase();
			return log.collection.toLowerCase().includes(q) || log.entryId.toLowerCase().includes(q) || log.userId.toLowerCase().includes(q);
		}
		return true;
	});

	const formatTime = (iso: string) => {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return d.toLocaleDateString();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
					<ShieldCheck className="h-6 w-6 text-red-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Audit Log</h1>
					<p className="text-sm text-muted-foreground">Track all content changes across your CMS</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-2xl font-bold">{logs.length}</p>
					<p className="text-xs text-muted-foreground">Total Events</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-2xl font-bold">{logs.filter((l) => l.event === 'create').length}</p>
					<p className="text-xs text-muted-foreground">Creates</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-2xl font-bold">{logs.filter((l) => l.event === 'update').length}</p>
					<p className="text-xs text-muted-foreground">Updates</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-2xl font-bold">{logs.filter((l) => l.event === 'delete').length}</p>
					<p className="text-xs text-muted-foreground">Deletes</p>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by collection, entry ID, or user..."
						className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</div>
				<div className="flex gap-2">
					{['all', 'create', 'update', 'delete'].map((ev) => (
						<button key={ev} type="button" onClick={() => setEventFilter(ev)}
							className={cn('rounded-lg px-3 py-2 text-xs font-medium transition-colors',
								eventFilter === ev ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
							{ev === 'all' ? 'All' : ev.charAt(0).toUpperCase() + ev.slice(1)}
						</button>
					))}
					<button type="button" onClick={fetchLogs} className="rounded-lg border border-border p-2 hover:bg-accent" title="Refresh">
						<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
					</button>
				</div>
			</div>

			{/* Log Table */}
			<div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
				{loading ? (
					<div className="space-y-2 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-12">
						<ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
						<p className="mt-3 text-sm text-muted-foreground">
							{logs.length === 0 ? 'No activity yet. Create, update, or delete an entry to see logs.' : 'No logs match your filter.'}
						</p>
					</div>
				) : (
					<table className="w-full min-w-[600px]">
						<thead>
							<tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
								<th className="px-4 py-3">Event</th>
								<th className="px-4 py-3">Collection</th>
								<th className="px-4 py-3">Entry ID</th>
								<th className="px-4 py-3">User</th>
								<th className="px-4 py-3">Time</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((log) => (
								<tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50">
									<td className="px-4 py-3">
										<span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', EVENT_COLORS[log.event] ?? 'bg-muted text-muted-foreground')}>
											{log.event}
										</span>
									</td>
									<td className="px-4 py-3 text-sm font-medium">{log.collection}</td>
									<td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">{log.entryId || '—'}</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">{log.userId || 'system'}</td>
									<td className="px-4 py-3 text-sm text-muted-foreground" title={log.timestamp}>{formatTime(log.timestamp)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};
