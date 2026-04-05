'use client';

import {
	Type,
	Hash,
	ToggleLeft,
	Calendar,
	Clock,
	List,
	FileText,
	Image,
	Link2,
	Braces,
	Mail,
	Globe,
	Tag,
	Palette,
	Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldTypeName =
	| 'text'
	| 'number'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'select'
	| 'richtext'
	| 'media'
	| 'relation'
	| 'json'
	| 'email'
	| 'url'
	| 'slug'
	| 'color'
	| 'password';

type FieldTypeOption = {
	type: FieldTypeName;
	label: string;
	icon: typeof Type;
	description: string;
};

const FIELD_TYPES: FieldTypeOption[] = [
	{ type: 'text', label: 'Text', icon: Type, description: 'Short or long text' },
	{ type: 'number', label: 'Number', icon: Hash, description: 'Integer or decimal' },
	{ type: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'True/false toggle' },
	{ type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
	{ type: 'datetime', label: 'DateTime', icon: Clock, description: 'Date and time' },
	{ type: 'select', label: 'Select', icon: List, description: 'Dropdown options' },
	{ type: 'richtext', label: 'Rich Text', icon: FileText, description: 'HTML content' },
	{ type: 'media', label: 'Media', icon: Image, description: 'File upload' },
	{ type: 'relation', label: 'Relation', icon: Link2, description: 'Link to collection' },
	{ type: 'json', label: 'JSON', icon: Braces, description: 'Structured data' },
	{ type: 'email', label: 'Email', icon: Mail, description: 'Email address' },
	{ type: 'url', label: 'URL', icon: Globe, description: 'Web address' },
	{ type: 'slug', label: 'Slug', icon: Tag, description: 'URL-friendly ID' },
	{ type: 'color', label: 'Color', icon: Palette, description: 'Hex color' },
	{ type: 'password', label: 'Password', icon: Lock, description: 'Hashed password' },
];

type FieldTypeSelectorProps = {
	onSelect: (type: FieldTypeName) => void;
	onClose: () => void;
};

/**
 * Grid selector for choosing a field type when adding a new field.
 * @param props - onSelect callback and onClose
 * @returns FieldTypeSelector component
 */
export const FieldTypeSelector = ({ onSelect, onClose }: FieldTypeSelectorProps) => {
	return (
		<div className="rounded-xl border border-border bg-card p-4 shadow-lg">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold">Select Field Type</h3>
				<button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
					Cancel
				</button>
			</div>
			<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
				{FIELD_TYPES.map((ft) => (
					<button
						key={ft.type}
						type="button"
						onClick={() => onSelect(ft.type)}
						className={cn(
							'flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-center transition-colors',
							'hover:border-primary hover:bg-accent',
						)}
					>
						<ft.icon className="h-5 w-5 text-muted-foreground" />
						<span className="text-xs font-medium">{ft.label}</span>
					</button>
				))}
			</div>
		</div>
	);
};
