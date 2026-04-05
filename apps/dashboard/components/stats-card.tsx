import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatsCardProps = {
	title: string;
	value: string | number;
	icon: ReactNode;
	description?: string;
	className?: string;
};

/**
 * Dashboard stats card component.
 * @param props - Card properties
 * @returns StatsCard component
 */
export const StatsCard = ({ title, value, icon, description, className }: StatsCardProps) => {
	return (
		<div className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}>
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium text-muted-foreground">{title}</p>
				<div className="text-muted-foreground">{icon}</div>
			</div>
			<p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
			{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
		</div>
	);
};
