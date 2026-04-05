'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DynamicField } from '@/components/collections/dynamic-field';
import type { FieldTypeName } from '@/components/collections/field-type-selector';

type FieldDef = { name: string; type: FieldTypeName; required: boolean; options?: string[] };
type MeData = { role: string; permissions: string[] };

/** Checks if permission list grants resource:action */
const hasPerm = (perms: string[], resource: string, action: string): boolean =>
	perms.some((p) => p === '*' || p === `*:${action}` || p === `${resource}:*` || p === `${resource}:${action}`);

export default function EntryEditorPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const entryId = params.id as string;
	const isNew = entryId === 'new';

	const [fields, setFields] = useState<FieldDef[]>([]);
	const [values, setValues] = useState<Record<string, unknown>>({});
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [error, setError] = useState('');
	const [me, setMe] = useState<MeData | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const [colRes, meRes] = await Promise.all([
					fetch('/api/collections'),
					fetch('/api/auth/me'),
				]);
				const colJson = await colRes.json();
				const meJson = await meRes.json();
				if (meJson.ok) setMe(meJson.data);

				if (colJson.ok) {
					const match = colJson.data.find((c: { slug: string }) => c.slug === slug);
					if (match?.fields) {
						setFields(Object.entries(match.fields as Record<string, Record<string, unknown>>).map(
							([name, def]) => ({
								name,
								type: def.type as FieldTypeName,
								required: def.required !== false,
								options: def.options as string[] | undefined,
							}),
						));
					}
				}

				if (!isNew) {
					const entryRes = await fetch(`/api/content/${slug}/${entryId}`);
					const entryJson = await entryRes.json();
					if (entryJson.ok && entryJson.data) setValues(entryJson.data);
				}
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [slug, entryId, isNew]);

	const perms = me?.permissions ?? [];
	const canCreate = hasPerm(perms, slug, 'create');
	const canUpdate = hasPerm(perms, slug, 'update');
	const canDelete = hasPerm(perms, slug, 'delete');
	const canWrite = isNew ? canCreate : canUpdate;
	const readOnly = !canWrite;

	const updateValue = (fieldName: string, value: unknown) => {
		if (readOnly) return;
		setValues((prev) => ({ ...prev, [fieldName]: value }));
		setErrors((prev) => { const next = { ...prev }; delete next[fieldName]; return next; });
	};

	const handleSave = async () => {
		if (readOnly) return;
		setError(''); setSaving(true);
		try {
			const body: Record<string, unknown> = {};
			for (const f of fields) { if (values[f.name] !== undefined) body[f.name] = values[f.name]; }

			const url = isNew ? `/api/content/${slug}` : `/api/content/${slug}/${entryId}`;
			const res = await fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!json.ok) { setError(json.error?.message ?? 'Failed to save'); setSaving(false); return; }
			router.push(`/collections/${slug}`);
		} catch { setError('Network error.'); setSaving(false); }
	};

	const handleDelete = async () => {
		if (!canDelete) return;
		if (!confirm('Delete this entry?')) return;
		try {
			await fetch(`/api/content/${slug}/${entryId}`, { method: 'DELETE' });
			router.push(`/collections/${slug}`);
		} catch { setError('Failed to delete'); }
	};

	if (loading) {
		return (
			<div className="mx-auto max-w-3xl space-y-4">
				{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />)}
			</div>
		);
	}

	// Redirect viewer away from /new
	if (isNew && readOnly) {
		router.push(`/collections/${slug}`);
		return null;
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button type="button" onClick={() => router.push(`/collections/${slug}`)} className="rounded-lg p-2 hover:bg-accent">
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							{readOnly ? 'View Entry' : isNew ? 'New Entry' : 'Edit Entry'}
						</h1>
						<p className="text-muted-foreground capitalize">{slug}</p>
					</div>
				</div>
				{!isNew && canDelete && (
					<button type="button" onClick={handleDelete}
						className="inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
						<Trash2 className="h-4 w-4" /> Delete
					</button>
				)}
			</div>

			{error && (
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
			)}

			<div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
				{fields.length === 0 ? (
					<p className="text-sm text-muted-foreground">No fields defined for this collection.</p>
				) : (
					fields.map((field) => (
						<DynamicField key={field.name} name={field.name} type={field.type}
							value={values[field.name]} onChange={(val) => updateValue(field.name, val)}
							required={field.required} options={field.options} error={errors[field.name]}
							allValues={values} onChangeField={updateValue} />
					))
				)}
			</div>

			<div className="flex justify-end gap-3 border-t border-border pt-4">
				<button type="button" onClick={() => router.push(`/collections/${slug}`)}
					className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
					{readOnly ? 'Back' : 'Cancel'}
				</button>
				{canWrite && (
					<button type="button" onClick={handleSave} disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
						<Save className="h-4 w-4" />
						{saving ? 'Saving...' : isNew ? 'Create Entry' : 'Save Changes'}
					</button>
				)}
			</div>
		</div>
	);
}
