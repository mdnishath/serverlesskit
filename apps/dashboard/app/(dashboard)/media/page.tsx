export default function MediaPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
				<p className="text-muted-foreground">Upload and manage media files</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					No media files yet. Upload your first file to get started.
				</p>
			</div>
		</div>
	);
}
