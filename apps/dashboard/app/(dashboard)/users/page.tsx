export default function UsersPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Users</h1>
				<p className="text-muted-foreground">Manage user accounts</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
				<p className="text-sm text-muted-foreground">
					No users found. Invite your first team member to collaborate.
				</p>
			</div>
		</div>
	);
}
