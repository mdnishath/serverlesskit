'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	FolderOpen,
	Image,
	Users,
	Shield,
	Puzzle,
	Settings,
	ChevronLeft,
	ChevronRight,
	Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
	{ label: 'Overview', href: '/', icon: LayoutDashboard },
	{ label: 'Collections', href: '/collections', icon: FolderOpen },
	{ label: 'Media', href: '/media', icon: Image },
	{ label: 'Users', href: '/users', icon: Users },
	{ label: 'Roles', href: '/roles', icon: Shield },
	{ label: 'Plugins', href: '/plugins', icon: Puzzle },
	{ label: 'Settings', href: '/settings', icon: Settings },
];

/**
 * Collapsible sidebar navigation component.
 * @returns Sidebar component
 */
export const Sidebar = () => {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem('sidebar-collapsed');
		if (stored === 'true') setCollapsed(true);
	}, []);

	const toggle = () => {
		const next = !collapsed;
		setCollapsed(next);
		localStorage.setItem('sidebar-collapsed', String(next));
	};

	return (
		<aside
			className={cn(
				'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
				collapsed ? 'w-16' : 'w-64',
			)}
		>
			<div className="flex h-14 items-center justify-between border-b border-border px-4">
				{!collapsed && (
					<Link href="/" className="flex items-center gap-2 font-semibold">
						<Database className="h-5 w-5" />
						<span>ServerlessKit</span>
					</Link>
				)}
				<button
					type="button"
					onClick={toggle}
					className="rounded-md p-1.5 hover:bg-accent"
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
				</button>
			</div>

			<nav className="flex-1 space-y-1 p-2">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
								isActive
									? 'bg-accent text-accent-foreground font-medium'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
								collapsed && 'justify-center px-2',
							)}
							title={collapsed ? item.label : undefined}
						>
							<item.icon className="h-4 w-4 shrink-0" />
							{!collapsed && <span>{item.label}</span>}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
};
