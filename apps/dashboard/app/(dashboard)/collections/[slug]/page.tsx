'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

type EntryRow = {
	id: string;
	[key: string]: unknown;
};

export default function CollectionEntriesPage() {
	const params = useParams();
	const slug = params.slug as string;
	const [entries] = useState<EntryRow[]>([]);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const toggleSelect = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelected(next);
	};

	const toggleAll = () => {
		if (selected.size === entries.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(entries.map((e) => e.id)));
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/collections" className="rounded-lg p-2 hover:bg-accent">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight capitalize">{slug}</h1>
						<p className="text-muted-foreground">Manage entries</p>
					</div>
				</div>
				<Link
					href={`/collections/${slug}/new`}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					New Entry
				</Link>
			</div>

			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search entries..."
						className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				{selected.size > 0 && (
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
					>
						<Trash2 className="h-4 w-4" />
						Delete ({selected.size})
					</button>
				)}
			</div>

			{entries.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12">
					<h3 className="text-lg font-semibold">No entries yet</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Create your first entry in this collection.
					</p>
					<Link
						href={`/collections/${slug}/new`}
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />
						Create Entry
					</Link>
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
								<th className="px-4 py-3 w-10">
									<input
										type="checkbox"
										checked={selected.size === entries.length && entries.length > 0}
										onChange={toggleAll}
										className="h-4 w-4 rounded border-border"
									/>
								</th>
								<th className="px-4 py-3">ID</th>
								<th className="px-4 py-3">Created</th>
								<th className="px-4 py-3 w-12" />
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/50">
									<td className="px-4 py-3">
										<input
											type="checkbox"
											checked={selected.has(entry.id)}
											onChange={() => toggleSelect(entry.id)}
											className="h-4 w-4 rounded border-border"
										/>
									</td>
									<td className="px-4 py-3">
										<Link href={`/collections/${slug}/${entry.id}`} className="text-sm font-medium hover:underline">
											{entry.id}
										</Link>
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{String(entry.createdAt ?? '')}
									</td>
									<td className="px-4 py-3">
										<Link href={`/collections/${slug}/${entry.id}`} className="text-sm text-primary hover:underline">
											Edit
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
