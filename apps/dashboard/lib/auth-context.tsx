'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	permissions: string[];
};

type AuthContextType = {
	user: AuthUser | null;
	loading: boolean;
	refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	refresh: async () => {},
});

/**
 * Provides auth state to all dashboard pages.
 * Fetches /api/auth/me ONCE on mount, shares across all children.
 * @param props - children
 * @returns AuthProvider component
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		try {
			const res = await fetch('/api/auth/me');
			const json = await res.json();
			if (json.ok) setUser(json.data);
			else setUser(null);
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { refresh(); }, []);

	return (
		<AuthContext.Provider value={{ user, loading, refresh }}>
			{children}
		</AuthContext.Provider>
	);
};

/**
 * Hook to access the shared auth context.
 * No API call — reads from the provider cache.
 * @returns Auth user, loading state, and refresh function
 */
export const useAuth = () => useContext(AuthContext);
