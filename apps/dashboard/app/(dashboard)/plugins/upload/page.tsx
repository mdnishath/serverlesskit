'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Plugin upload page — accepts a .zip file containing a manifest.json.
 * Extracts plugin metadata and registers it in the system.
 */
export default function PluginUploadPage() {
	const router = useRouter();
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUpload = async (file: File) => {
		if (!file.name.endsWith('.zip')) {
			setResult({ ok: false, message: 'Please upload a .zip file containing a manifest.json' });
			return;
		}
		setUploading(true); setResult(null);
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/plugins/upload', { method: 'POST', body: formData });
			const json = await res.json();
			setResult({ ok: json.ok, message: json.ok ? `Plugin "${json.data?.name}" installed successfully` : (json.error?.message ?? 'Upload failed') });
			if (json.ok) {
				setTimeout(() => router.push('/plugins'), 2000);
			}
		} catch {
			setResult({ ok: false, message: 'Network error' });
		}
		setUploading(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault(); setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) handleUpload(file);
	};

	return (
		<div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
			<div className="flex items-center gap-3">
				<button type="button" onClick={() => router.push('/plugins')} className="rounded-lg p-2 hover:bg-accent">
					<ArrowLeft className="h-4 w-4" />
				</button>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Upload Plugin</h1>
					<p className="text-sm text-muted-foreground">Install a plugin from a .zip file</p>
				</div>
			</div>

			{result && (
				<div className={cn('flex items-start gap-3 rounded-xl border p-4',
					result.ok ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/5')}>
					{result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />}
					<p className={cn('text-sm', result.ok ? 'text-green-600' : 'text-destructive')}>{result.message}</p>
				</div>
			)}

			<div
				onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				className={cn(
					'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
					dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
				)}>
				{uploading ? (
					<div className="flex flex-col items-center gap-3">
						<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p className="text-sm font-medium">Installing plugin...</p>
					</div>
				) : (
					<>
						<FileArchive className={cn('h-12 w-12', dragOver ? 'text-primary' : 'text-muted-foreground/50')} />
						<p className="mt-4 text-sm font-medium">Drop a .zip file here or click to browse</p>
						<p className="mt-1 text-xs text-muted-foreground">Must contain a manifest.json file</p>
					</>
				)}
				<input ref={fileInputRef} type="file" accept=".zip" className="hidden"
					onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
			</div>

			<div className="rounded-xl border border-border bg-card p-4 sm:p-6">
				<h2 className="text-sm font-semibold">Plugin Package Format</h2>
				<p className="mt-2 text-sm text-muted-foreground">Your .zip should contain a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">manifest.json</code> file:</p>
				<pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Your Name",
  "category": "automation",
  "features": [
    "Feature one description",
    "Feature two description"
  ],
  "hooks": ["afterCreate", "afterUpdate"],
  "settings": [
    {
      "key": "apiUrl",
      "label": "API URL",
      "type": "url",
      "required": true
    }
  ]
}`}
				</pre>
			</div>
		</div>
	);
}
