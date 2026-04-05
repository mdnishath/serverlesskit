'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';
import { DynamicField } from '@/components/collections/dynamic-field';
import type { FieldTypeName } from '@/components/collections/field-type-selector';

type FieldDef = {
	name: string;
	type: FieldTypeName;
	required: boolean;
	options?: string[];
};

const MOCK_FIELDS: FieldDef[] = [
	{ name: 'title', type: 'text', required: true },
	{ name: 'status', type: 'select', required: true, options: ['draft', 'published', 'archived'] },
	{ name: 'content', type: 'richtext', required: false },
];

export default function EntryEditorPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const entryId = params.id as string;

	const isNew = entryId === 'new';

	const [values, setValues] = useState<Record<string, unknown>>({});
	const [saving, setSaving] = useState(false);
	const [errors] = useState<Record<string, string>>({});

	const updateValue = (fieldName: string, value: unknown) => {
		setValues((prev) => ({ ...prev, [fieldName]: value }));
	};

	const handleSave = async () => {
		setSaving(true);
		// TODO: Call API to create/update entry
		await new Promise((r) => setTimeout(r, 500));
		setSaving(false);
		router.push(`/collections/${slug}`);
	};

	const handleDelete = async () => {
		// TODO: Call API to delete entry
		router.push(`/collections/${slug}`);
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href={`/collections/${slug}`} className="rounded-lg p-2 hover:bg-accent">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							{isNew ? 'New Entry' : 'Edit Entry'}
						</h1>
						<p className="text-muted-foreground capitalize">{slug}</p>
					</div>
				</div>
				{!isNew && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
						>
							<Copy className="h-4 w-4" />
							Duplicate
						</button>
						<button
							type="button"
							onClick={handleDelete}
							className="inline-flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
						>
							<Trash2 className="h-4 w-4" />
							Delete
						</button>
					</div>
				)}
			</div>

			<div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
				{MOCK_FIELDS.map((field) => (
					<DynamicField
						key={field.name}
						name={field.name}
						type={field.type}
						value={values[field.name]}
						onChange={(val) => updateValue(field.name, val)}
						required={field.required}
						options={field.options}
						error={errors[field.name]}
					/>
				))}
			</div>

			<div className="flex justify-end gap-3 border-t border-border pt-4">
				<Link
					href={`/collections/${slug}`}
					className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
				>
					Cancel
				</Link>
				<button
					type="button"
					onClick={handleSave}
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					<Save className="h-4 w-4" />
					{saving ? 'Saving...' : isNew ? 'Create Entry' : 'Save Changes'}
				</button>
			</div>
		</div>
	);
}
