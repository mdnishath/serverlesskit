import { describe, expect, it } from 'vitest';
import {
	buildPermissionMap,
	getAccessibleFields,
	hasFieldPermission,
	hasPermission,
	parsePermission,
} from '../src/permissions.js';

describe('Permissions — Edge Cases', () => {
	describe('parsePermission', () => {
		it('parses single segment as resource with wildcard action', () => {
			const result = parsePermission('posts');
			expect(result.resource).toBe('posts');
			expect(result.action).toBe('*');
			expect(result.field).toBeUndefined();
		});

		it('parses empty string', () => {
			const result = parsePermission('');
			expect(result.resource).toBe('');
			expect(result.action).toBe('*');
		});

		it('parses three-part field-level permission', () => {
			const result = parsePermission('posts:update:title');
			expect(result.resource).toBe('posts');
			expect(result.action).toBe('update');
			expect(result.field).toBe('title');
		});

		it('parses wildcard permission', () => {
			const result = parsePermission('*');
			expect(result.resource).toBe('*');
			expect(result.action).toBe('*');
		});
	});

	describe('buildPermissionMap', () => {
		it('returns empty set for empty array', () => {
			const map = buildPermissionMap([]);
			expect(map.size).toBe(0);
		});

		it('deduplicates identical permissions', () => {
			const map = buildPermissionMap(['posts:read', 'posts:read']);
			expect(map.has('posts:read')).toBe(true);
		});

		it('expands wildcard resource', () => {
			const map = buildPermissionMap(['*:read']);
			expect(map.has('*:read')).toBe(true);
		});

		it('expands wildcard action', () => {
			const map = buildPermissionMap(['posts:*']);
			expect(map.has('posts:*')).toBe(true);
		});

		it('expands global wildcard *', () => {
			const map = buildPermissionMap(['*']);
			expect(map.has('*')).toBe(true);
		});
	});

	describe('hasPermission', () => {
		it('grants access with explicit *:* permission', () => {
			const map = buildPermissionMap(['*:*']);
			expect(hasPermission(map, 'posts', 'create')).toBe(true);
			expect(hasPermission(map, 'users', 'delete')).toBe(true);
		});

		it('denies access when no matching permission', () => {
			const map = buildPermissionMap(['posts:read']);
			expect(hasPermission(map, 'posts', 'delete')).toBe(false);
			expect(hasPermission(map, 'users', 'read')).toBe(false);
		});

		it('resource wildcard grants all actions on that resource', () => {
			const map = buildPermissionMap(['media:*']);
			expect(hasPermission(map, 'media', 'upload')).toBe(true);
			expect(hasPermission(map, 'media', 'delete')).toBe(true);
			expect(hasPermission(map, 'posts', 'read')).toBe(false);
		});

		it('action wildcard grants action on all resources', () => {
			const map = buildPermissionMap(['*:read']);
			expect(hasPermission(map, 'posts', 'read')).toBe(true);
			expect(hasPermission(map, 'users', 'read')).toBe(true);
			expect(hasPermission(map, 'posts', 'delete')).toBe(false);
		});
	});

	describe('hasFieldPermission', () => {
		it('grants field access when resource:action is permitted', () => {
			const map = buildPermissionMap(['posts:update']);
			expect(hasFieldPermission(map, 'posts', 'update', 'title')).toBe(true);
			expect(hasFieldPermission(map, 'posts', 'update', 'body')).toBe(true);
		});

		it('grants field access with global wildcard', () => {
			const map = buildPermissionMap(['*']);
			expect(hasFieldPermission(map, 'posts', 'update', 'title')).toBe(true);
		});

		it('grants specific field access via field-level permission', () => {
			const map = buildPermissionMap(['posts:update:title']);
			expect(hasFieldPermission(map, 'posts', 'update', 'title')).toBe(true);
			expect(hasFieldPermission(map, 'posts', 'update', 'body')).toBe(false);
		});
	});

	describe('getAccessibleFields', () => {
		it('returns null when full resource:action access', () => {
			const map = buildPermissionMap(['posts:read']);
			const result = getAccessibleFields(map, 'posts', 'read', ['title', 'body']);
			expect(result).toBeNull();
		});

		it('returns empty array when no access', () => {
			const map = buildPermissionMap(['users:read']);
			const result = getAccessibleFields(map, 'posts', 'update', ['title', 'body']);
			expect(result).toEqual([]);
		});

		it('returns specific fields with field-level permissions', () => {
			const map = buildPermissionMap(['posts:update:title', 'posts:update:status']);
			const result = getAccessibleFields(map, 'posts', 'update', ['title', 'body', 'status']);
			expect(result).toEqual(['title', 'status']);
		});

		it('returns null with global wildcard', () => {
			const map = buildPermissionMap(['*']);
			const result = getAccessibleFields(map, 'anything', 'any', ['a', 'b']);
			expect(result).toBeNull();
		});
	});
});
