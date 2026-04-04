import type {
	BooleanField,
	ColorField,
	DateField,
	DatetimeField,
	EmailField,
	JsonField,
	MediaField,
	NumberField,
	PasswordField,
	RelationField,
	RichtextField,
	SelectField,
	SlugField,
	TextField,
	UrlField,
} from './schema.types.js';

/**
 * Field builder API. Provides typed factory functions for every field type.
 * Usage: `field.text({ required: true, min: 3 })`
 */
export const field = {
	/** @param opts - Text field options (min, max, regex, default) */
	text: (opts: Omit<TextField, 'type'> = {}): TextField => ({
		type: 'text',
		...opts,
	}),

	/** @param opts - Number field options (min, max, integer, default) */
	number: (opts: Omit<NumberField, 'type'> = {}): NumberField => ({
		type: 'number',
		...opts,
	}),

	/** @param opts - Boolean field options (default) */
	boolean: (opts: Omit<BooleanField, 'type'> = {}): BooleanField => ({
		type: 'boolean',
		...opts,
	}),

	/** @param opts - Date field options (min, max, default) */
	date: (opts: Omit<DateField, 'type'> = {}): DateField => ({
		type: 'date',
		...opts,
	}),

	/** @param opts - Datetime field options (min, max, default) */
	datetime: (opts: Omit<DatetimeField, 'type'> = {}): DatetimeField => ({
		type: 'datetime',
		...opts,
	}),

	/** @param opts - Select field options (options[], multiple, default) */
	select: (opts: Omit<SelectField, 'type'>): SelectField => ({
		type: 'select',
		...opts,
	}),

	/** @param opts - Rich text field options (maxLength) */
	richtext: (opts: Omit<RichtextField, 'type'> = {}): RichtextField => ({
		type: 'richtext',
		...opts,
	}),

	/** @param opts - Media field options (allowedTypes, maxSize, multiple) */
	media: (opts: Omit<MediaField, 'type'> = {}): MediaField => ({
		type: 'media',
		...opts,
	}),

	/** @param opts - Relation field options (collection, relationType, displayField) */
	relation: (opts: Omit<RelationField, 'type'>): RelationField => ({
		type: 'relation',
		...opts,
	}),

	/** @param opts - JSON field options (schema) */
	json: (opts: Omit<JsonField, 'type'> = {}): JsonField => ({
		type: 'json',
		...opts,
	}),

	/** @param opts - Email field options (default) */
	email: (opts: Omit<EmailField, 'type'> = {}): EmailField => ({
		type: 'email',
		...opts,
	}),

	/** @param opts - URL field options (default) */
	url: (opts: Omit<UrlField, 'type'> = {}): UrlField => ({
		type: 'url',
		...opts,
	}),

	/** @param opts - Slug field options (sourceField, default) */
	slug: (opts: Omit<SlugField, 'type'> = {}): SlugField => ({
		type: 'slug',
		...opts,
	}),

	/** @param opts - Color field options (default) */
	color: (opts: Omit<ColorField, 'type'> = {}): ColorField => ({
		type: 'color',
		...opts,
	}),

	/** @param opts - Password field options (min, max) */
	password: (opts: Omit<PasswordField, 'type'> = {}): PasswordField => ({
		type: 'password',
		...opts,
	}),
} as const;
