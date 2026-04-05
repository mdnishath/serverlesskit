'use client';

import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePermissions, hasPerm } from '@/lib/use-permissions';

type EntryRow = { id: string; [key: string]: unknown };
type CollectionMeta = { name: string; slug: string; fields: Record<string, { type: string }> };

export default function CollectionEntriesPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const [entries, setEntries] = useState<EntryRow[]>([]);
	const [collection, setCollection] = useState<CollectionMeta | null>(null);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const { perms } = usePermissions();

	useEffect(() => {
		const load = async () => {
			try {
				const [colRes, entryRes] = await Promise.all([
					fetch('/api/collections'),
					fetch(`/api/content/${slug}?limit=100`),
				]);
				const colJson = await colRes.json();
				const entryJson = await entryRes.json();

				if (colJson.ok) {
					const match = colJson.data.find((c: CollectionMeta) => c.slug === slug);
					if (match) setCollection(match);
				}
				if (entryJson.ok) setEntries(entryJson.data ?? []);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [slug]);
	const canCreate = hasPerm(perms, slug, 'create');
	const canEdit = hasPerm(perms, slug, 'update');
	const canDelete = hasPerm(perms, slug, 'delete');
	const hasActions = canEdit || canDelete;

	const fieldEntries = collection
		? Object.entries(collection.fields as Record<string, { type: string }>).slice(0, 5)
		: [];
	const fieldNames = fieldEntries.map(([name]) => name);
	const fieldTypes = Object.fromEntries(fieldEntries.map(([name, def]) => [name, def.type]));

	const filtered = search
		? entries.filter((e) => Object.values(e).some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
		: entries;

	const toggleSelect = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id); else next.add(id);
		setSelected(next);
	};
	const toggleAll = () => {
		if (selected.size === filtered.length) setSelected(new Set());
		else setSelected(new Set(filtered.map((e) => e.id)));
	};

	const handleBulkDelete = async () => {
		for (const id of selected) await fetch(`/api/content/${slug}/${id}`, { method: 'DELETE' });
		setEntries((prev) => prev.filter((e) => !selected.has(e.id)));
		setSelected(new Set());
	};

	const handleDeleteOne = async (id: string) => {
		if (!confirm('Delete this entry?')) return;
		await fetch(`/api/content/${slug}/${id}`, { method: 'DELETE' });
		setEntries((prev) => prev.filter((e) => e.id !== id));
	};

	const renderCell = (fieldName: string, val: unknown) => {
		const str = String(val ?? '');
		if (fieldTypes[fieldName] === 'media' && str.startsWith('/uploads/')) {
			return <img src={str} alt="" className="h-10 w-10 rounded object-cover" />;
		}
		return <span className="truncate">{str}</span>;
	};

	const displayName = collection?.name ?? slug;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button type="button" onClick={() => router.back()} className="rounded-lg p-2 hover:bg-accent">
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
						<p className="text-muted-foreground">{entries.length} entries</p>
					</div>
				</div>
				{canCreate && (
					<button type="button" onClick={() => router.push(`/collections/${slug}/new`)}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Plus className="h-4 w-4" /> New Entry
					</button>
				)}
			</div>

			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries..."
						className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</div>
				{canDelete && selected.size > 0 && (
					<button type="button" onClick={handleBulkDelete}
						className="inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
						<Trash2 className="h-4 w-4" /> Delete ({selected.size})
					</button>
				)}
			</div>

			{loading ? (
				<div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-muted" />)}</div>
			) : filtered.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12">
					<h3 className="text-lg font-semibold">No entries yet</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						{canCreate ? 'Create your first entry.' : 'No entries have been created yet.'}
					</p>
					{canCreate && (
						<button type="button" onClick={() => router.push(`/collections/${slug}/new`)}
							className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
							<Plus className="h-4 w-4" /> Create Entry
						</button>
					)}
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card shadow-sm overflow-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
								{canDelete && (
									<th className="px-4 py-3 w-10">
										<input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
											onChange={toggleAll} className="h-4 w-4 rounded border-border" />
									</th>
								)}
								{fieldNames.map((f) => (
									<th key={f} className="px-4 py-3 capitalize">{f.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</th>
								))}
								{hasActions && <th className="px-4 py-3 w-32 text-right">Actions</th>}
							</tr>
						</thead>
						<tbody>
							{filtered.map((entry) => (
								<tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/50">
									{canDelete && (
										<td className="px-4 py-3">
											<input type="checkbox" checked={selected.has(entry.id)}
												onChange={() => toggleSelect(entry.id)} className="h-4 w-4 rounded border-border" />
										</td>
									)}
									{fieldNames.map((f) => (
										<td key={f} className="px-4 py-3 text-sm max-w-[200px]">{renderCell(f, entry[f])}</td>
									))}
									{hasActions && (
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-1">
												{canEdit && (
													<button type="button" onClick={() => router.push(`/collections/${slug}/${entry.id}`)}
														className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-accent">Edit</button>
												)}
												{canDelete && (
													<button type="button" onClick={() => handleDeleteOne(entry.id)}
														className="rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
												)}
											</div>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
