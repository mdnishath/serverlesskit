'use client';

import { useState } from 'react';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	return (
		<div className="w-full max-w-sm">
			<div className="rounded-xl border border-border bg-card p-8 shadow-sm">
				{/* Branding */}
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						ServerlessKit
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
				</div>

				{/* Form */}
				<form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
					<div className="space-y-1">
						<label
							htmlFor="email"
							className="text-sm font-medium text-foreground"
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="password"
								className="text-sm font-medium text-foreground"
							>
								Password
							</label>
							<a
								href="#"
								className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							>
								Forgot password?
							</a>
						</div>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					<button
						type="submit"
						className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
					>
						Sign in
					</button>
				</form>
			</div>
		</div>
	);
}
