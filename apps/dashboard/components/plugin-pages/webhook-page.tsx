'use client';

import { useState } from 'react';
import { Save, Send, CheckCircle2, XCircle, Webhook, Globe, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom dashboard page for the Webhook plugin.
 * Full WordPress-like plugin page with config, test, and status.
 */
export const WebhookPage = ({ config, canManage }: {
	config: Record<string, unknown>;
	canManage: boolean;
}) => {
	const [url, setUrl] = useState(String(config.url ?? ''));
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

	const handleSave = async () => {
		setSaving(true); setSaveMsg('');
		try {
			const res = await fetch('/api/plugins', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'webhook', config: { url } }),
			});
			const json = await res.json();
			setSaveMsg(json.ok ? 'Settings saved!' : (json.error?.message ?? 'Failed'));
		} catch { setSaveMsg('Network error'); }
		setSaving(false);
		setTimeout(() => setSaveMsg(''), 3000);
	};

	const handleTest = async () => {
		if (!url) { setTestResult({ ok: false, message: 'Enter a webhook URL first' }); return; }
		setTesting(true); setTestResult(null);
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-ServerlessKit-Event': 'test' },
				body: JSON.stringify({
					event: 'test',
					timestamp: new Date().toISOString(),
					payload: { message: 'Test webhook from ServerlessKit', collection: 'test', data: { title: 'Hello World' } },
				}),
			});
			setTestResult({ ok: res.ok, message: res.ok ? `Success! Status: ${res.status}` : `Failed with status: ${res.status}` });
		} catch {
			setTestResult({ ok: false, message: 'Could not reach the URL. Check if it\'s accessible.' });
		}
		setTesting(false);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
					<Webhook className="h-6 w-6 text-blue-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">Webhooks</h1>
					<p className="text-sm text-muted-foreground">Send HTTP notifications when content changes</p>
				</div>
			</div>

			{/* Stats cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
				<div className="rounded-xl border border-border bg-card p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<Zap className="h-5 w-5 text-primary" />
						<div>
							<p className="text-2xl font-bold">3</p>
							<p className="text-xs text-muted-foreground">Active Hooks</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<Globe className="h-5 w-5 text-primary" />
						<div>
							<p className="text-2xl font-bold">{url ? '1' : '0'}</p>
							<p className="text-xs text-muted-foreground">Endpoints</p>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-border bg-card p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<Clock className="h-5 w-5 text-primary" />
						<div>
							<p className="text-2xl font-bold">Real-time</p>
							<p className="text-xs text-muted-foreground">Delivery</p>
						</div>
					</div>
				</div>
			</div>

			{/* Configuration */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Webhook Configuration</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Enter the URL where ServerlessKit will send POST requests when entries are created, updated, or deleted.
				</p>

				{saveMsg && (
					<div className={cn('mt-3 rounded-lg border px-3 py-2 text-sm',
						saveMsg === 'Settings saved!' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-destructive/30 bg-destructive/5 text-destructive')}>
						{saveMsg}
					</div>
				)}

				<div className="mt-4 space-y-4">
					<label className="block space-y-1.5">
						<span className="text-sm font-medium">Webhook URL</span>
						<input type="url" value={url} onChange={(e) => canManage && setUrl(e.target.value)}
							readOnly={!canManage} placeholder="https://example.com/api/webhook"
							className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>

					{canManage && (
						<div className="flex flex-col gap-3 sm:flex-row">
							<button type="button" onClick={handleSave} disabled={saving}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
								<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
							</button>
							<button type="button" onClick={handleTest} disabled={testing || !url}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50">
								<Send className="h-4 w-4" /> {testing ? 'Sending...' : 'Send Test Webhook'}
							</button>
						</div>
					)}
				</div>

				{testResult && (
					<div className={cn('mt-4 flex items-start gap-3 rounded-lg border p-4',
						testResult.ok ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/5')}>
						{testResult.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
						<div>
							<p className={cn('text-sm font-medium', testResult.ok ? 'text-green-600' : 'text-destructive')}>{testResult.message}</p>
							{testResult.ok && <p className="mt-1 text-xs text-muted-foreground">Your endpoint received the test payload successfully.</p>}
						</div>
					</div>
				)}
			</div>

			{/* Events Reference */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Webhook Events</h2>
				<p className="mt-1 text-xs text-muted-foreground">These events are sent as POST requests to your webhook URL.</p>
				<div className="mt-4 overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
								<th className="pb-2 pr-4">Event</th>
								<th className="pb-2 pr-4">Header Value</th>
								<th className="pb-2">When</th>
							</tr>
						</thead>
						<tbody className="text-sm">
							<tr className="border-b border-border">
								<td className="py-2.5 pr-4 font-medium">Entry Created</td>
								<td className="py-2.5 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">entry.created</code></td>
								<td className="py-2.5 text-muted-foreground">New entry added to any collection</td>
							</tr>
							<tr className="border-b border-border">
								<td className="py-2.5 pr-4 font-medium">Entry Updated</td>
								<td className="py-2.5 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">entry.updated</code></td>
								<td className="py-2.5 text-muted-foreground">Existing entry modified</td>
							</tr>
							<tr>
								<td className="py-2.5 pr-4 font-medium">Entry Deleted</td>
								<td className="py-2.5 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">entry.deleted</code></td>
								<td className="py-2.5 text-muted-foreground">Entry removed from collection</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Payload Example */}
			<div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<h2 className="text-sm font-semibold">Payload Format</h2>
				<pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`{
  "event": "entry.created",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payload": {
    "collection": "posts",
    "data": {
      "id": "abc123",
      "title": "My Blog Post",
      "status": "published"
    }
  }
}`}
				</pre>
			</div>
		</div>
	);
};
