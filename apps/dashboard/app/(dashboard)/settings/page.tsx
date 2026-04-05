export default function SettingsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">System configuration</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					Configure general settings, API keys, storage, email, and more.
				</p>
			</div>
		</div>
	);
}
