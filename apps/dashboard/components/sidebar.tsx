'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	LayoutDashboard, FolderOpen, Image, Users, Shield, Puzzle, Settings,
	ChevronLeft, ChevronRight, ChevronDown, Database, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { hasPerm } from '@/lib/use-permissions';
import { useCachedFetch } from '@/lib/use-cached-fetch';
import { prefetchRoute } from '@/lib/prefetch';

type ContentType = { slug: string; name: string };

/**
 * Collapsible sidebar with role-based visibility.
 * Uses shared AuthProvider — no separate /api/auth/me fetch.
 * Prefetches route data on hover for instant navigation.
 * @returns Sidebar component
 */
export const Sidebar = () => {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const [collapsed, setCollapsed] = useState(false);
	const [contentOpen, setContentOpen] = useState(true);
	const [adminOpen, setAdminOpen] = useState(true);

	/* Use cached fetch instead of raw fetch — no refetch on every navigation */
	const { data: colData } = useCachedFetch<ContentType[]>('/api/collections');
	const contentTypes = (colData ?? []).map((c) => ({ slug: c.slug, name: c.name }));

	useEffect(() => {
		const stored = localStorage.getItem('sidebar-collapsed');
		if (stored === 'true') setCollapsed(true);
	}, []);

	const toggle = () => {
		const next = !collapsed;
		setCollapsed(next);
		localStorage.setItem('sidebar-collapsed', String(next));
	};

	const perms = user?.permissions ?? [];
	const canAccess = (resource: string) => hasPerm(perms, resource, 'read');
	const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

	const navClass = (href: string) => cn(
		'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
		isActive(href) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
		collapsed && 'justify-center px-2',
	);

	/** Prefetch both the route JS chunk and API data on hover */
	const handlePrefetch = useCallback((href: string) => {
		router.prefetch(href);
		prefetchRoute(href);
	}, [router]);

	const NavItem = ({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) => (
		<Link href={href} prefetch={true}
			className={navClass(href)}
			title={collapsed ? label : undefined}
			onMouseEnter={() => handlePrefetch(href)}
			onFocus={() => handlePrefetch(href)}>
			<Icon className="h-4 w-4 shrink-0" />
			{!collapsed && <span>{label}</span>}
		</Link>
	);

	const SectionHeader = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => {
		if (collapsed) return <div className="my-2 border-t border-border" />;
		return (
			<button type="button" onClick={onToggle}
				className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground">
				<span>{label}</span>
				<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
			</button>
		);
	};

	const visibleContentTypes = contentTypes.filter((ct) => canAccess(ct.slug));
	const adminItems = [
		{ href: '/collections', icon: FolderOpen, label: 'Content Types', resource: 'collections' },
		{ href: '/users', icon: Users, label: 'Users', resource: 'users' },
		{ href: '/roles', icon: Shield, label: 'Roles', resource: 'roles' },
		{ href: '/plugins', icon: Puzzle, label: 'Plugins', resource: 'plugins' },
		{ href: '/settings', icon: Settings, label: 'Settings', resource: 'settings' },
	].filter((item) => canAccess(item.resource));

	return (
		<aside className={cn(
			'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
			collapsed ? 'w-16' : 'w-64',
		)}>
			<div className="flex h-14 items-center justify-between border-b border-border px-4">
				{!collapsed && (
					<Link href="/" className="flex items-center gap-2 font-semibold">
						<Database className="h-5 w-5" /><span>ServerlessKit</span>
					</Link>
				)}
				<button type="button" onClick={toggle} className="rounded-md p-1.5 hover:bg-accent"
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
					{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto p-2">
				<NavItem href="/" icon={LayoutDashboard} label="Overview" />

				<SectionHeader label="Content" open={contentOpen} onToggle={() => setContentOpen(!contentOpen)} />
				{(contentOpen || collapsed) && (
					<div className="space-y-0.5">
						{visibleContentTypes.map((ct) => (
							<NavItem key={ct.slug} href={`/collections/${ct.slug}`} icon={FileText} label={ct.name} />
						))}
						<NavItem href="/media" icon={Image} label="Media" />
					</div>
				)}

				{adminItems.length > 0 && (
					<>
						<SectionHeader label="Admin" open={adminOpen} onToggle={() => setAdminOpen(!adminOpen)} />
						{(adminOpen || collapsed) && (
							<div className="space-y-0.5">
								{adminItems.map((item) => (
									<NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
								))}
							</div>
						)}
					</>
				)}
			</nav>

			{!collapsed && (
				<div className="border-t border-border px-4 py-3">
					<p className="text-[10px] text-muted-foreground/50">ServerlessKit v0.1.0</p>
				</div>
			)}
		</aside>
	);
};
