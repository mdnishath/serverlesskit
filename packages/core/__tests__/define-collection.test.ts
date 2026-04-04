import { describe, expect, it } from 'vitest';
import { field } from '../src/schema/field-types.js';
import { defineCollection } from '../src/schema/define-collection.js';

describe('defineCollection', () => {
	it('creates a valid collection definition', () => {
		const result = defineCollection({
			name: 'Projects',
			fields: {
				title: field.text({ required: true }),
				budget: field.number({ min: 0 }),
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data.name).toBe('Projects');
		expect(result.data.slug).toBe('projects');
		expect(result.data.timestamps).toBe(true);
		expect(result.data.softDelete).toBe(false);
		expect(Object.keys(result.data.fields)).toEqual(['title', 'budget']);
	});

	it('auto-generates slug from name', () => {
		const result = defineCollection({
			name: 'Blog Posts',
			fields: { title: field.text() },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.slug).toBe('blog-posts');
	});

	it('uses provided slug over auto-generated', () => {
		const result = defineCollection({
			name: 'Blog Posts',
			slug: 'articles',
			fields: { title: field.text() },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.slug).toBe('articles');
	});

	it('enables timestamps by default', () => {
		const result = defineCollection({
			name: 'Test',
			fields: { name: field.text() },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.timestamps).toBe(true);
	});

	it('respects timestamps: false', () => {
		const result = defineCollection({
			name: 'Test',
			fields: { name: field.text() },
			timestamps: false,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.timestamps).toBe(false);
	});

	it('enables soft delete when configured', () => {
		const result = defineCollection({
			name: 'Test',
			fields: { name: field.text() },
			softDelete: true,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.softDelete).toBe(true);
	});

	it('returns frozen definition object', () => {
		const result = defineCollection({
			name: 'Test',
			fields: { name: field.text() },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(Object.isFrozen(result.data)).toBe(true);
		expect(Object.isFrozen(result.data.fields)).toBe(true);
	});

	it('fails when name is empty', () => {
		const result = defineCollection({
			name: '',
			fields: { title: field.text() },
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('SCHEMA_ERROR');
	});

	it('fails when fields are empty', () => {
		const result = defineCollection({
			name: 'Test',
			fields: {},
		});

		expect(result.ok).toBe(false);
	});

	it('fails when using reserved field names', () => {
		const result = defineCollection({
			name: 'Test',
			fields: {
				id: field.text(),
				title: field.text(),
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('reserved');
	});

	it('fails when select field has no options', () => {
		const result = defineCollection({
			name: 'Test',
			fields: {
				status: field.select({ options: [] }),
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('at least one option');
	});

	it('stores description', () => {
		const result = defineCollection({
			name: 'Test',
			fields: { name: field.text() },
			description: 'A test collection',
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.description).toBe('A test collection');
	});

	it('works with complex field combinations', () => {
		const result = defineCollection({
			name: 'Projects',
			fields: {
				title: field.text({ required: true, min: 3, max: 200 }),
				status: field.select({ options: ['draft', 'active', 'archived'], default: 'draft' }),
				budget: field.number({ min: 0 }),
				client: field.relation({ collection: 'clients', relationType: 'many-to-one' }),
				startDate: field.date(),
				description: field.richtext(),
				tags: field.json(),
				logo: field.media({ allowedTypes: ['image/png', 'image/jpeg'] }),
				website: field.url({ required: false }),
				contactEmail: field.email(),
				color: field.color({ default: '#000000' }),
				slug: field.slug({ sourceField: 'title' }),
			},
			timestamps: true,
			softDelete: true,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(Object.keys(result.data.fields)).toHaveLength(12);
	});
});
