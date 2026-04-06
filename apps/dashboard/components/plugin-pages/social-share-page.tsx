'use client';

import { useState } from 'react';
import { Save, Share2, Send, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom dashboard page for the Social Share plugin.
 * WordPress-like social media auto-posting configuration.
 */
export const SocialSharePage = ({ config, canManage }: {
	config: Record<string, unknown>;
	canManage: boolean;
}) => {
	const [twitterKey, setTwitterKey] = useState(String(config.twitterApiKey ?? ''));
	const [fbToken, setFbToken] = useState(String(config.facebookToken ?? ''));
	const [liToken, setLiToken] = useState(String(config.linkedinToken ?? ''));
	const [template, setTemplate] = useState(String(config.postTemplate ?? 'New post: {{title}} — Read more at {{url}}'));
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [showTwitter, setShowTwitter] = useState(false);
	const [showFb, setShowFb] = useState(false);
	const [showLi, setShowLi] = useState(false);

	const platforms = [
		{ name: 'Twitter / X', connected: !!twitterKey, icon: '𝕏', color: 'bg-black dark:bg-white dark:text-black' },
		{ name: 'Facebook', connected: !!fbToken, icon: 'f', color: 'bg-blue-600' },
		{ name: 'LinkedIn', connected: !!liToken, icon: 'in', color: 'bg-blue-700' },
	];

	const connectedCount = platforms.filter((p) => p.connected).length;
	const previewText = template
		.replace('{{title}}', 'My New Blog Post')
		.replace('{{url}}', 'https://example.com/blog/my-new-post')
		.replace('{{description}}', 'A great article about...');

	const handleSave = async () => {
		setSaving(true); setSaveMsg('');
		try {
			const res = await fetch('/api/plugins', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'social-share', config: { twitterApiKey: twitterKey, facebookToken: fbToken, linkedinToken: liToken, postTemplate: template } }),
			});
			const json = await res.json();
			setSaveMsg(json.ok ? 'Settings saved!' : (json.error?.message ?? 'Failed'));
		} catch { setSaveMsg('Network error'); }
		setSaving(false);
		setTimeout(() => setSaveMsg(''), 3000);
	};

	const SecretInput = ({ label, value, onChange, placeholder, show, onToggle, help }: {
		label: string; value: string; onChange: (v: string) => void; placeholder: string;
		show: boolean; onToggle: () => void; help?: string;
	}) => (
		<label className="block space-y-1.5">
			<span className="text-sm font-medium">{label}</span>
			{help && <p className="text-xs text-muted-foreground">{help}</p>}
			<div className="relative">
				<input type={show ? 'text' : 'password'} value={value}
					onChange={(e) => canManage && onChange(e.target.value)}
					readOnly={!canManage} placeholder={placeholder}
					className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				<button type="button" onClick={onToggle}
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-accent">
					{show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
				</button>
			</div>
		</label>
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10">
					<Share2 className="h-6 w-6 text-pink-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Social Share</h1>
					<p className="text-sm text-muted-foreground">Auto-post content to social media platforms</p>
				</div>
			</div>

			{/* Platform Status Cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
				{platforms.map((p) => (
					<div key={p.name} className="rounded-xl border border-border bg-card p-5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold', p.color)}>
									{p.icon}
								</div>
								<div>
									<p className="text-sm font-medium">{p.name}</p>
									<p className={cn('text-xs', p.connected ? 'text-green-600' : 'text-muted-foreground')}>
										{p.connected ? 'Connected' : 'Not connected'}
									</p>
								</div>
							</div>
							<div className={cn('h-3 w-3 rounded-full', p.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600')} />
						</div>
					</div>
				))}
			</div>

			{/* Summary */}
			<div className={cn('rounded-xl border p-4',
				connectedCount === 3 ? 'border-green-500/30 bg-green-500/5' :
				connectedCount > 0 ? 'border-yellow-500/30 bg-yellow-500/5' :
				'border-border bg-muted/50')}>
				<p className="text-sm">
					{connectedCount === 0 && 'No platforms connected. Add API keys below to start auto-posting.'}
					{connectedCount > 0 && connectedCount < 3 && `${connectedCount} of 3 platforms connected. Add more to expand your reach.`}
					{connectedCount === 3 && 'All platforms connected! New entries will be auto-posted everywhere.'}
				</p>
			</div>

			{/* API Keys */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Platform Credentials</h2>
				<p className="mt-1 text-xs text-muted-foreground">API keys are stored encrypted and never shown in full after saving.</p>

				{saveMsg && (
					<div className={cn('mt-3 rounded-lg border px-3 py-2 text-sm',
						saveMsg === 'Settings saved!' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/5 text-destructive')}>
						{saveMsg}
					</div>
				)}

				<div className="mt-4 space-y-4">
					<SecretInput label="Twitter / X API Key" value={twitterKey} onChange={setTwitterKey}
						placeholder="Enter your Twitter API key" show={showTwitter} onToggle={() => setShowTwitter(!showTwitter)}
						help="Get from developer.twitter.com" />

					<SecretInput label="Facebook Page Token" value={fbToken} onChange={setFbToken}
						placeholder="Enter your Facebook page access token" show={showFb} onToggle={() => setShowFb(!showFb)}
						help="Get from Facebook Developer Portal" />

					<SecretInput label="LinkedIn Access Token" value={liToken} onChange={setLiToken}
						placeholder="Enter your LinkedIn access token" show={showLi} onToggle={() => setShowLi(!showLi)}
						help="Get from LinkedIn Developer Portal" />
				</div>

				{canManage && (
					<div className="mt-6">
						<button type="button" onClick={handleSave} disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
							<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Credentials'}
						</button>
					</div>
				)}
			</div>

			{/* Post Template */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Post Template</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Customize how your content appears on social media. Use {'{{title}}'}, {'{{url}}'}, {'{{description}}'} as placeholders.
				</p>
				<div className="mt-4 space-y-4">
					<textarea value={template} onChange={(e) => canManage && setTemplate(e.target.value)}
						readOnly={!canManage} rows={3}
						className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

					<div>
						<p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
						<div className="rounded-lg border border-border bg-muted/50 p-4">
							<p className="text-sm">{previewText}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
