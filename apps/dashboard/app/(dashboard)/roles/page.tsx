export default function RolesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
				<p className="text-muted-foreground">Configure access control</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					Define roles and assign granular permissions to control what each user can do.
				</p>
			</div>
		</div>
	);
}
