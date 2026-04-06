'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type SeoEntry = {
	collection: string;
	entryId: string;
	metaTitle: string;
	metaDescription: string;
	focusKeyword: string;
	noIndex: boolean;
	updatedAt: string;
};

/**
 * Custom dashboard page for ServerlessKit SEO plugin.
 * Shows SEO health overview across all content types.
 */
export const ServerlesskitSeoPage = () => {
	const [entries, setEntries] = useState<SeoEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<'all' | 'good' | 'needs-work' | 'missing'>('all');

	const fetchData = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/plugins/seo');
			const json = await res.json();
			if (json.ok) setEntries(json.data);
		} catch {}
		setLoading(false);
	};

	useEffect(() => { fetchData(); }, []);

	const getScore = (e: SeoEntry) => {
		let s = 0;
		if (e.metaTitle && e.metaTitle.length >= 30 && e.metaTitle.length <= 60) s++;
		if (e.metaDescription && e.metaDescription.length >= 120 && e.metaDescription.length <= 160) s++;
		if (e.focusKeyword) s++;
		if (!e.noIndex) s++;
		return s;
	};

	const getStatus = (e: SeoEntry) => {
		const s = getScore(e);
		if (!e.metaTitle && !e.metaDescription) return 'missing';
		if (s >= 3) return 'good';
		return 'needs-work';
	};

	const filtered = entries.filter((e) => {
		if (filter !== 'all' && getStatus(e) !== filter) return false;
		if (search) {
			const q = search.toLowerCase();
			return e.collection.includes(q) || e.entryId.includes(q) || e.metaTitle.toLowerCase().includes(q);
		}
		return true;
	});

	const goodCount = entries.filter((e) => getStatus(e) === 'good').length;
	const needsWorkCount = entries.filter((e) => getStatus(e) === 'needs-work').length;
	const missingCount = entries.filter((e) => getStatus(e) === 'missing').length;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
					<Globe className="h-6 w-6 text-emerald-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">ServerlessKit SEO</h1>
					<p className="text-sm text-muted-foreground">SEO health overview for all your content</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-2xl font-bold">{entries.length}</p>
					<p className="text-xs text-muted-foreground">Total Entries</p>
				</div>
				<div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
					<p className="text-2xl font-bold text-green-600">{goodCount}</p>
					<p className="text-xs text-muted-foreground">Good SEO</p>
				</div>
				<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
					<p className="text-2xl font-bold text-yellow-600">{needsWorkCount}</p>
					<p className="text-xs text-muted-foreground">Needs Work</p>
				</div>
				<div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
					<p className="text-2xl font-bold text-red-600">{missingCount}</p>
					<p className="text-xs text-muted-foreground">Missing SEO</p>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by collection, entry, or title..."
						className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</div>
				<div className="flex gap-2">
					{(['all', 'good', 'needs-work', 'missing'] as const).map((f) => (
						<button key={f} type="button" onClick={() => setFilter(f)}
							className={cn('rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
								filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
							{f === 'all' ? 'All' : f === 'good' ? 'Good' : f === 'needs-work' ? 'Needs Work' : 'Missing'}
						</button>
					))}
					<button type="button" onClick={fetchData} className="rounded-lg border border-border p-2 hover:bg-accent" title="Refresh">
						<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
					</button>
				</div>
			</div>

			{/* How to use */}
			{entries.length === 0 && !loading && (
				<div className="rounded-xl border border-border bg-card p-4 sm:p-6">
					<h2 className="text-sm font-semibold">Getting Started</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						SEO data is added per entry. Go to any content type, edit an entry, and you'll see an "SEO" panel below the fields.
						Fill in the meta title, description, and focus keyword to improve your search rankings.
					</p>
				</div>
			)}

			{/* Entry table */}
			{(filtered.length > 0 || loading) && (
				<div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
					{loading ? (
						<div className="space-y-2 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
					) : (
						<table className="w-full min-w-[600px]">
							<thead>
								<tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3">Collection</th>
									<th className="px-4 py-3">Meta Title</th>
									<th className="px-4 py-3">Keyword</th>
									<th className="px-4 py-3">Score</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((entry) => {
									const status = getStatus(entry);
									const score = getScore(entry);
									return (
										<tr key={`${entry.collection}-${entry.entryId}`} className="border-b border-border last:border-0 hover:bg-muted/50">
											<td className="px-4 py-3">
												{status === 'good' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
												{status === 'needs-work' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
												{status === 'missing' && <XCircle className="h-4 w-4 text-red-500" />}
											</td>
											<td className="px-4 py-3">
												<span className="text-xs font-medium">{entry.collection}</span>
												<p className="text-xs text-muted-foreground font-mono">{entry.entryId.slice(0, 8)}...</p>
											</td>
											<td className="px-4 py-3 text-sm max-w-[200px] truncate">{entry.metaTitle || <span className="text-muted-foreground italic">Not set</span>}</td>
											<td className="px-4 py-3 text-xs">{entry.focusKeyword || <span className="text-muted-foreground">—</span>}</td>
											<td className="px-4 py-3">
												<span className={cn('text-xs font-medium',
													score >= 3 ? 'text-green-600' : score >= 2 ? 'text-yellow-600' : 'text-red-500')}>
													{score}/4
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
};
