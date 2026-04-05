'use client';

import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FieldTypeName } from './field-type-selector';

export type FieldConfig = {
	id: string;
	name: string;
	type: FieldTypeName;
	required: boolean;
	unique: boolean;
	options?: string[];
	min?: number;
	max?: number;
	relatedCollection?: string;
	relationType?: string;
};

type FieldEditorProps = {
	field: FieldConfig;
	onChange: (field: FieldConfig) => void;
	onRemove: () => void;
};

/**
 * Editor card for a single field in the collection builder.
 * Shows field name, type, and expandable settings panel.
 * @param props - Field config, onChange, onRemove
 * @returns FieldEditor component
 */
export const FieldEditor = ({ field, onChange, onRemove }: FieldEditorProps) => {
	const [expanded, setExpanded] = useState(false);

	const update = (partial: Partial<FieldConfig>) => {
		onChange({ ...field, ...partial });
	};

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center gap-3 px-4 py-3">
				<GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

				<input
					type="text"
					value={field.name}
					onChange={(e) => update({ name: e.target.value })}
					placeholder="Field name"
					className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
				/>

				<span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
					{field.type}
				</span>

				<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<input
						type="checkbox"
						checked={field.required}
						onChange={(e) => update({ required: e.target.checked })}
						className="h-3.5 w-3.5 rounded border-border"
					/>
					Required
				</label>

				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="rounded p-1 hover:bg-accent"
					aria-label="Toggle settings"
				>
					{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
				</button>

				<button
					type="button"
					onClick={onRemove}
					className="rounded p-1 text-destructive hover:bg-destructive/10"
					aria-label="Remove field"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>

			{expanded && (
				<div className="border-t border-border px-4 py-3 space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<label className="space-y-1">
							<span className="text-xs font-medium text-muted-foreground">Label</span>
							<input
								type="text"
								placeholder="Display label"
								className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
							/>
						</label>
						<label className="flex items-center gap-2 self-end">
							<input
								type="checkbox"
								checked={field.unique}
								onChange={(e) => update({ unique: e.target.checked })}
								className="h-3.5 w-3.5 rounded border-border"
							/>
							<span className="text-xs font-medium text-muted-foreground">Unique</span>
						</label>
					</div>

					{(field.type === 'text' || field.type === 'password') && (
						<div className="grid grid-cols-2 gap-3">
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Min length</span>
								<input
									type="number"
									value={field.min ?? ''}
									onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Max length</span>
								<input
									type="number"
									value={field.max ?? ''}
									onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								/>
							</label>
						</div>
					)}

					{field.type === 'number' && (
						<div className="grid grid-cols-2 gap-3">
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Min value</span>
								<input
									type="number"
									value={field.min ?? ''}
									onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Max value</span>
								<input
									type="number"
									value={field.max ?? ''}
									onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								/>
							</label>
						</div>
					)}

					{field.type === 'select' && (
						<label className="space-y-1">
							<span className="text-xs font-medium text-muted-foreground">Options (comma-separated)</span>
							<input
								type="text"
								value={field.options?.join(', ') ?? ''}
								onChange={(e) => update({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
								placeholder="draft, published, archived"
								className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
							/>
						</label>
					)}

					{field.type === 'relation' && (
						<div className="grid grid-cols-2 gap-3">
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Collection</span>
								<input
									type="text"
									value={field.relatedCollection ?? ''}
									onChange={(e) => update({ relatedCollection: e.target.value })}
									placeholder="e.g. users"
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-medium text-muted-foreground">Relation type</span>
								<select
									value={field.relationType ?? 'many-to-one'}
									onChange={(e) => update({ relationType: e.target.value })}
									className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
								>
									<option value="one-to-one">One to One</option>
									<option value="one-to-many">One to Many</option>
									<option value="many-to-one">Many to One</option>
									<option value="many-to-many">Many to Many</option>
								</select>
							</label>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
