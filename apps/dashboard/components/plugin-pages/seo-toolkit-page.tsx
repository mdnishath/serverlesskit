'use client';

import { useState } from 'react';
import { Save, Search, Globe, FileText, Share2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom dashboard page for the SEO Toolkit plugin.
 * Full WordPress Yoast-like SEO management page.
 */
export const SeoToolkitPage = ({ config, canManage }: {
	config: Record<string, unknown>;
	canManage: boolean;
}) => {
	const [siteUrl, setSiteUrl] = useState(String(config.siteUrl ?? ''));
	const [titleSuffix, setTitleSuffix] = useState(String(config.defaultTitle ?? ''));
	const [maxDesc, setMaxDesc] = useState(Number(config.maxDescriptionLength ?? 160));
	const [ogEnabled, setOgEnabled] = useState(Boolean(config.enableOpenGraph ?? true));
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');

	/* Live preview */
	const previewTitle = `My Blog Post ${titleSuffix}`;
	const previewUrl = siteUrl ? `${siteUrl}/blog/my-blog-post` : 'https://example.com/blog/my-blog-post';
	const previewDesc = 'This is a preview of how your content will appear in search engine results. The meta description is automatically generated from your content...'.slice(0, maxDesc);

	const handleSave = async () => {
		setSaving(true); setSaveMsg('');
		try {
			const res = await fetch('/api/plugins', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'seo-toolkit', config: { siteUrl, defaultTitle: titleSuffix, maxDescriptionLength: maxDesc, enableOpenGraph: ogEnabled } }),
			});
			const json = await res.json();
			setSaveMsg(json.ok ? 'Settings saved!' : (json.error?.message ?? 'Failed'));
		} catch { setSaveMsg('Network error'); }
		setSaving(false);
		setTimeout(() => setSaveMsg(''), 3000);
	};

	const seoScore = [siteUrl, titleSuffix, ogEnabled].filter(Boolean).length;
	const scoreColor = seoScore >= 3 ? 'text-green-600' : seoScore >= 2 ? 'text-yellow-600' : 'text-red-600';
	const scoreBg = seoScore >= 3 ? 'bg-green-500/10' : seoScore >= 2 ? 'bg-yellow-500/10' : 'bg-red-500/10';

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
					<Search className="h-6 w-6 text-emerald-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">SEO Toolkit</h1>
					<p className="text-sm text-muted-foreground">Optimize your content for search engines</p>
				</div>
			</div>

			{/* SEO Score + Stats */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
				<div className={cn('rounded-xl border border-border p-5', scoreBg)}>
					<p className={cn('text-3xl font-bold', scoreColor)}>{seoScore}/3</p>
					<p className="text-xs text-muted-foreground mt-1">SEO Score</p>
					<p className="text-xs text-muted-foreground">{seoScore >= 3 ? 'Great setup!' : 'Configure settings to improve'}</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-5">
					<div className="flex items-center gap-3">
						<Globe className="h-5 w-5 text-primary" />
						<div>
							<p className="text-sm font-medium">{siteUrl ? 'Configured' : 'Not set'}</p>
							<p className="text-xs text-muted-foreground">Site URL</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-5">
					<div className="flex items-center gap-3">
						<Share2 className="h-5 w-5 text-primary" />
						<div>
							<p className="text-sm font-medium">{ogEnabled ? 'Enabled' : 'Disabled'}</p>
							<p className="text-xs text-muted-foreground">Open Graph</p>
						</div>
					</div>
				</div>
			</div>

			{/* Google Preview */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Google Search Preview</h2>
				<p className="mt-1 text-xs text-muted-foreground">How your content will appear in search results</p>
				<div className="mt-4 rounded-lg border border-border bg-white p-4 dark:bg-gray-900">
					<p className="text-sm text-green-700 dark:text-green-400 truncate">{previewUrl}</p>
					<p className="mt-1 text-lg text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer">{previewTitle}</p>
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{previewDesc}</p>
				</div>
			</div>

			{/* Settings */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">General Settings</h2>

				{saveMsg && (
					<div className={cn('mt-3 rounded-lg border px-3 py-2 text-sm',
						saveMsg === 'Settings saved!' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/5 text-destructive')}>
						{saveMsg}
					</div>
				)}

				<div className="mt-4 space-y-4">
					<label className="block space-y-1.5">
						<span className="text-sm font-medium">Site URL</span>
						<p className="text-xs text-muted-foreground">Used for canonical URLs and Open Graph tags</p>
						<input type="url" value={siteUrl} onChange={(e) => canManage && setSiteUrl(e.target.value)}
							readOnly={!canManage} placeholder="https://example.com"
							className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>

					<label className="block space-y-1.5">
						<span className="text-sm font-medium">Meta Title Suffix</span>
						<p className="text-xs text-muted-foreground">Appended to all auto-generated meta titles</p>
						<input type="text" value={titleSuffix} onChange={(e) => canManage && setTitleSuffix(e.target.value)}
							readOnly={!canManage} placeholder="| My Website"
							className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>

					<label className="block space-y-1.5">
						<span className="text-sm font-medium">Max Description Length</span>
						<p className="text-xs text-muted-foreground">Maximum characters for meta descriptions ({maxDesc} chars)</p>
						<input type="number" value={maxDesc} onChange={(e) => canManage && setMaxDesc(Number(e.target.value))}
							readOnly={!canManage} min={50} max={300}
							className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>

					<label className="flex items-center gap-3 pt-2">
						<input type="checkbox" checked={ogEnabled} onChange={(e) => canManage && setOgEnabled(e.target.checked)}
							disabled={!canManage} className="h-4 w-4 rounded border-border" />
						<div>
							<span className="text-sm font-medium">Enable Open Graph Tags</span>
							<p className="text-xs text-muted-foreground">Generate og:title, og:description, og:image for social sharing</p>
						</div>
					</label>
				</div>

				{canManage && (
					<div className="mt-6">
						<button type="button" onClick={handleSave} disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
							<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
						</button>
					</div>
				)}
			</div>

			{/* Checklist */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">SEO Checklist</h2>
				<div className="mt-4 space-y-3">
					{[
						{ done: !!siteUrl, text: 'Set your site URL for canonical links' },
						{ done: !!titleSuffix, text: 'Add a meta title suffix for branding' },
						{ done: ogEnabled, text: 'Enable Open Graph tags for social sharing' },
						{ done: maxDesc >= 120 && maxDesc <= 160, text: 'Keep description length between 120-160 characters' },
					].map((item, i) => (
						<div key={i} className="flex items-center gap-3">
							{item.done
								? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
								: <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
							}
							<span className={cn('text-sm', item.done ? 'text-foreground' : 'text-muted-foreground')}>{item.text}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
