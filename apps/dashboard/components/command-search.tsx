'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
	Search,
	X,
	LayoutDashboard,
	FolderOpen,
	Image,
	Users,
	Shield,
	Puzzle,
	Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchItem = {
	label: string;
	href: string;
	icon: typeof Search;
	section: string;
};

const NAV_ITEMS: SearchItem[] = [
	{ label: 'Overview', href: '/', icon: LayoutDashboard, section: 'Pages' },
	{ label: 'Content Types', href: '/collections', icon: FolderOpen, section: 'Pages' },
	{ label: 'New Content Type', href: '/collections/new', icon: FolderOpen, section: 'Actions' },
	{ label: 'Media Library', href: '/media', icon: Image, section: 'Pages' },
	{ label: 'Users', href: '/users', icon: Users, section: 'Pages' },
	{ label: 'Roles & Permissions', href: '/roles', icon: Shield, section: 'Pages' },
	{ label: 'Plugins', href: '/plugins', icon: Puzzle, section: 'Pages' },
	{ label: 'Settings', href: '/settings', icon: Settings, section: 'Pages' },
];

/**
 * Global command search modal (Cmd+K / Ctrl+K).
 * @returns CommandSearch component
 */
export const CommandSearch = () => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const router = useRouter();

	const filtered = query
		? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
		: NAV_ITEMS;

	const navigate = useCallback(
		(href: string) => {
			setOpen(false);
			setQuery('');
			router.push(href);
		},
		[router],
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
			if (e.key === 'Escape') {
				setOpen(false);
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex((i) => Math.max(i - 1, 0));
			} else if (e.key === 'Enter' && filtered[selectedIndex]) {
				navigate(filtered[selectedIndex].href);
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [open, filtered, selectedIndex, navigate]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh] sm:pt-[20vh]">
			<div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
			<div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl sm:max-w-lg">
				<div className="flex items-center border-b border-border px-4">
					<Search className="h-4 w-4 shrink-0 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search pages, actions..."
						className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none"
						autoFocus
					/>
					<kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						ESC
					</kbd>
				</div>

				<div className="max-h-72 overflow-y-auto p-2">
					{filtered.length === 0 ? (
						<p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found</p>
					) : (
						filtered.map((item, index) => (
							<button
								key={item.href}
								type="button"
								onClick={() => navigate(item.href)}
								className={cn(
									'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
									index === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
								)}
							>
								<item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span>{item.label}</span>
								<span className="ml-auto text-xs text-muted-foreground">{item.section}</span>
							</button>
						))
					)}
				</div>
			</div>
		</div>
	);
};
