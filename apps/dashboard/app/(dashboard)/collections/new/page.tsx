'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { FieldTypeSelector } from '@/components/collections/field-type-selector';
import { SortableFieldEditor } from '@/components/collections/field-editor';
import type { FieldConfig } from '@/components/collections/field-editor';
import type { FieldTypeName } from '@/components/collections/field-type-selector';

const generateId = () => Math.random().toString(36).slice(2, 9);

const slugify = (name: string) =>
	name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Transforms UI FieldConfig[] into the fields object format expected by defineCollection.
 * @param fields - Array of field configs from the UI
 * @returns Fields map for the API payload
 */
const buildFieldsPayload = (fields: FieldConfig[]): Record<string, Record<string, unknown>> => {
	const result: Record<string, Record<string, unknown>> = {};
	for (const f of fields) {
		const def: Record<string, unknown> = { type: f.type, required: f.required };
		if (f.unique) def.unique = true;
		if (f.min !== undefined) def.min = f.min;
		if (f.max !== undefined) def.max = f.max;
		if (f.type === 'select' && f.options) def.options = f.options;
		if (f.type === 'relation') {
			def.collection = f.relatedCollection ?? '';
			def.relationType = f.relationType ?? 'many-to-one';
		}
		result[f.name] = def;
	}
	return result;
};

export default function NewCollectionPage() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [description, setDescription] = useState('');
	const [timestamps, setTimestamps] = useState(true);
	const [softDelete, setSoftDelete] = useState(false);
	const [fields, setFields] = useState<FieldConfig[]>([]);
	const [showTypeSelector, setShowTypeSelector] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slug || slug === slugify(name)) {
			setSlug(slugify(value));
		}
	};

	const addField = (type: FieldTypeName) => {
		setFields([
			...fields,
			{
				id: generateId(),
				name: '',
				type,
				required: true,
				unique: false,
				options: type === 'select' ? [] : undefined,
				relationType: type === 'relation' ? 'many-to-one' : undefined,
			},
		]);
		setShowTypeSelector(false);
	};

	const updateField = (index: number, updated: FieldConfig) => {
		const next = [...fields];
		next[index] = updated;
		setFields(next);
	};

	const removeField = (index: number) => {
		setFields(fields.filter((_, i) => i !== index));
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = fields.findIndex((f) => f.id === active.id);
		const newIndex = fields.findIndex((f) => f.id === over.id);
		setFields(arrayMove(fields, oldIndex, newIndex));
	};

	const handleSave = async () => {
		setError('');
		setSaving(true);
		try {
			const payload = {
				name: name.trim(),
				slug: slug.trim(),
				description: description.trim(),
				timestamps,
				softDelete,
				fields: buildFieldsPayload(fields),
			};

			const res = await fetch('/api/collections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const json = await res.json();
			if (!json.ok) {
				setError(json.error?.message ?? 'Failed to create content type');
				setSaving(false);
				return;
			}

			router.push('/collections');
		} catch {
			setError('Network error. Please try again.');
			setSaving(false);
		}
	};

	const isValid = name.trim().length > 0 && fields.length > 0 && fields.every((f) => f.name.trim().length > 0);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/collections" className="rounded-lg p-2 hover:bg-accent">
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">New Content Type</h1>
					<p className="text-muted-foreground">Define the schema for your data</p>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
				<h2 className="text-sm font-semibold">Basic Info</h2>
				<div className="grid grid-cols-2 gap-4">
					<label className="space-y-1.5">
						<span className="text-sm font-medium">Name</span>
						<input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
							placeholder="e.g. Blog Posts"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>
					<label className="space-y-1.5">
						<span className="text-sm font-medium">Slug</span>
						<input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
							placeholder="auto-generated"
							className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
					</label>
				</div>
				<label className="block space-y-1.5">
					<span className="text-sm font-medium">Description</span>
					<input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
						placeholder="Optional description"
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
				</label>
				<div className="flex gap-6">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)}
							className="h-4 w-4 rounded border-border" />
						<span className="text-sm">Timestamps (createdAt, updatedAt)</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={softDelete} onChange={(e) => setSoftDelete(e.target.checked)}
							className="h-4 w-4 rounded border-border" />
						<span className="text-sm">Soft Delete</span>
					</label>
				</div>
			</div>

			<div className="space-y-4">
				<h2 className="text-sm font-semibold">
					Fields {fields.length > 0 && `(${fields.length})`}
				</h2>

				{fields.length === 0 && !showTypeSelector && (
					<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8">
						<p className="text-sm text-muted-foreground">No fields added yet</p>
					</div>
				)}

				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
						<div className="space-y-2">
							{fields.map((field, index) => (
								<SortableFieldEditor
									key={field.id}
									field={field}
									onChange={(updated) => updateField(index, updated)}
									onRemove={() => removeField(index)}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>

				{showTypeSelector ? (
					<FieldTypeSelector onSelect={addField} onClose={() => setShowTypeSelector(false)} />
				) : (
					<button type="button" onClick={() => setShowTypeSelector(true)}
						className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
						<Plus className="h-4 w-4" />
						Add Field
					</button>
				)}
			</div>

			{slug && fields.length > 0 && (
				<div className="rounded-xl border border-border bg-muted/50 p-4">
					<h3 className="text-xs font-semibold text-muted-foreground">API Preview</h3>
					<div className="mt-2 space-y-1 font-mono text-xs">
						<p>GET&nbsp;&nbsp;&nbsp;/api/v1/content/{slug}</p>
						<p>POST&nbsp;&nbsp;/api/v1/content/{slug}</p>
						<p>GET&nbsp;&nbsp;&nbsp;/api/v1/content/{slug}/:id</p>
						<p>PATCH&nbsp;/api/v1/content/{slug}/:id</p>
						<p>DELETE /api/v1/content/{slug}/:id</p>
					</div>
				</div>
			)}

			<div className="flex justify-end gap-3 border-t border-border pt-4">
				<Link href="/collections"
					className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
					Cancel
				</Link>
				<button type="button" onClick={handleSave} disabled={!isValid || saving}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
					<Save className="h-4 w-4" />
					{saving ? 'Saving...' : 'Save Content Type'}
				</button>
			</div>
		</div>
	);
}
