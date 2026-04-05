export default function CollectionsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Collections</h1>
				<p className="text-muted-foreground">Manage your data collections</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					No collections yet. Create your first collection to start managing data.
				</p>
			</div>
		</div>
	);
}
