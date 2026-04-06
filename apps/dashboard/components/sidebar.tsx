'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	LayoutDashboard, FolderOpen, Image, Users, Shield, Puzzle, Settings,
	ChevronLeft, ChevronRight, ChevronDown, Database, FileText,
	Webhook, ShieldCheck, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { hasPerm } from '@/lib/use-permissions';
import { useCachedFetch } from '@/lib/use-cached-fetch';
import { prefetchRoute } from '@/lib/prefetch';
import { onPluginMenuUpdate } from '@/lib/plugin-events';

type ContentType = { slug: string; name: string };
type PluginMenu = { name: string; label: string; icon: string };

/** Maps plugin icon string to Lucide component */
const PLUGIN_ICONS: Record<string, typeof Puzzle> = {
	webhook: Webhook,
	shield: ShieldCheck,
	link: Link2,
	puzzle: Puzzle,
};

/**
 * Collapsible sidebar with mobile support and plugin menu pages.
 * On mobile, calls onNavigate to close the drawer after link click.
 * Active plugins with dashboardMenu show as sidebar items.
 * @param props - initialCollections, pluginMenus, onNavigate callback
 */
export const Sidebar = ({
	initialCollections = [],
	pluginMenus = [],
	onNavigate,
}: {
	initialCollections?: ContentType[];
	pluginMenus?: PluginMenu[];
	onNavigate?: () => void;
}) => {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const [collapsed, setCollapsed] = useState(false);
	const [contentOpen, setContentOpen] = useState(true);
	const [adminOpen, setAdminOpen] = useState(true);

	const { data: freshData } = useCachedFetch<ContentType[]>('/api/collections');
	const contentTypes = (freshData ?? initialCollections).map((c) => ({ slug: c.slug, name: c.name }));
	const [pluginsOpen, setPluginsOpen] = useState(true);
	const [activePluginMenus, setActivePluginMenus] = useState<PluginMenu[]>(pluginMenus);

	/* Listen for plugin enable/disable events to update sidebar instantly */
	useEffect(() => {
		return onPluginMenuUpdate((menus) => setActivePluginMenus(menus));
	}, []);

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
		'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
		isActive(href) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
		collapsed && 'justify-center px-2',
	);

	const handlePrefetch = useCallback((href: string) => {
		router.prefetch(href);
		prefetchRoute(href);
	}, [router]);

	const NavItem = ({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) => (
		<Link href={href} prefetch={true}
			className={navClass(href)}
			title={collapsed ? label : undefined}
			onMouseEnter={() => handlePrefetch(href)}
			onFocus={() => handlePrefetch(href)}
			onClick={onNavigate}>
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
			'flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
			collapsed ? 'w-16' : 'w-64',
		)}>
			<div className="flex h-14 items-center justify-between border-b border-border px-4">
				{!collapsed && (
					<Link href="/" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
						<Database className="h-5 w-5" /><span>ServerlessKit</span>
					</Link>
				)}
				<button type="button" onClick={toggle} className="hidden rounded-md p-2 hover:bg-accent md:inline-flex"
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

				{activePluginMenus.length > 0 && (
					<>
						<SectionHeader label="Plugins" open={pluginsOpen} onToggle={() => setPluginsOpen(!pluginsOpen)} />
						{(pluginsOpen || collapsed) && (
							<div className="space-y-0.5">
								{activePluginMenus.map((pm) => {
									const Icon = PLUGIN_ICONS[pm.icon] ?? Puzzle;
									return <NavItem key={pm.name} href={`/plugins/${pm.name}`} icon={Icon} label={pm.label} />;
								})}
							</div>
						)}
					</>
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
