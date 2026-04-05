'use client';

import { useState, useEffect } from 'react';
import { User, Save, Key } from 'lucide-react';

type ProfileData = { id: string; name: string; email: string; role: string; createdAt: string };

export default function ProfilePage() {
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	// Password change
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [pwSaving, setPwSaving] = useState(false);
	const [pwMessage, setPwMessage] = useState('');
	const [pwError, setPwError] = useState('');

	useEffect(() => {
		fetch('/api/auth/me').then((r) => r.json()).then((json) => {
			if (json.ok) {
				setProfile(json.data);
				setName(json.data.name);
				setEmail(json.data.email);
			}
		}).finally(() => setLoading(false));
	}, []);

	const handleSaveProfile = async () => {
		if (!profile) return;
		setError(''); setMessage(''); setSaving(true);
		const res = await fetch('/api/users', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: profile.id, name, email }),
		});
		const json = await res.json();
		setSaving(false);
		if (!json.ok) { setError(json.error?.message ?? 'Failed to update'); return; }
		setMessage('Profile updated successfully');
		setTimeout(() => setMessage(''), 3000);
	};

	const handleChangePassword = async () => {
		if (!profile) return;
		setPwError(''); setPwMessage('');
		if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
		if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
		setPwSaving(true);
		const res = await fetch('/api/users', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: profile.id, password: newPassword }),
		});
		const json = await res.json();
		setPwSaving(false);
		if (!json.ok) { setPwError(json.error?.message ?? 'Failed'); return; }
		setPwMessage('Password changed successfully');
		setNewPassword(''); setConfirmPassword('');
		setTimeout(() => setPwMessage(''), 3000);
	};

	if (loading) {
		return <div className="mx-auto max-w-xl space-y-4">
			{[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted" />)}
		</div>;
	}

	if (!profile) return <p className="text-muted-foreground">Unable to load profile.</p>;

	return (
		<div className="mx-auto max-w-xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
				<p className="text-muted-foreground">Update your personal information</p>
			</div>

			{/* Profile Info */}
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
				<div className="flex items-center gap-4">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<User className="h-6 w-6" />
					</div>
					<div>
						<p className="text-lg font-semibold">{profile.name}</p>
						<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{profile.role}</span>
					</div>
				</div>

				{message && <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600">{message}</div>}
				{error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Name</span>
					<input type="text" value={name} onChange={(e) => setName(e.target.value)}
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Email</span>
					<input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>

				<div className="flex justify-end">
					<button type="button" onClick={handleSaveProfile} disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
						<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}
					</button>
				</div>
			</div>

			{/* Change Password */}
			<div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
				<h2 className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Change Password</h2>

				{pwMessage && <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600">{pwMessage}</div>}
				{pwError && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{pwError}</div>}

				<label className="block space-y-1.5">
					<span className="text-sm font-medium">New Password</span>
					<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
						placeholder="Min 6 characters"
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Confirm Password</span>
					<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Type again"
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>

				<div className="flex justify-end">
					<button type="button" onClick={handleChangePassword}
						disabled={newPassword.length < 6 || pwSaving}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
						<Key className="h-4 w-4" /> {pwSaving ? 'Changing...' : 'Change Password'}
					</button>
				</div>
			</div>
		</div>
	);
}
