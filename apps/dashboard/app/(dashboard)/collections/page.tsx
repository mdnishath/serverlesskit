'use client';

import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/lib/use-permissions';
import { useCachedFetch } from '@/lib/use-cached-fetch';

type CollectionItem = { slug: string; name: string; description: string; fieldCount: number; timestamps: boolean; softDelete: boolean };

export default function CollectionsPage() {
	const router = useRouter();
	const { can } = usePermissions();
	const canCreate = can('collections', 'create');
	const canDelete = can('collections', 'delete');

	const { data: collections, loading, invalidate } = useCachedFetch<CollectionItem[]>('/api/collections');

	const handleDelete = async (slug: string, name: string) => {
		if (!canDelete) { alert('You do not have permission to delete content types'); return; }
		if (!confirm(`Delete content type "${name}"? This will remove all its data.`)) return;
		const res = await fetch(`/api/collections/${slug}`, { method: 'DELETE' });
		const json = await res.json();
		if (json.ok) invalidate();
		else alert(json.error?.message ?? 'Failed to delete');
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Content Types</h1>
					<p className="text-muted-foreground">Manage your content types</p>
				</div>
				{canCreate && (
					<button type="button" onClick={() => router.push('/collections/new')}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
						<Plus className="h-4 w-4" /> New Content Type
					</button>
				)}
			</div>

			{loading ? (
				<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted" />)}</div>
			) : (collections ?? []).length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12">
					<FolderOpen className="h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No content types yet</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						{canCreate ? 'Create your first content type to start managing data.' : 'No content types have been created yet.'}
					</p>
					{canCreate && (
						<button type="button" onClick={() => router.push('/collections/new')}
							className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
							<Plus className="h-4 w-4" /> Create Content Type
						</button>
					)}
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
								<th className="px-6 py-3">Name</th>
								<th className="px-6 py-3">Fields</th>
								<th className="px-6 py-3">Options</th>
								<th className="px-6 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{(collections ?? []).map((col) => (
								<tr key={col.slug} className="border-b border-border last:border-0 hover:bg-muted/50">
									<td className="px-6 py-4">
										<button type="button" onClick={() => router.push(`/collections/${col.slug}`)} className="font-medium hover:underline text-left">
											{col.name}
										</button>
										<p className="text-xs text-muted-foreground">{col.slug}</p>
									</td>
									<td className="px-6 py-4 text-sm">{col.fieldCount} fields</td>
									<td className="px-6 py-4 text-sm text-muted-foreground">
										{[col.timestamps && 'timestamps', col.softDelete && 'soft-delete'].filter(Boolean).join(', ') || 'none'}
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center justify-end gap-1">
											<button type="button" onClick={() => router.push(`/collections/${col.slug}`)}
												className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-accent" title="View entries">
												<ExternalLink className="h-3.5 w-3.5" /> Entries
											</button>
											{canDelete && (
												<button type="button" onClick={() => handleDelete(col.slug, col.name)}
													className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10" title="Delete">
													<Trash2 className="h-3.5 w-3.5" /> Delete
												</button>
											)}
										</div>
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
