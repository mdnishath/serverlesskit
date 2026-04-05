'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Image, X, Check, FileText, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

type MediaItem = {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
};

type MediaPickerProps = {
	open: boolean;
	onClose: () => void;
	onSelect: (media: MediaItem) => void;
};

/**
 * Modal for selecting or uploading media files.
 * Loads existing media from DB and supports uploading new files.
 * @param props - open state, onClose, onSelect callbacks
 * @returns MediaPicker modal component
 */
export const MediaPicker = ({ open, onClose, onSelect }: MediaPickerProps) => {
	const [items, setItems] = useState<MediaItem[]>([]);
	const [selected, setSelected] = useState<MediaItem | null>(null);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		setSelected(null);
		fetch('/api/media')
			.then((res) => res.json())
			.then((json) => { if (json.ok) setItems(json.data); })
			.finally(() => setLoading(false));
	}, [open]);

	if (!open) return null;

	const handleUpload = async (files: FileList) => {
		setUploading(true);
		for (const file of Array.from(files)) {
			const formData = new FormData();
			formData.append('file', file);
			try {
				const res = await fetch('/api/upload', { method: 'POST', body: formData });
				const json = await res.json();
				if (json.ok) {
					setItems((prev) => [json.data, ...prev]);
					setSelected(json.data);
				}
			} catch { /* upload failed */ }
		}
		setUploading(false);
	};

	const handleConfirm = () => {
		if (selected) {
			onSelect(selected);
			onClose();
		}
	};

	const renderThumb = (item: MediaItem) => {
		if (item.mimeType.startsWith('image/')) {
			return <img src={item.url} alt={item.originalName} className="h-full w-full object-cover" />;
		}
		const Icon = item.mimeType.startsWith('video/') ? Film
			: item.mimeType.startsWith('audio/') ? Music : FileText;
		return <Icon className="h-6 w-6 text-muted-foreground" />;
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
				<div className="flex items-center justify-between border-b border-border px-6 py-4">
					<h2 className="text-lg font-semibold">Select Media</h2>
					<button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="p-6 space-y-4">
					<div onClick={() => fileInputRef.current?.click()}
						className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 hover:border-primary/50">
						<Upload className="h-5 w-5 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">
							{uploading ? 'Uploading...' : 'Upload new file'}
						</span>
						<input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
							className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
					</div>

					{loading ? (
						<div className="grid grid-cols-4 gap-2">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
							))}
						</div>
					) : items.length === 0 ? (
						<div className="flex flex-col items-center py-8">
							<Image className="h-10 w-10 text-muted-foreground/50" />
							<p className="mt-2 text-sm text-muted-foreground">No media files yet. Upload one above.</p>
						</div>
					) : (
						<div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto">
							{items.map((item) => (
								<button key={item.id} type="button" onClick={() => setSelected(item)}
									className={cn(
										'relative flex h-24 items-center justify-center overflow-hidden rounded-lg border bg-muted transition-colors',
										selected?.id === item.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
									)}>
									{renderThumb(item)}
									{selected?.id === item.id && (
										<div className="absolute right-1 top-1 rounded-full bg-primary p-0.5">
											<Check className="h-3 w-3 text-primary-foreground" />
										</div>
									)}
									<span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
										{item.originalName}
									</span>
								</button>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 border-t border-border px-6 py-4">
					<button type="button" onClick={onClose}
						className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
						Cancel
					</button>
					<button type="button" onClick={handleConfirm} disabled={!selected}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
						Select
					</button>
				</div>
			</div>
		</div>
	);
};
