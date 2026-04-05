'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, ImagePlus, X } from 'lucide-react';
import type { FieldTypeName } from './field-type-selector';
import { MediaPicker } from './media-picker';

type DynamicFieldProps = {
	name: string;
	type: FieldTypeName;
	value: unknown;
	onChange: (value: unknown) => void;
	required?: boolean;
	options?: string[];
	error?: string;
	/** All current form values — used by slug field to auto-generate */
	allValues?: Record<string, unknown>;
	/** Callback to update another field (slug auto-sync) */
	onChangeField?: (fieldName: string, value: unknown) => void;
};

/** Converts a string to a URL-friendly slug */
const slugify = (text: string): string =>
	text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Case-insensitive key lookup in a record */
const findValueCaseInsensitive = (obj: Record<string, unknown>, key: string): unknown => {
	const lower = key.toLowerCase();
	const match = Object.keys(obj).find((k) => k.toLowerCase() === lower);
	return match ? obj[match] : undefined;
};

/**
 * Renders the appropriate input for any field type.
 * Single DRY component used across all entry forms.
 * @param props - Field definition and value
 * @returns The rendered field input
 */
export const DynamicField = ({
	name, type, value, onChange, required, options, error, allValues, onChangeField,
}: DynamicFieldProps) => {
	const inputClass =
		'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
	const errorClass = error ? 'border-destructive' : '';

	const renderInput = () => {
		switch (type) {
			case 'text':
			case 'email':
			case 'url':
			case 'password':
				return (
					<input
						type={type === 'password' ? 'password' : type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						required={required}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			case 'slug':
				return <SlugInput value={value} onChange={onChange} allValues={allValues} error={error} />;

			case 'number':
				return (
					<input
						type="number"
						value={value === null || value === undefined ? '' : String(value)}
						onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
						required={required}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			case 'boolean':
				return (
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={Boolean(value)}
							onChange={(e) => onChange(e.target.checked)}
							className="h-4 w-4 rounded border-border" />
						<span className="text-sm">Enabled</span>
					</label>
				);

			case 'date':
				return (
					<input type="date" value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)} required={required}
						className={`${inputClass} ${errorClass}`} />
				);

			case 'datetime':
				return (
					<input type="datetime-local" value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)} required={required}
						className={`${inputClass} ${errorClass}`} />
				);

			case 'select':
				return (
					<select value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)} required={required}
						className={`${inputClass} ${errorClass}`}>
						<option value="">Select...</option>
						{options?.map((opt) => (
							<option key={opt} value={opt}>{opt}</option>
						))}
					</select>
				);

			case 'richtext':
				return (
					<textarea value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)} required={required}
						rows={6} className={`${inputClass} ${errorClass}`} />
				);

			case 'color':
				return (
					<div className="flex items-center gap-2">
						<input type="color" value={String(value ?? '#000000')}
							onChange={(e) => onChange(e.target.value)}
							className="h-10 w-10 cursor-pointer rounded border border-input" />
						<input type="text" value={String(value ?? '')}
							onChange={(e) => onChange(e.target.value)} placeholder="#000000"
							className={`flex-1 ${inputClass} ${errorClass}`} />
					</div>
				);

			case 'json':
				return (
					<textarea
						value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)}
						onChange={(e) => onChange(e.target.value)} rows={4}
						className={`${inputClass} ${errorClass} font-mono text-xs`} placeholder="{}" />
				);

			case 'media':
				return <MediaField value={value} onChange={onChange} error={error} />;

			case 'relation':
				return (
					<input type="text" value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						placeholder="Related entry ID"
						className={`${inputClass} ${errorClass}`} />
				);

			default:
				return (
					<input type="text" value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						className={`${inputClass} ${errorClass}`} />
				);
		}
	};

	return (
		<div className="space-y-1.5">
			<label className="text-sm font-medium capitalize">
				{name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
				{required && <span className="ml-1 text-destructive">*</span>}
			</label>
			{renderInput()}
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
};

/**
 * Slug input with auto-generate from the first text field value.
 * Has a lock/unlock toggle to control auto-sync.
 */
const SlugInput = ({
	value, onChange, allValues, error,
}: {
	value: unknown;
	onChange: (v: unknown) => void;
	allValues?: Record<string, unknown>;
	error?: string;
}) => {
	const [locked, setLocked] = useState(true);
	const inputClass =
		'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
	const errorClass = error ? 'border-destructive' : '';

	const sourceValue = allValues
		? String(findValueCaseInsensitive(allValues, 'title') ?? findValueCaseInsensitive(allValues, 'name') ?? '')
		: '';
	const autoSlug = slugify(sourceValue);
	const displayValue = locked ? autoSlug : String(value ?? '');

	/* Keep the slug value in sync when auto-generating */
	useEffect(() => {
		if (locked && autoSlug && autoSlug !== String(value ?? '')) {
			onChange(autoSlug);
		}
	}, [locked, autoSlug]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="flex gap-2">
			<input
				type="text"
				value={displayValue}
				onChange={(e) => {
					if (!locked) onChange(e.target.value);
				}}
				readOnly={locked}
				placeholder={locked ? 'Auto-generated from title' : 'Enter slug manually'}
				className={`flex-1 ${inputClass} ${errorClass} ${locked ? 'bg-muted text-muted-foreground' : ''}`}
			/>
			<button
				type="button"
				onClick={() => {
					if (locked) {
						setLocked(false);
						onChange(autoSlug);
					} else {
						setLocked(true);
						onChange(autoSlug);
					}
				}}
				className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent"
				title={locked ? 'Click to edit manually' : 'Click to auto-generate'}
			>
				{locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
				{locked ? 'Auto' : 'Manual'}
			</button>
		</div>
	);
};

/**
 * Media field with picker modal. Shows preview of selected image.
 * Value is stored as the media URL string.
 */
const MediaField = ({
	value, onChange, error,
}: {
	value: unknown;
	onChange: (v: unknown) => void;
	error?: string;
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const url = typeof value === 'string' ? value : '';
	const isImage = url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

	return (
		<>
			{url ? (
				<div className="relative inline-block">
					{isImage ? (
						<img src={url} alt="Selected media"
							className="h-32 w-auto rounded-lg border border-border object-cover" />
					) : (
						<div className="flex h-20 items-center rounded-lg border border-border bg-muted px-4 text-sm text-muted-foreground">
							{url.split('/').pop()}
						</div>
					)}
					<div className="mt-2 flex gap-2">
						<button type="button" onClick={() => setPickerOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
							<ImagePlus className="h-3.5 w-3.5" />
							Change
						</button>
						<button type="button" onClick={() => onChange('')}
							className="inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
							<X className="h-3.5 w-3.5" />
							Remove
						</button>
					</div>
				</div>
			) : (
				<button type="button" onClick={() => setPickerOpen(true)}
					className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground ${error ? 'border-destructive' : 'border-border'}`}>
					<ImagePlus className="h-5 w-5" />
					Choose media
				</button>
			)}
			<MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
				onSelect={(media) => onChange(media.url)} />
		</>
	);
};
