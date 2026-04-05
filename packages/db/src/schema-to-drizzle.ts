import type { CollectionDefinition, FieldDefinition } from '@serverlesskit/core/schema';

/** Column SQL definition */
type ColumnSql = {
	name: string;
	sql: string;
};

/**
 * Maps a single FieldDefinition to its SQLite column type.
 * @param name - The column name
 * @param def - The field definition
 * @returns Column SQL definition string
 */
const fieldToColumnSql = (name: string, def: FieldDefinition): ColumnSql => {
	const nullable = def.required === false ? '' : ' NOT NULL';
	const unique = def.unique ? ' UNIQUE' : '';

	switch (def.type) {
		case 'number':
			return {
				name,
				sql: def.integer
					? `"${name}" INTEGER${nullable}${unique}`
					: `"${name}" REAL${nullable}${unique}`,
			};
		case 'boolean':
			return {
				name,
				sql: `"${name}" INTEGER${nullable}${unique}`,
			};
		case 'text':
		case 'richtext':
		case 'email':
		case 'url':
		case 'slug':
		case 'color':
		case 'password':
		case 'date':
		case 'datetime':
			return { name, sql: `"${name}" TEXT${nullable}${unique}` };
		case 'select':
			return { name, sql: `"${name}" TEXT${nullable}${unique}` };
		case 'media':
			return { name, sql: `"${name}" TEXT${nullable}` };
		case 'relation':
			if (def.relationType === 'many-to-many') {
				return { name, sql: '' };
			}
			return { name, sql: `"${name}" TEXT${nullable}` };
		case 'json':
			return { name, sql: `"${name}" TEXT${nullable}` };
	}
};

/**
 * Generates a CREATE TABLE SQL statement from a CollectionDefinition.
 * @param collection - The collection definition
 * @returns The SQL CREATE TABLE statement
 */
export const collectionToCreateTableSql = (collection: CollectionDefinition): string => {
	const columns: string[] = ['"id" TEXT PRIMARY KEY NOT NULL'];

	for (const [name, def] of Object.entries(collection.fields)) {
		const col = fieldToColumnSql(name, def);
		if (col.sql) {
			columns.push(col.sql);
		}
	}

	if (collection.timestamps) {
		columns.push('"createdAt" TEXT NOT NULL');
		columns.push('"updatedAt" TEXT NOT NULL');
	}

	if (collection.softDelete) {
		columns.push('"deletedAt" TEXT');
	}

	return `CREATE TABLE IF NOT EXISTS "${collection.slug}" (\n  ${columns.join(',\n  ')}\n);`;
};

/**
 * Generates CREATE TABLE SQL for a many-to-many junction table.
 * @param sourceSlug - The source collection slug
 * @param fieldName - The relation field name
 * @param targetSlug - The target collection slug
 * @returns The SQL CREATE TABLE statement for the junction table
 */
export const junctionTableSql = (
	sourceSlug: string,
	fieldName: string,
	targetSlug: string,
): string => {
	const tableName = `${sourceSlug}_${fieldName}_${targetSlug}`;
	return [
		`CREATE TABLE IF NOT EXISTS "${tableName}" (`,
		`  "${sourceSlug}Id" TEXT NOT NULL,`,
		`  "${targetSlug}Id" TEXT NOT NULL,`,
		`  PRIMARY KEY ("${sourceSlug}Id", "${targetSlug}Id")`,
		');',
	].join('\n');
};

/**
 * Generates all SQL statements needed for a collection (main table + junction tables).
 * @param collection - The collection definition
 * @returns Array of SQL CREATE TABLE statements
 */
export const collectionToSql = (collection: CollectionDefinition): string[] => {
	const statements: string[] = [collectionToCreateTableSql(collection)];

	for (const [fieldName, def] of Object.entries(collection.fields)) {
		if (def.type === 'relation' && def.relationType === 'many-to-many') {
			statements.push(junctionTableSql(collection.slug, fieldName, def.collection));
		}
	}

	return statements;
};

/**
 * Extracts column names from a collection definition (for Drizzle select/insert operations).
 * @param collection - The collection definition
 * @returns Array of column names including system columns
 */
export const getColumnNames = (collection: CollectionDefinition): string[] => {
	const columns = ['id'];

	for (const [name, def] of Object.entries(collection.fields)) {
		if (def.type === 'relation' && def.relationType === 'many-to-many') {
			continue;
		}
		columns.push(name);
	}

	if (collection.timestamps) {
		columns.push('createdAt', 'updatedAt');
	}
	if (collection.softDelete) {
		columns.push('deletedAt');
	}

	return columns;
};
