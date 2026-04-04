import type { z } from 'zod';

/** All supported field type names */
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

/** Base properties shared by all field definitions */
type BaseFieldOptions = {
	required?: boolean;
	unique?: boolean;
	hidden?: boolean;
	label?: string;
	description?: string;
};

/** Text field configuration */
export type TextField = BaseFieldOptions & {
	type: 'text';
	min?: number;
	max?: number;
	regex?: string;
	default?: string;
};

/** Number field configuration */
export type NumberField = BaseFieldOptions & {
	type: 'number';
	min?: number;
	max?: number;
	integer?: boolean;
	default?: number;
};

/** Boolean field configuration */
export type BooleanField = BaseFieldOptions & {
	type: 'boolean';
	default?: boolean;
};

/** Date field configuration (date only, no time) */
export type DateField = BaseFieldOptions & {
	type: 'date';
	min?: string;
	max?: string;
	default?: string;
};

/** Datetime field configuration (date + time) */
export type DatetimeField = BaseFieldOptions & {
	type: 'datetime';
	min?: string;
	max?: string;
	default?: string;
};

/** Select/enum field configuration */
export type SelectField = BaseFieldOptions & {
	type: 'select';
	options: readonly string[];
	multiple?: boolean;
	default?: string | string[];
};

/** Rich text (HTML) field configuration */
export type RichtextField = BaseFieldOptions & {
	type: 'richtext';
	maxLength?: number;
};

/** Media/file reference field configuration */
export type MediaField = BaseFieldOptions & {
	type: 'media';
	allowedTypes?: string[];
	maxSize?: number;
	multiple?: boolean;
};

/** Relation type between collections */
export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

/** Relation field configuration */
export type RelationField = BaseFieldOptions & {
	type: 'relation';
	collection: string;
	relationType: RelationType;
	displayField?: string;
};

/** JSON field configuration */
export type JsonField = BaseFieldOptions & {
	type: 'json';
	schema?: z.ZodType;
};

/** Email field configuration */
export type EmailField = BaseFieldOptions & {
	type: 'email';
	default?: string;
};

/** URL field configuration */
export type UrlField = BaseFieldOptions & {
	type: 'url';
	default?: string;
};

/** Slug field configuration */
export type SlugField = BaseFieldOptions & {
	type: 'slug';
	sourceField?: string;
	default?: string;
};

/** Color field configuration (hex color) */
export type ColorField = BaseFieldOptions & {
	type: 'color';
	default?: string;
};

/** Password field configuration */
export type PasswordField = BaseFieldOptions & {
	type: 'password';
	min?: number;
	max?: number;
};

/** Discriminated union of all field definitions */
export type FieldDefinition =
	| TextField
	| NumberField
	| BooleanField
	| DateField
	| DatetimeField
	| SelectField
	| RichtextField
	| MediaField
	| RelationField
	| JsonField
	| EmailField
	| UrlField
	| SlugField
	| ColorField
	| PasswordField;

/** Map of field name to field definition */
export type FieldsMap = Record<string, FieldDefinition>;

/** Options for defining a collection */
export type CollectionOptions<F extends FieldsMap = FieldsMap> = {
	name: string;
	slug?: string;
	fields: F;
	timestamps?: boolean;
	softDelete?: boolean;
	description?: string;
};

/** A fully resolved, frozen collection definition */
export type CollectionDefinition<F extends FieldsMap = FieldsMap> = Readonly<{
	name: string;
	slug: string;
	fields: Readonly<F>;
	timestamps: boolean;
	softDelete: boolean;
	description: string;
}>;
