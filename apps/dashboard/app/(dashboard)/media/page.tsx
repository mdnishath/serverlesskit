'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image, FileText, Film, Music, Search, Trash2, X, File, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaItem = {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	createdAt: string;
};

type FilterType = 'all' | 'image' | 'video' | 'document' | 'audio';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: typeof Image }[] = [
	{ value: 'all', label: 'All', icon: File },
	{ value: 'image', label: 'Images', icon: Image },
	{ value: 'video', label: 'Videos', icon: Film },
	{ value: 'document', label: 'Documents', icon: FileText },
	{ value: 'audio', label: 'Audio', icon: Music },
];

/** Formats bytes to human-readable size */
const formatSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Gets the filter category from a MIME type */
const getCategoryFromMime = (mime: string): FilterType => {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	if (mime.startsWith('audio/')) return 'audio';
	return 'document';
};

import { usePermissions } from '@/lib/use-permissions';

export default function MediaPage() {
	const [items, setItems] = useState<MediaItem[]>([]);
	const [filter, setFilter] = useState<FilterType>('all');
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<MediaItem | null>(null);
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [loading, setLoading] = useState(true);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { can } = usePermissions();
	const canUpload = can('media', 'create');
	const canDeleteMedia = can('media', 'delete');

	useEffect(() => {
		fetch('/api/media').then((r) => r.json())
			.then((json) => { if (json.ok) setItems(json.data); })
			.finally(() => setLoading(false));
	}, []);

	const filtered = items.filter((item) => {
		if (filter !== 'all' && getCategoryFromMime(item.mimeType) !== filter) return false;
		if (search && !item.originalName.toLowerCase().includes(search.toLowerCase())) return false;
		return true;
	});

	const handleUpload = useCallback(async (files: FileList | File[]) => {
		setUploading(true);
		for (const file of Array.from(files)) {
			const formData = new FormData();
			formData.append('file', file);
			try {
				const res = await fetch('/api/upload', { method: 'POST', body: formData });
				const json = await res.json();
				if (json.ok) setItems((prev) => [json.data, ...prev]);
			} catch { /* upload failed */ }
		}
		setUploading(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
	}, [handleUpload]);

	const handleDelete = async (id: string) => {
		await fetch('/api/media', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});
		setItems((prev) => prev.filter((i) => i.id !== id));
		if (selected?.id === id) setSelected(null);
	};

	const handleCopyUrl = (url: string) => {
		navigator.clipboard.writeText(window.location.origin + url);
	};

	/** Renders a thumbnail or icon based on MIME type */
	const renderThumb = (item: MediaItem, size: 'sm' | 'lg') => {
		const cls = size === 'sm' ? 'h-28 w-full object-cover' : 'h-40 w-full object-contain';
		if (item.mimeType.startsWith('image/')) {
			return <img src={item.url} alt={item.originalName} className={cls} />;
		}
		const Icon = item.mimeType.startsWith('video/') ? Film
			: item.mimeType.startsWith('audio/') ? Music : FileText;
		return (
			<div className={cn('flex items-center justify-center', size === 'sm' ? 'h-28' : 'h-40')}>
				<Icon className={cn(size === 'sm' ? 'h-8 w-8' : 'h-12 w-12', 'text-muted-foreground')} />
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
				<p className="text-muted-foreground">Upload and manage media files</p>
			</div>

			{canUpload && (
				<div
					onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
					onDragLeave={() => setDragOver(false)}
					onDrop={handleDrop}
					onClick={() => fileInputRef.current?.click()}
					className={cn(
						'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
						dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
					)}>
					<Upload className={cn('h-10 w-10', dragOver ? 'text-primary' : 'text-muted-foreground/50')} />
					<p className="mt-3 text-sm font-medium">
						{uploading ? 'Uploading...' : 'Drop files here or click to upload'}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">Max 50MB per file</p>
					<input ref={fileInputRef} type="file" multiple className="hidden"
						onChange={(e) => e.target.files && handleUpload(e.target.files)} />
				</div>
			)}

			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
						placeholder="Search files..."
						className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</div>
				<div className="flex gap-1">
					{FILTER_OPTIONS.map((opt) => (
						<button key={opt.value} type="button" onClick={() => setFilter(opt.value)}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
								filter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
							)}>
							<opt.icon className="h-3.5 w-3.5" />
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
					))}
				</div>
			) : (
				<div className="flex gap-6">
					<div className="flex-1">
						{filtered.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12">
								<Image className="h-12 w-12 text-muted-foreground/50" />
								<p className="mt-4 text-sm text-muted-foreground">
									{items.length === 0 ? 'No media files yet' : 'No files match your filter'}
								</p>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{filtered.map((item) => (
									<button key={item.id} type="button" onClick={() => setSelected(item)}
										className={cn(
											'group relative flex flex-col overflow-hidden rounded-lg border transition-colors',
											selected?.id === item.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
										)}>
										<div className="bg-muted">{renderThumb(item, 'sm')}</div>
										<div className="p-2">
											<p className="truncate text-xs font-medium">{item.originalName}</p>
											<p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					{selected && (
						<div className="w-72 shrink-0 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold">Details</h3>
								<button type="button" onClick={() => setSelected(null)} className="rounded p-1 hover:bg-accent">
									<X className="h-4 w-4" />
								</button>
							</div>

							<div className="overflow-hidden rounded-lg bg-muted">{renderThumb(selected, 'lg')}</div>

							<div className="space-y-2 text-sm">
								<div>
									<span className="text-muted-foreground">Filename</span>
									<p className="font-medium truncate">{selected.originalName}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Type</span>
									<p className="font-medium">{selected.mimeType}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Size</span>
									<p className="font-medium">{formatSize(selected.size)}</p>
								</div>
								<div>
									<span className="text-muted-foreground">URL</span>
									<p className="truncate font-mono text-xs">{selected.url}</p>
								</div>
							</div>

							<button type="button" onClick={() => handleCopyUrl(selected.url)}
								className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm hover:bg-accent">
								<Link2 className="h-4 w-4" />
								Copy URL
							</button>

							{canDeleteMedia && (
								<button type="button" onClick={() => handleDelete(selected.id)}
									className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive py-2 text-sm text-destructive hover:bg-destructive/10">
									<Trash2 className="h-4 w-4" />
									Delete
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
