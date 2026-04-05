'use client';

import Link from 'next/link';
import { Plus, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

type CollectionItem = {
	slug: string;
	name: string;
	fieldCount: number;
	entryCount: number;
	updatedAt: string;
};

const MOCK_COLLECTIONS: CollectionItem[] = [];

export default function CollectionsPage() {
	const [collections] = useState<CollectionItem[]>(MOCK_COLLECTIONS);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Collections</h1>
					<p className="text-muted-foreground">Manage your data collections</p>
				</div>
				<Link
					href="/collections/new"
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					New Collection
				</Link>
			</div>

			{collections.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12">
					<FolderOpen className="h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No collections yet</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Create your first collection to start managing data.
					</p>
					<Link
						href="/collections/new"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<Plus className="h-4 w-4" />
						Create Collection
					</Link>
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
								<th className="px-6 py-3">Name</th>
								<th className="px-6 py-3">Fields</th>
								<th className="px-6 py-3">Entries</th>
								<th className="px-6 py-3">Last Modified</th>
								<th className="px-6 py-3 w-12" />
							</tr>
						</thead>
						<tbody>
							{collections.map((col) => (
								<tr key={col.slug} className="border-b border-border last:border-0 hover:bg-muted/50">
									<td className="px-6 py-4">
										<Link href={`/collections/${col.slug}`} className="font-medium hover:underline">
											{col.name}
										</Link>
										<p className="text-xs text-muted-foreground">{col.slug}</p>
									</td>
									<td className="px-6 py-4 text-sm">{col.fieldCount}</td>
									<td className="px-6 py-4 text-sm">{col.entryCount}</td>
									<td className="px-6 py-4 text-sm text-muted-foreground">{col.updatedAt}</td>
									<td className="px-6 py-4">
										<button type="button" className="rounded p-1 hover:bg-accent">
											<MoreHorizontal className="h-4 w-4" />
										</button>
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
