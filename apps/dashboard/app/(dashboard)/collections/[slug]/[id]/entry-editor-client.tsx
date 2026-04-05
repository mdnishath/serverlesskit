'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DynamicField } from '@/components/collections/dynamic-field';
import type { FieldTypeName } from '@/components/collections/field-type-selector';
import { hasPerm } from '@/lib/use-permissions';
import { useCachedFetch } from '@/lib/use-cached-fetch';

type FieldDef = { name: string; type: FieldTypeName; required: boolean; options?: string[] };
type CollectionMeta = { slug: string; fields: Record<string, Record<string, unknown>> };

/**
 * Client component for entry editor.
 * Receives server-fetched data for instant render.
 * @param props - slug, entryId, initialCollections, initialEntry, permissions
 */
export const EntryEditorClient = ({
	slug,
	entryId,
	initialCollections,
	initialEntry,
	permissions,
}: {
	slug: string;
	entryId: string;
	initialCollections: CollectionMeta[];
	initialEntry: Record<string, unknown> | null;
	permissions: string[];
}) => {
	const router = useRouter();
	const isNew = entryId === 'new';

	/* Collections data from cache (instant) */
	const { data: freshCollections } = useCachedFetch<CollectionMeta[]>('/api/collections');
	const allCollections = freshCollections ?? initialCollections;
	const collection = allCollections.find((c) => c.slug === slug);

	const [fields, setFields] = useState<FieldDef[]>([]);
	const [values, setValues] = useState<Record<string, unknown>>(initialEntry ?? {});
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [error, setError] = useState('');

	const canCreate = hasPerm(permissions, slug, 'create');
	const canUpdate = hasPerm(permissions, slug, 'update');
	const canDelete = hasPerm(permissions, slug, 'delete');
	const canWrite = isNew ? canCreate : canUpdate;
	const readOnly = !canWrite;

	/* Derive fields from collection data */
	useEffect(() => {
		if (!collection?.fields) return;
		setFields(Object.entries(collection.fields).map(
			([name, def]) => ({
				name,
				type: def.type as FieldTypeName,
				required: def.required !== false,
				options: def.options as string[] | undefined,
			}),
		));
	}, [collection]);

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

	/* Redirect viewer away from /new */
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
};
