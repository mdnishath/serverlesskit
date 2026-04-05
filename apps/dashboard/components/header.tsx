'use client';

import { Moon, Sun, Search, Bell, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Dashboard header with search, notifications, theme toggle, and user avatar.
 * @returns Header component
 */
export const Header = () => {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const toggleTheme = () => {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	};

	return (
		<header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
			<div className="flex items-center gap-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search... (Ctrl+K)"
						className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					className="relative rounded-lg p-2 hover:bg-accent"
					aria-label="Notifications"
				>
					<Bell className="h-4 w-4" />
				</button>

				{mounted && (
					<button
						type="button"
						onClick={toggleTheme}
						className="rounded-lg p-2 hover:bg-accent"
						aria-label="Toggle theme"
					>
						{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
				)}

				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
					aria-label="User menu"
				>
					<User className="h-4 w-4" />
				</button>
			</div>
		</header>
	);
};
