import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_ROLES,
	ROLE_EDITOR,
	ROLE_SUPER_ADMIN,
	ROLE_VIEWER,
	checkFieldPermission,
	checkPermission,
	createAuthContext,
	createRoleRegistry,
	defineRole,
	getContextAccessibleFields,
} from '../src/rbac.js';
import type { AuthContext, User } from '../src/auth.types.js';

const mockUser: User = {
	id: 'user-1',
	email: 'test@example.com',
	name: 'Test User',
	role: 'editor',
	isActive: true,
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: '2025-01-01T00:00:00Z',
};

const mockSession = {
	userId: 'user-1',
	role: 'editor',
	expiresAt: '2025-12-31T00:00:00Z',
};

describe('defineRole', () => {
	it('creates a frozen role definition', () => {
		const role = defineRole({
			name: 'custom',
			description: 'Custom role',
			permissions: ['posts:read'],
		});
		expect(Object.isFrozen(role)).toBe(true);
		expect(role.name).toBe('custom');
	});
});

describe('Built-in roles', () => {
	it('has 4 built-in roles', () => {
		expect(Object.keys(BUILT_IN_ROLES)).toHaveLength(4);
	});

	it('super-admin has global wildcard', () => {
		expect(ROLE_SUPER_ADMIN.permissions).toContain('*');
	});

	it('viewer has only read access', () => {
		expect(ROLE_VIEWER.permissions).toEqual(['*:read']);
	});
});

describe('createRoleRegistry', () => {
	it('starts with built-in roles', () => {
		const registry = createRoleRegistry();
		expect(registry.getAll()).toHaveLength(4);
	});

	it('adds custom roles', () => {
		const registry = createRoleRegistry();
		registry.add({ name: 'author', description: 'Author', permissions: ['posts:*'] });
		expect(registry.get('author')).toBeDefined();
		expect(registry.getAll()).toHaveLength(5);
	});

	it('cannot remove built-in roles', () => {
		const registry = createRoleRegistry();
		expect(registry.remove('super-admin')).toBe(false);
		expect(registry.get('super-admin')).toBeDefined();
	});

	it('can remove custom roles', () => {
		const registry = createRoleRegistry();
		registry.add({ name: 'temp', description: 'Temp', permissions: [] });
		expect(registry.remove('temp')).toBe(true);
		expect(registry.get('temp')).toBeUndefined();
	});
});

describe('createAuthContext', () => {
	it('pre-computes permission map', () => {
		const ctx = createAuthContext(mockUser, ROLE_EDITOR, mockSession);
		expect(ctx.permissionMap).toBeInstanceOf(Set);
		expect(ctx.permissionMap.size).toBeGreaterThan(0);
	});
});

describe('checkPermission', () => {
	it('allows editor to create content', () => {
		const ctx = createAuthContext(mockUser, ROLE_EDITOR, mockSession);
		expect(checkPermission(ctx, 'posts', 'create')).toBe(true);
	});

	it('allows editor to read', () => {
		const ctx = createAuthContext(mockUser, ROLE_EDITOR, mockSession);
		expect(checkPermission(ctx, 'posts', 'read')).toBe(true);
	});

	it('denies viewer to create', () => {
		const ctx = createAuthContext(
			{ ...mockUser, role: 'viewer' },
			ROLE_VIEWER,
			mockSession,
		);
		expect(checkPermission(ctx, 'posts', 'create')).toBe(false);
	});

	it('allows viewer to read', () => {
		const ctx = createAuthContext(
			{ ...mockUser, role: 'viewer' },
			ROLE_VIEWER,
			mockSession,
		);
		expect(checkPermission(ctx, 'posts', 'read')).toBe(true);
	});

	it('super-admin can do anything', () => {
		const ctx = createAuthContext(
			{ ...mockUser, role: 'super-admin' },
			ROLE_SUPER_ADMIN,
			mockSession,
		);
		expect(checkPermission(ctx, 'posts', 'delete')).toBe(true);
		expect(checkPermission(ctx, 'users', 'manage')).toBe(true);
		expect(checkPermission(ctx, 'anything', 'whatever')).toBe(true);
	});
});

describe('checkFieldPermission', () => {
	it('allows full resource access to access any field', () => {
		const ctx = createAuthContext(mockUser, ROLE_EDITOR, mockSession);
		expect(checkFieldPermission(ctx, 'posts', 'update', 'title')).toBe(true);
	});
});

describe('getContextAccessibleFields', () => {
	it('returns null for full access', () => {
		const ctx = createAuthContext(mockUser, ROLE_EDITOR, mockSession);
		const fields = getContextAccessibleFields(ctx, 'posts', 'update', ['title', 'status']);
		expect(fields).toBeNull();
	});

	it('returns specific fields for field-level permissions', () => {
		const customRole = defineRole({
			name: 'limited',
			description: 'Limited editor',
			permissions: ['posts:update:title'],
		});
		const ctx = createAuthContext(mockUser, customRole, mockSession);
		const fields = getContextAccessibleFields(ctx, 'posts', 'update', ['title', 'status']);
		expect(fields).toEqual(['title']);
	});
});
