import { FolderOpen, Users, Database, HardDrive } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';

export default function OverviewPage() {
	return (
		<div className="space-y-4 sm:space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
				<p className="text-sm text-muted-foreground">Welcome to ServerlessKit</p>
			</div>

			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Collections"
					value={0}
					icon={<FolderOpen className="h-5 w-5" />}
					description="Data schemas defined"
				/>
				<StatsCard
					title="Total Entries"
					value={0}
					icon={<Database className="h-5 w-5" />}
					description="Across all collections"
				/>
				<StatsCard
					title="Total Users"
					value={1}
					icon={<Users className="h-5 w-5" />}
					description="Registered users"
				/>
				<StatsCard
					title="Storage Used"
					value="0 MB"
					icon={<HardDrive className="h-5 w-5" />}
					description="Media storage"
				/>
			</div>

			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-lg font-semibold">Recent Activity</h2>
				<p className="mt-2 text-sm text-muted-foreground">No recent activity yet. Create your first collection to get started.</p>
			</div>
		</div>
	);
}
