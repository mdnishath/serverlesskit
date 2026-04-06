'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Search, Globe, Share2, Save, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SeoData = {
	metaTitle: string;
	metaDescription: string;
	focusKeyword: string;
	canonicalUrl: string;
	ogTitle: string;
	ogDescription: string;
	ogImage: string;
	noIndex: boolean;
	noFollow: boolean;
};

const emptySeo: SeoData = {
	metaTitle: '', metaDescription: '', focusKeyword: '', canonicalUrl: '',
	ogTitle: '', ogDescription: '', ogImage: '', noIndex: false, noFollow: false,
};

/**
 * SEO Panel — Yoast-like SEO editor shown below entry fields.
 * Loads/saves SEO data per entry via /api/plugins/seo.
 * @param props - collection slug, entryId, readOnly flag, entry title for defaults
 */
export const SeoPanel = ({ collection, entryId, readOnly, entryTitle }: {
	collection: string;
	entryId: string;
	readOnly: boolean;
	entryTitle: string;
}) => {
	const [open, setOpen] = useState(false);
	const [seo, setSeo] = useState<SeoData>(emptySeo);
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');

	useEffect(() => {
		if (!open || loaded) return;
		fetch(`/api/plugins/seo?collection=${collection}&entryId=${entryId}`)
			.then((r) => r.json())
			.then((json) => {
				if (json.ok && json.data) setSeo(json.data);
				setLoaded(true);
			})
			.catch(() => setLoaded(true));
	}, [open, loaded, collection, entryId]);

	const handleSave = async () => {
		setSaving(true); setSaveMsg('');
		try {
			const res = await fetch('/api/plugins/seo', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collection, entryId, ...seo }),
			});
			const json = await res.json();
			setSaveMsg(json.ok ? 'SEO saved!' : 'Failed to save');
		} catch { setSaveMsg('Network error'); }
		setSaving(false);
		setTimeout(() => setSaveMsg(''), 3000);
	};

	const update = (field: keyof SeoData, value: string | boolean) => {
		if (readOnly) return;
		setSeo((prev) => ({ ...prev, [field]: value }));
	};

	/* SEO Score calculation */
	const title = seo.metaTitle || entryTitle;
	const titleLen = title.length;
	const descLen = seo.metaDescription.length;
	const checks = [
		{ ok: titleLen >= 30 && titleLen <= 60, label: 'Meta title is 30-60 characters', detail: `${titleLen} chars` },
		{ ok: descLen >= 120 && descLen <= 160, label: 'Meta description is 120-160 characters', detail: `${descLen} chars` },
		{ ok: !!seo.focusKeyword, label: 'Focus keyword is set', detail: seo.focusKeyword || 'Not set' },
		{ ok: !seo.focusKeyword || title.toLowerCase().includes(seo.focusKeyword.toLowerCase()), label: 'Focus keyword in title', detail: '' },
		{ ok: !seo.focusKeyword || seo.metaDescription.toLowerCase().includes(seo.focusKeyword.toLowerCase()), label: 'Focus keyword in description', detail: '' },
		{ ok: !seo.noIndex, label: 'Page is indexable', detail: seo.noIndex ? 'noindex set' : '' },
	];
	const score = checks.filter((c) => c.ok).length;
	const scoreColor = score >= 5 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';
	const scoreBg = score >= 5 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-500';

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Collapsible Header */}
			<button type="button" onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between p-4 sm:px-6 hover:bg-muted/50 transition-colors">
				<div className="flex items-center gap-3">
					<Search className="h-4 w-4 text-primary" />
					<span className="text-sm font-semibold">SEO</span>
					{loaded && (
						<div className="flex items-center gap-2">
							<div className={cn('h-2.5 w-2.5 rounded-full', scoreBg)} />
							<span className={cn('text-xs font-medium', scoreColor)}>{score}/{checks.length}</span>
						</div>
					)}
				</div>
				<ChevronDown className={cn('h-4 w-4 transition-transform text-muted-foreground', open && 'rotate-180')} />
			</button>

			{open && (
				<div className="border-t border-border p-4 space-y-5 sm:px-6">
					{!loaded ? (
						<div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
					) : (
						<>
							{/* Google Preview */}
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-2">Search Preview</p>
								<div className="rounded-lg border border-border bg-white p-3 dark:bg-gray-900">
									<p className="text-xs text-green-700 dark:text-green-400 truncate">example.com/{collection}/{entryId}</p>
									<p className="mt-0.5 text-base text-blue-700 dark:text-blue-400 font-medium truncate">{title || 'Page Title'}</p>
									<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{seo.metaDescription || 'Add a meta description to control how this page appears in search results...'}</p>
								</div>
							</div>

							{/* Focus Keyword */}
							<label className="block space-y-1.5">
								<span className="text-sm font-medium">Focus Keyword</span>
								<input type="text" value={seo.focusKeyword} onChange={(e) => update('focusKeyword', e.target.value)}
									readOnly={readOnly} placeholder="e.g. serverless cms"
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
							</label>

							{/* SEO Score */}
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-2">SEO Analysis</p>
								<div className="space-y-1.5">
									{checks.map((c, i) => (
										<div key={i} className="flex items-center gap-2 text-xs">
											{c.ok
												? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
												: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
											}
											<span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
											{c.detail && <span className="text-muted-foreground/60">({c.detail})</span>}
										</div>
									))}
								</div>
							</div>

							{/* Meta Title */}
							<label className="block space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Meta Title</span>
									<span className={cn('text-xs', titleLen > 60 ? 'text-red-500' : 'text-muted-foreground')}>{titleLen}/60</span>
								</div>
								<input type="text" value={seo.metaTitle} onChange={(e) => update('metaTitle', e.target.value)}
									readOnly={readOnly} placeholder={entryTitle || 'Enter meta title...'}
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
							</label>

							{/* Meta Description */}
							<label className="block space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Meta Description</span>
									<span className={cn('text-xs', descLen > 160 ? 'text-red-500' : 'text-muted-foreground')}>{descLen}/160</span>
								</div>
								<textarea value={seo.metaDescription} onChange={(e) => update('metaDescription', e.target.value)}
									readOnly={readOnly} rows={3} placeholder="Describe this page for search engines..."
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
							</label>

							{/* Open Graph */}
							<div className="border-t border-border pt-4">
								<div className="flex items-center gap-2 mb-3">
									<Share2 className="h-4 w-4 text-primary" />
									<span className="text-sm font-medium">Social Media / Open Graph</span>
								</div>

								<div className="space-y-3">
									<label className="block space-y-1.5">
										<span className="text-xs font-medium">OG Title</span>
										<input type="text" value={seo.ogTitle} onChange={(e) => update('ogTitle', e.target.value)}
											readOnly={readOnly} placeholder={seo.metaTitle || entryTitle || 'Same as meta title'}
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</label>
									<label className="block space-y-1.5">
										<span className="text-xs font-medium">OG Description</span>
										<input type="text" value={seo.ogDescription} onChange={(e) => update('ogDescription', e.target.value)}
											readOnly={readOnly} placeholder={seo.metaDescription || 'Same as meta description'}
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</label>
									<label className="block space-y-1.5">
										<span className="text-xs font-medium">OG Image URL</span>
										<input type="url" value={seo.ogImage} onChange={(e) => update('ogImage', e.target.value)}
											readOnly={readOnly} placeholder="https://example.com/image.jpg"
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</label>
								</div>
							</div>

							{/* Advanced */}
							<div className="border-t border-border pt-4">
								<div className="flex items-center gap-2 mb-3">
									<Globe className="h-4 w-4 text-primary" />
									<span className="text-sm font-medium">Advanced</span>
								</div>

								<div className="space-y-3">
									<label className="block space-y-1.5">
										<span className="text-xs font-medium">Canonical URL</span>
										<input type="url" value={seo.canonicalUrl} onChange={(e) => update('canonicalUrl', e.target.value)}
											readOnly={readOnly} placeholder="Leave empty to use default URL"
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
									</label>
									<label className="flex items-center gap-2">
										<input type="checkbox" checked={seo.noIndex} onChange={(e) => update('noIndex', e.target.checked)}
											disabled={readOnly} className="h-4 w-4 rounded border-border" />
										<span className="text-sm">No Index — hide from search engines</span>
									</label>
									<label className="flex items-center gap-2">
										<input type="checkbox" checked={seo.noFollow} onChange={(e) => update('noFollow', e.target.checked)}
											disabled={readOnly} className="h-4 w-4 rounded border-border" />
										<span className="text-sm">No Follow — don't follow links on this page</span>
									</label>
								</div>
							</div>

							{/* Save */}
							{saveMsg && (
								<div className={cn('rounded-lg border px-3 py-2 text-sm',
									saveMsg === 'SEO saved!' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/5 text-destructive')}>
									{saveMsg}
								</div>
							)}

							{!readOnly && (
								<button type="button" onClick={handleSave} disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
									<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save SEO'}
								</button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
};
