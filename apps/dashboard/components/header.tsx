'use client';

import { Moon, Sun, Search, Bell, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/lib/use-theme';
import { useAuth } from '@/lib/auth-context';

/**
 * Dashboard header with search, theme toggle, user info, and logout.
 * Uses shared AuthProvider — no separate /api/auth/me fetch.
 * @returns Header component
 */
export const Header = () => {
	const { resolvedTheme, setTheme, mounted } = useTheme();
	const { user } = useAuth();
	const router = useRouter();
	const [showMenu, setShowMenu] = useState(false);

	const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		router.push('/login');
		router.refresh();
	};

	return (
		<header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
			<div className="flex items-center gap-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input type="text" placeholder="Search... (Ctrl+K)"
						className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button type="button" className="relative rounded-lg p-2 hover:bg-accent" aria-label="Notifications">
					<Bell className="h-4 w-4" />
				</button>

				{mounted && (
					<button type="button" onClick={toggleTheme} className="rounded-lg p-2 hover:bg-accent" aria-label="Toggle theme">
						{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
				)}

				<div className="relative">
					<button type="button" onClick={() => setShowMenu(!showMenu)}
						className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
							<User className="h-3.5 w-3.5" />
						</div>
						{user && (
							<div className="hidden sm:block text-left">
								<p className="text-xs font-medium leading-none">{user.name}</p>
								<p className="text-[10px] text-muted-foreground">{user.role}</p>
							</div>
						)}
					</button>

					{showMenu && (
						<>
							<div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
							<div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-lg">
								{user && (
									<div className="border-b border-border px-3 py-2 mb-1">
										<p className="text-sm font-medium">{user.name}</p>
										<p className="text-xs text-muted-foreground">{user.email}</p>
										<span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
											{user.role}
										</span>
									</div>
								)}
								<button type="button" onClick={() => { setShowMenu(false); router.push('/profile'); }}
									className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
									<User className="h-4 w-4" /> My Profile
								</button>
								<button type="button" onClick={handleLogout}
									className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
									<LogOut className="h-4 w-4" /> Sign out
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</header>
	);
};
