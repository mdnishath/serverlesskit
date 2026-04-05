'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			const json = await res.json();

			if (!json.ok) {
				setError(json.error?.message ?? 'Login failed');
				setLoading(false);
				return;
			}

			router.push('/');
			router.refresh();
		} catch {
			setError('Network error. Please try again.');
			setLoading(false);
		}
	};

	return (
		<div className="w-full max-w-sm">
			<div className="rounded-xl border border-border bg-card p-8 shadow-sm">
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">ServerlessKit</h1>
					<p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-1">
						<label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
						<input id="email" type="email" autoComplete="email" placeholder="you@example.com"
							value={email} onChange={(e) => setEmail(e.target.value)} required
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
					</div>

					<div className="space-y-1">
						<label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
						<input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
							value={password} onChange={(e) => setPassword(e.target.value)} required
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
					</div>

					<button type="submit" disabled={loading}
						className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring">
						{loading ? 'Signing in...' : 'Sign in'}
					</button>
				</form>

				<p className="mt-4 text-center text-sm text-muted-foreground">
					Don&apos;t have an account?{' '}
					<Link href="/register" className="font-medium text-primary hover:underline">
						Register
					</Link>
				</p>
			</div>
		</div>
	);
}
