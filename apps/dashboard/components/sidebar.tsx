'use client';

import { usePathname, useRouter } from 'next/navigation';
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
	ChevronDown,
	Database,
	FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

type ContentType = { slug: string; name: string };
type MeData = { id: string; role: string };

const ROLE_LEVELS: Record<string, number> = { 'super-admin': 100, admin: 80, editor: 40, viewer: 10 };
const getLevel = (r: string) => ROLE_LEVELS[r] ?? 10;

/**
 * Collapsible sidebar with role-based visibility.
 * Content section: dynamic content types + Media (visible to all).
 * Admin section: only visible to admin+ roles.
 * @returns Sidebar component
 */
export const Sidebar = () => {
	const pathname = usePathname();
	const router = useRouter();
	const [collapsed, setCollapsed] = useState(false);
	const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
	const [contentOpen, setContentOpen] = useState(true);
	const [adminOpen, setAdminOpen] = useState(true);
	const [me, setMe] = useState<MeData | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem('sidebar-collapsed');
		if (stored === 'true') setCollapsed(true);
		fetch('/api/auth/me').then((r) => r.json()).then((j) => { if (j.ok) setMe(j.data); }).catch(() => {});
	}, []);

	const [myPermissions, setMyPermissions] = useState<string[]>([]);

	useEffect(() => {
		Promise.all([
			fetch('/api/collections').then((r) => r.json()),
			fetch('/api/roles').then((r) => r.json()),
		]).then(([colJson, rolesJson]) => {
			if (colJson.ok) setContentTypes(colJson.data.map((c: ContentType) => ({ slug: c.slug, name: c.name })));
			if (rolesJson.ok && me) {
				const myRole = rolesJson.data.find((r: { name: string }) => r.name === me.role);
				if (myRole) setMyPermissions(myRole.permissions);
			}
		}).catch(() => {});
	}, [pathname, me]);

	const toggle = () => {
		const next = !collapsed;
		setCollapsed(next);
		localStorage.setItem('sidebar-collapsed', String(next));
	};

	const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

	const navClass = (href: string) => cn(
		'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
		isActive(href) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
		collapsed && 'justify-center px-2',
	);

	const NavItem = ({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) => (
		<button type="button" onClick={() => router.push(href)} className={navClass(href)} title={collapsed ? label : undefined}>
			<Icon className="h-4 w-4 shrink-0" />
			{!collapsed && <span>{label}</span>}
		</button>
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

	const isAdmin = me ? getLevel(me.role) >= 80 : false;

	/** Check if user can access a specific content type */
	const canAccessContent = (slug: string) => {
		if (isAdmin) return true; // admin+ sees everything
		return myPermissions.some((p) =>
			p === '*' || p === '*:read' || p === `${slug}:read` || p === `${slug}:*`
		);
	};

	const visibleContentTypes = contentTypes.filter((ct) => canAccessContent(ct.slug));

	return (
		<aside className={cn(
			'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
			collapsed ? 'w-16' : 'w-64',
		)}>
			<div className="flex h-14 items-center justify-between border-b border-border px-4">
				{!collapsed && (
					<button type="button" onClick={() => router.push('/')} className="flex items-center gap-2 font-semibold">
						<Database className="h-5 w-5" /><span>ServerlessKit</span>
					</button>
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

				{/* Admin section — items shown based on read permission */}
				{(() => {
					const adminItems = [
						{ href: '/collections', icon: FolderOpen, label: 'Content Types', resource: 'collections' },
						{ href: '/users', icon: Users, label: 'Users', resource: 'users' },
						{ href: '/roles', icon: Shield, label: 'Roles', resource: 'roles' },
						{ href: '/plugins', icon: Puzzle, label: 'Plugins', resource: 'plugins' },
						{ href: '/settings', icon: Settings, label: 'Settings', resource: 'settings' },
					].filter((item) => canAccessContent(item.resource));

					if (adminItems.length === 0) return null;

					return (
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
					);
				})()}
			</nav>

			{!collapsed && (
				<div className="border-t border-border px-4 py-3">
					<p className="text-[10px] text-muted-foreground/50">ServerlessKit v0.1.0</p>
				</div>
			)}
		</aside>
	);
};
