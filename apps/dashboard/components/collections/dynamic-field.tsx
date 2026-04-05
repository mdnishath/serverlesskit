'use client';

import type { FieldTypeName } from './field-type-selector';

type DynamicFieldProps = {
	name: string;
	type: FieldTypeName;
	value: unknown;
	onChange: (value: unknown) => void;
	required?: boolean;
	options?: string[];
	error?: string;
};

/**
 * Renders the appropriate input for any field type.
 * Single DRY component used across all entry forms.
 * @param props - Field definition and value
 * @returns The rendered field input
 */
export const DynamicField = ({ name, type, value, onChange, required, options, error }: DynamicFieldProps) => {
	const inputClass =
		'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
	const errorClass = error ? 'border-destructive' : '';

	const renderInput = () => {
		switch (type) {
			case 'text':
			case 'email':
			case 'url':
			case 'slug':
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
						<input
							type="checkbox"
							checked={Boolean(value)}
							onChange={(e) => onChange(e.target.checked)}
							className="h-4 w-4 rounded border-border"
						/>
						<span className="text-sm">Enabled</span>
					</label>
				);

			case 'date':
				return (
					<input
						type="date"
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						required={required}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			case 'datetime':
				return (
					<input
						type="datetime-local"
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						required={required}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			case 'select':
				return (
					<select
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						required={required}
						className={`${inputClass} ${errorClass}`}
					>
						<option value="">Select...</option>
						{options?.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</select>
				);

			case 'richtext':
				return (
					<textarea
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						required={required}
						rows={6}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			case 'color':
				return (
					<div className="flex items-center gap-2">
						<input
							type="color"
							value={String(value ?? '#000000')}
							onChange={(e) => onChange(e.target.value)}
							className="h-10 w-10 cursor-pointer rounded border border-input"
						/>
						<input
							type="text"
							value={String(value ?? '')}
							onChange={(e) => onChange(e.target.value)}
							placeholder="#000000"
							className={`flex-1 ${inputClass} ${errorClass}`}
						/>
					</div>
				);

			case 'json':
				return (
					<textarea
						value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)}
						onChange={(e) => onChange(e.target.value)}
						rows={4}
						className={`${inputClass} ${errorClass} font-mono text-xs`}
						placeholder="{}"
					/>
				);

			case 'media':
			case 'relation':
				return (
					<input
						type="text"
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						placeholder={type === 'media' ? 'Media ID' : 'Related entry ID'}
						className={`${inputClass} ${errorClass}`}
					/>
				);

			default:
				return (
					<input
						type="text"
						value={String(value ?? '')}
						onChange={(e) => onChange(e.target.value)}
						className={`${inputClass} ${errorClass}`}
					/>
				);
		}
	};

	return (
		<div className="space-y-1.5">
			<label className="text-sm font-medium">
				{name}
				{required && <span className="ml-1 text-destructive">*</span>}
			</label>
			{renderInput()}
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
};
