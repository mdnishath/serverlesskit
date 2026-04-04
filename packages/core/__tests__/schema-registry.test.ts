import { beforeEach, describe, expect, it } from 'vitest';
import { field } from '../src/schema/field-types.js';
import { defineCollection } from '../src/schema/define-collection.js';
import { createSchemaRegistry } from '../src/schema/schema-registry.js';
import type { CollectionDefinition } from '../src/schema/schema.types.js';

/** Helper to quickly create a valid collection definition */
const makeCollection = (
	name: string,
	fields: Parameters<typeof defineCollection>[0]['fields'],
): CollectionDefinition => {
	const result = defineCollection({ name, fields });
	if (!result.ok) throw new Error(`Failed to create test collection: ${result.error.message}`);
	return result.data;
};

describe('SchemaRegistry', () => {
	let registry: ReturnType<typeof createSchemaRegistry>;

	beforeEach(() => {
		registry = createSchemaRegistry();
	});

	it('registers a collection', () => {
		const posts = makeCollection('Posts', { title: field.text() });
		const result = registry.register(posts);

		expect(result.ok).toBe(true);
		expect(registry.size()).toBe(1);
	});

	it('retrieves a registered collection by slug', () => {
		const posts = makeCollection('Posts', { title: field.text() });
		registry.register(posts);

		const retrieved = registry.get('posts');
		expect(retrieved).toBeDefined();
		expect(retrieved?.name).toBe('Posts');
	});

	it('returns undefined for unregistered slug', () => {
		expect(registry.get('nonexistent')).toBeUndefined();
	});

	it('lists all registered collections', () => {
		registry.register(makeCollection('Posts', { title: field.text() }));
		registry.register(makeCollection('Users', { name: field.text() }));

		const all = registry.getAll();
		expect(all).toHaveLength(2);
	});

	it('prevents duplicate registration', () => {
		const posts = makeCollection('Posts', { title: field.text() });
		registry.register(posts);

		const result = registry.register(posts);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.code).toBe('CONFLICT');
	});

	it('validates relations — passes when all targets exist', () => {
		registry.register(makeCollection('Users', { name: field.text() }));
		registry.register(
			makeCollection('Posts', {
				title: field.text(),
				author: field.relation({ collection: 'users', relationType: 'many-to-one' }),
			}),
		);

		const result = registry.validateRelations();
		expect(result.ok).toBe(true);
	});

	it('validates relations — fails when target missing', () => {
		registry.register(
			makeCollection('Posts', {
				title: field.text(),
				author: field.relation({ collection: 'users', relationType: 'many-to-one' }),
			}),
		);

		const result = registry.validateRelations();
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('users');
	});

	it('removes a collection', () => {
		registry.register(makeCollection('Posts', { title: field.text() }));

		expect(registry.remove('posts')).toBe(true);
		expect(registry.size()).toBe(0);
		expect(registry.get('posts')).toBeUndefined();
	});

	it('returns false when removing nonexistent collection', () => {
		expect(registry.remove('nonexistent')).toBe(false);
	});

	it('clears all collections', () => {
		registry.register(makeCollection('Posts', { title: field.text() }));
		registry.register(makeCollection('Users', { name: field.text() }));

		registry.clear();
		expect(registry.size()).toBe(0);
	});

	it('validates multiple broken relations', () => {
		registry.register(
			makeCollection('Posts', {
				title: field.text(),
				author: field.relation({ collection: 'users', relationType: 'many-to-one' }),
				category: field.relation({ collection: 'categories', relationType: 'many-to-one' }),
			}),
		);

		const result = registry.validateRelations();
		expect(result.ok).toBe(false);
		if (result.ok) return;
		const details = result.error.details as string[];
		expect(details).toHaveLength(2);
	});
});
