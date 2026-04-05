import { describe, expect, it } from 'vitest';
import {
	buildPermissionMap,
	getAccessibleFields,
	hasFieldPermission,
	hasPermission,
	parsePermission,
} from '../src/permissions.js';

describe('parsePermission', () => {
	it('parses resource:action', () => {
		expect(parsePermission('posts:create')).toEqual({
			resource: 'posts',
			action: 'create',
			field: undefined,
		});
	});

	it('parses resource:action:field', () => {
		expect(parsePermission('posts:update:title')).toEqual({
			resource: 'posts',
			action: 'update',
			field: 'title',
		});
	});

	it('parses wildcard *', () => {
		expect(parsePermission('*')).toEqual({
			resource: '*',
			action: '*',
			field: undefined,
		});
	});

	it('parses *:read', () => {
		expect(parsePermission('*:read')).toEqual({
			resource: '*',
			action: 'read',
			field: undefined,
		});
	});
});

describe('buildPermissionMap', () => {
	it('creates a set from permission strings', () => {
		const map = buildPermissionMap(['posts:create', 'posts:read']);
		expect(map.has('posts:create')).toBe(true);
		expect(map.has('posts:read')).toBe(true);
		expect(map.has('posts:delete')).toBe(false);
	});

	it('expands * to include wildcard key', () => {
		const map = buildPermissionMap(['*']);
		expect(map.has('*')).toBe(true);
	});

	it('expands *:action wildcards', () => {
		const map = buildPermissionMap(['*:read']);
		expect(map.has('*:read')).toBe(true);
	});

	it('expands resource:* wildcards', () => {
		const map = buildPermissionMap(['posts:*']);
		expect(map.has('posts:*')).toBe(true);
	});
});

describe('hasPermission', () => {
	it('grants exact permission', () => {
		const map = buildPermissionMap(['posts:create']);
		expect(hasPermission(map, 'posts', 'create')).toBe(true);
	});

	it('denies missing permission', () => {
		const map = buildPermissionMap(['posts:read']);
		expect(hasPermission(map, 'posts', 'create')).toBe(false);
	});

	it('grants via global wildcard *', () => {
		const map = buildPermissionMap(['*']);
		expect(hasPermission(map, 'posts', 'create')).toBe(true);
		expect(hasPermission(map, 'users', 'delete')).toBe(true);
	});

	it('grants via action wildcard *:read', () => {
		const map = buildPermissionMap(['*:read']);
		expect(hasPermission(map, 'posts', 'read')).toBe(true);
		expect(hasPermission(map, 'users', 'read')).toBe(true);
		expect(hasPermission(map, 'posts', 'create')).toBe(false);
	});

	it('grants via resource wildcard posts:*', () => {
		const map = buildPermissionMap(['posts:*']);
		expect(hasPermission(map, 'posts', 'create')).toBe(true);
		expect(hasPermission(map, 'posts', 'delete')).toBe(true);
		expect(hasPermission(map, 'users', 'read')).toBe(false);
	});
});

describe('hasFieldPermission', () => {
	it('grants if resource:action is permitted', () => {
		const map = buildPermissionMap(['posts:update']);
		expect(hasFieldPermission(map, 'posts', 'update', 'title')).toBe(true);
	});

	it('grants specific field permission', () => {
		const map = buildPermissionMap(['posts:update:title']);
		expect(hasFieldPermission(map, 'posts', 'update', 'title')).toBe(true);
		expect(hasFieldPermission(map, 'posts', 'update', 'status')).toBe(false);
	});
});

describe('getAccessibleFields', () => {
	const allFields = ['title', 'status', 'content', 'author'];

	it('returns null when full resource:action access exists', () => {
		const map = buildPermissionMap(['posts:update']);
		expect(getAccessibleFields(map, 'posts', 'update', allFields)).toBeNull();
	});

	it('returns specific fields when only field-level permissions exist', () => {
		const map = buildPermissionMap(['posts:update:title', 'posts:update:status']);
		const fields = getAccessibleFields(map, 'posts', 'update', allFields);
		expect(fields).toEqual(['title', 'status']);
	});

	it('returns empty array when no permissions exist', () => {
		const map = buildPermissionMap([]);
		const fields = getAccessibleFields(map, 'posts', 'update', allFields);
		expect(fields).toEqual([]);
	});
});
