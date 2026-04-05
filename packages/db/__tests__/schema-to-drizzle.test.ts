import { describe, expect, it } from 'vitest';
import { defineCollection, field } from '@serverlesskit/core/schema';
import {
	collectionToCreateTableSql,
	collectionToSql,
	getColumnNames,
	junctionTableSql,
} from '../src/schema-to-drizzle.js';
import type { CollectionDefinition } from '@serverlesskit/core/schema';

/** Helper to quickly create a valid collection definition */
const makeCollection = (
	opts: Parameters<typeof defineCollection>[0],
): CollectionDefinition => {
	const result = defineCollection(opts);
	if (!result.ok) throw new Error(result.error.message);
	return result.data;
};

describe('collectionToCreateTableSql', () => {
	it('generates a basic table with id and text field', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text({ required: true }) },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);

		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "posts"');
		expect(sql).toContain('"id" TEXT PRIMARY KEY NOT NULL');
		expect(sql).toContain('"title" TEXT NOT NULL');
	});

	it('maps number field to REAL by default', () => {
		const col = makeCollection({
			name: 'Items',
			fields: { price: field.number() },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"price" REAL NOT NULL');
	});

	it('maps integer number field to INTEGER', () => {
		const col = makeCollection({
			name: 'Items',
			fields: { count: field.number({ integer: true }) },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"count" INTEGER NOT NULL');
	});

	it('maps boolean field to INTEGER', () => {
		const col = makeCollection({
			name: 'Items',
			fields: { active: field.boolean() },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"active" INTEGER NOT NULL');
	});

	it('includes timestamps when enabled', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text() },
			timestamps: true,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"createdAt" TEXT NOT NULL');
		expect(sql).toContain('"updatedAt" TEXT NOT NULL');
	});

	it('includes deletedAt when softDelete enabled', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text() },
			softDelete: true,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"deletedAt" TEXT');
	});

	it('handles optional fields without NOT NULL', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { subtitle: field.text({ required: false }) },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"subtitle" TEXT');
		expect(sql).not.toContain('"subtitle" TEXT NOT NULL');
	});

	it('handles unique constraint', () => {
		const col = makeCollection({
			name: 'Users',
			fields: { email: field.email({ unique: true }) },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"email" TEXT NOT NULL UNIQUE');
	});

	it('maps all text-like field types to TEXT', () => {
		const col = makeCollection({
			name: 'Test',
			fields: {
				name: field.text(),
				bio: field.richtext(),
				email: field.email(),
				website: field.url(),
				handle: field.slug(),
				theme: field.color(),
				secret: field.password(),
				birthday: field.date(),
				loginAt: field.datetime(),
			},
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);

		for (const f of ['name', 'bio', 'email', 'website', 'handle', 'theme', 'secret', 'birthday', 'loginAt']) {
			expect(sql).toContain(`"${f}" TEXT`);
		}
	});

	it('maps select field to TEXT', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { status: field.select({ options: ['draft', 'published'] }) },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"status" TEXT NOT NULL');
	});

	it('maps media field to TEXT', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { cover: field.media() },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"cover" TEXT NOT NULL');
	});

	it('maps json field to TEXT', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { meta: field.json() },
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"meta" TEXT NOT NULL');
	});

	it('maps many-to-one relation to TEXT column', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: {
				author: field.relation({ collection: 'users', relationType: 'many-to-one' }),
			},
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).toContain('"author" TEXT NOT NULL');
	});

	it('skips many-to-many relation from main table columns', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: {
				tags: field.relation({ collection: 'tags', relationType: 'many-to-many' }),
			},
			timestamps: false,
		});
		const sql = collectionToCreateTableSql(col);
		expect(sql).not.toContain('"tags"');
	});
});

describe('junctionTableSql', () => {
	it('creates a junction table with composite primary key', () => {
		const sql = junctionTableSql('posts', 'tags', 'tags');
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "posts_tags_tags"');
		expect(sql).toContain('"postsId" TEXT NOT NULL');
		expect(sql).toContain('"tagsId" TEXT NOT NULL');
		expect(sql).toContain('PRIMARY KEY ("postsId", "tagsId")');
	});
});

describe('collectionToSql', () => {
	it('returns only main table when no many-to-many relations', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text() },
			timestamps: false,
		});
		const statements = collectionToSql(col);
		expect(statements).toHaveLength(1);
	});

	it('includes junction table for many-to-many relations', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: {
				title: field.text(),
				tags: field.relation({ collection: 'tags', relationType: 'many-to-many' }),
			},
			timestamps: false,
		});
		const statements = collectionToSql(col);
		expect(statements).toHaveLength(2);
		expect(statements[1]).toContain('posts_tags_tags');
	});
});

describe('getColumnNames', () => {
	it('returns id + field columns', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text(), views: field.number() },
			timestamps: false,
		});
		expect(getColumnNames(col)).toEqual(['id', 'title', 'views']);
	});

	it('includes timestamp columns when enabled', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text() },
			timestamps: true,
		});
		const cols = getColumnNames(col);
		expect(cols).toContain('createdAt');
		expect(cols).toContain('updatedAt');
	});

	it('includes deletedAt when softDelete enabled', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: { title: field.text() },
			softDelete: true,
		});
		expect(getColumnNames(col)).toContain('deletedAt');
	});

	it('excludes many-to-many relation fields', () => {
		const col = makeCollection({
			name: 'Posts',
			fields: {
				title: field.text(),
				tags: field.relation({ collection: 'tags', relationType: 'many-to-many' }),
			},
			timestamps: false,
		});
		expect(getColumnNames(col)).toEqual(['id', 'title']);
	});
});
