import { describe, expect, it } from 'vitest';
import { field } from '../src/schema/field-types.js';
import { generateZodSchema, validateField } from '../src/schema/field-validators.js';
import { defineCollection } from '../src/schema/define-collection.js';

describe('validateField', () => {
	describe('text field', () => {
		it('validates a valid string', () => {
			const result = validateField(field.text(), 'hello');
			expect(result.ok).toBe(true);
		});

		it('rejects non-string value', () => {
			const result = validateField(field.text(), 123);
			expect(result.ok).toBe(false);
		});

		it('enforces min length', () => {
			const result = validateField(field.text({ min: 3 }), 'ab');
			expect(result.ok).toBe(false);
		});

		it('enforces max length', () => {
			const result = validateField(field.text({ max: 5 }), 'abcdef');
			expect(result.ok).toBe(false);
		});

		it('enforces regex pattern', () => {
			const def = field.text({ regex: '^[A-Z]+$' });
			expect(validateField(def, 'ABC').ok).toBe(true);
			expect(validateField(def, 'abc').ok).toBe(false);
		});
	});

	describe('number field', () => {
		it('validates a valid number', () => {
			const result = validateField(field.number(), 42);
			expect(result.ok).toBe(true);
		});

		it('rejects non-number value', () => {
			const result = validateField(field.number(), 'abc');
			expect(result.ok).toBe(false);
		});

		it('enforces min value', () => {
			const result = validateField(field.number({ min: 10 }), 5);
			expect(result.ok).toBe(false);
		});

		it('enforces max value', () => {
			const result = validateField(field.number({ max: 100 }), 200);
			expect(result.ok).toBe(false);
		});

		it('enforces integer constraint', () => {
			const def = field.number({ integer: true });
			expect(validateField(def, 5).ok).toBe(true);
			expect(validateField(def, 5.5).ok).toBe(false);
		});
	});

	describe('boolean field', () => {
		it('validates a boolean', () => {
			expect(validateField(field.boolean(), true).ok).toBe(true);
			expect(validateField(field.boolean(), false).ok).toBe(true);
		});

		it('rejects non-boolean value', () => {
			expect(validateField(field.boolean(), 'true').ok).toBe(false);
		});
	});

	describe('date field', () => {
		it('validates a valid ISO date string', () => {
			const result = validateField(field.date(), '2025-01-15');
			expect(result.ok).toBe(true);
		});

		it('rejects invalid date string', () => {
			const result = validateField(field.date(), 'not-a-date');
			expect(result.ok).toBe(false);
		});
	});

	describe('datetime field', () => {
		it('validates a valid ISO datetime string', () => {
			const result = validateField(field.datetime(), '2025-01-15T10:30:00Z');
			expect(result.ok).toBe(true);
		});
	});

	describe('select field', () => {
		const def = field.select({ options: ['draft', 'active', 'archived'] });

		it('validates a valid option', () => {
			expect(validateField(def, 'draft').ok).toBe(true);
		});

		it('rejects an invalid option', () => {
			expect(validateField(def, 'unknown').ok).toBe(false);
		});

		it('validates multiple selections', () => {
			const multiDef = field.select({
				options: ['red', 'green', 'blue'],
				multiple: true,
			});
			expect(validateField(multiDef, ['red', 'blue']).ok).toBe(true);
			expect(validateField(multiDef, ['red', 'invalid']).ok).toBe(false);
		});
	});

	describe('richtext field', () => {
		it('validates a string', () => {
			expect(validateField(field.richtext(), '<p>Hello</p>').ok).toBe(true);
		});

		it('enforces maxLength', () => {
			const def = field.richtext({ maxLength: 5 });
			expect(validateField(def, 'abcdef').ok).toBe(false);
		});
	});

	describe('email field', () => {
		it('validates a valid email', () => {
			expect(validateField(field.email(), 'user@example.com').ok).toBe(true);
		});

		it('rejects an invalid email', () => {
			expect(validateField(field.email(), 'not-email').ok).toBe(false);
		});
	});

	describe('url field', () => {
		it('validates a valid URL', () => {
			expect(validateField(field.url(), 'https://example.com').ok).toBe(true);
		});

		it('rejects an invalid URL', () => {
			expect(validateField(field.url(), 'not a url').ok).toBe(false);
		});
	});

	describe('slug field', () => {
		it('validates a valid slug', () => {
			expect(validateField(field.slug(), 'my-awesome-post').ok).toBe(true);
		});

		it('rejects slugs with spaces or uppercase', () => {
			expect(validateField(field.slug(), 'My Post').ok).toBe(false);
		});
	});

	describe('color field', () => {
		it('validates hex colors', () => {
			expect(validateField(field.color(), '#fff').ok).toBe(true);
			expect(validateField(field.color(), '#ff0000').ok).toBe(true);
			expect(validateField(field.color(), '#ff000088').ok).toBe(true);
		});

		it('rejects invalid colors', () => {
			expect(validateField(field.color(), 'red').ok).toBe(false);
			expect(validateField(field.color(), '#gg0000').ok).toBe(false);
		});
	});

	describe('password field', () => {
		it('validates a string', () => {
			expect(validateField(field.password(), 'secret123').ok).toBe(true);
		});

		it('enforces min length', () => {
			const def = field.password({ min: 8 });
			expect(validateField(def, 'short').ok).toBe(false);
			expect(validateField(def, 'longpassword').ok).toBe(true);
		});
	});

	describe('media field', () => {
		it('validates a string reference', () => {
			expect(validateField(field.media(), 'media-id-123').ok).toBe(true);
		});

		it('validates multiple media references', () => {
			const def = field.media({ multiple: true });
			expect(validateField(def, ['id1', 'id2']).ok).toBe(true);
		});
	});

	describe('relation field', () => {
		it('validates a single relation ID', () => {
			const def = field.relation({ collection: 'users', relationType: 'many-to-one' });
			expect(validateField(def, 'user-123').ok).toBe(true);
		});

		it('validates many-to-many as array', () => {
			const def = field.relation({ collection: 'tags', relationType: 'many-to-many' });
			expect(validateField(def, ['tag1', 'tag2']).ok).toBe(true);
		});
	});

	describe('json field', () => {
		it('accepts any value by default', () => {
			expect(validateField(field.json(), { key: 'value' }).ok).toBe(true);
		});
	});

	describe('optional fields', () => {
		it('allows undefined for optional fields', () => {
			const def = field.text({ required: false });
			expect(validateField(def, undefined).ok).toBe(true);
		});

		it('allows null for optional fields', () => {
			const def = field.text({ required: false });
			expect(validateField(def, null).ok).toBe(true);
		});
	});
});

describe('generateZodSchema', () => {
	it('generates a schema from a collection definition', () => {
		const collectionResult = defineCollection({
			name: 'Posts',
			fields: {
				title: field.text({ required: true, min: 3 }),
				status: field.select({ options: ['draft', 'published'] }),
				content: field.richtext({ required: false }),
			},
		});

		expect(collectionResult.ok).toBe(true);
		if (!collectionResult.ok) return;

		const schema = generateZodSchema(collectionResult.data);
		const valid = schema.safeParse({
			title: 'Hello World',
			status: 'draft',
			content: null,
		});
		expect(valid.success).toBe(true);
	});

	it('rejects invalid data against generated schema', () => {
		const collectionResult = defineCollection({
			name: 'Posts',
			fields: {
				title: field.text({ min: 3 }),
				views: field.number({ min: 0 }),
			},
		});

		expect(collectionResult.ok).toBe(true);
		if (!collectionResult.ok) return;

		const schema = generateZodSchema(collectionResult.data);
		const invalid = schema.safeParse({ title: 'ab', views: -5 });
		expect(invalid.success).toBe(false);
	});
});
