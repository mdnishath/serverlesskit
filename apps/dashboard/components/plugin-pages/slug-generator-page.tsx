'use client';

import { useState } from 'react';
import { Link2, ArrowRight, Check } from 'lucide-react';

/**
 * Custom dashboard page for the Slug Generator plugin.
 * Shows how it works with a live demo + documentation.
 */
export const SlugGeneratorPage = () => {
	const [input, setInput] = useState('My Blog Post Title!');
	const generated = input
		.toLowerCase().trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
					<Link2 className="h-6 w-6 text-purple-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Slug Generator</h1>
					<p className="text-sm text-muted-foreground">Auto-generate SEO-friendly URLs from your content</p>
				</div>
			</div>

			{/* How it works */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">How It Works</h2>
				<div className="mt-4 space-y-3">
					{[
						'When you create a new entry, the plugin checks if the collection has a "slug" field',
						'If the slug field is empty, it looks for a "title" or "name" field',
						'It converts the text to a URL-friendly slug (lowercase, hyphens, no special chars)',
						'If you manually enter a slug, the plugin won\'t override it',
					].map((text, i) => (
						<div key={i} className="flex items-start gap-3">
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
								{i + 1}
							</div>
							<p className="text-sm text-muted-foreground">{text}</p>
						</div>
					))}
				</div>
			</div>

			{/* Live Demo */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Live Preview</h2>
				<p className="mt-1 text-xs text-muted-foreground">Try typing a title to see the generated slug</p>

				<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
					<label className="flex-1 space-y-1.5">
						<span className="text-sm font-medium">Title</span>
						<input type="text" value={input} onChange={(e) => setInput(e.target.value)}
							className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>
					<ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
					<label className="flex-1 space-y-1.5">
						<span className="text-sm font-medium">Generated Slug</span>
						<div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5">
							<Check className="h-4 w-4 shrink-0 text-green-600" />
							<code className="text-sm font-mono text-green-600">{generated || '—'}</code>
						</div>
					</label>
				</div>
			</div>

			{/* Examples */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Examples</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
								<th className="pb-2 pr-4">Input Title</th>
								<th className="pb-2">Generated Slug</th>
							</tr>
						</thead>
						<tbody>
							{[
								['My Blog Post', 'my-blog-post'],
								['New Product (2025)', 'new-product-2025'],
								['Hello World!', 'hello-world'],
								['  Spaces & Special @#$ Chars  ', 'spaces-special-chars'],
							].map(([input, output]) => (
								<tr key={input} className="border-b border-border last:border-0">
									<td className="py-2.5 pr-4">{input}</td>
									<td className="py-2.5"><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{output}</code></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
