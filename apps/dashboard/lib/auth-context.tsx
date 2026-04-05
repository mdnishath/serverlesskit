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
 * Accepts optional initialUser from server for instant render.
 * Falls back to fetching /api/auth/me on client if no initialUser.
 * @param props - children, optional initialUser from server
 * @returns AuthProvider component
 */
export const AuthProvider = ({ children, initialUser }: { children: ReactNode; initialUser?: AuthUser | null }) => {
	const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
	const [loading, setLoading] = useState(!initialUser);

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
