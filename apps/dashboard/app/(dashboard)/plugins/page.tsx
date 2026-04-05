export default function PluginsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Plugins</h1>
				<p className="text-muted-foreground">Extend functionality with plugins</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					No plugins installed. Browse the plugin registry to add new capabilities.
				</p>
			</div>
		</div>
	);
}
