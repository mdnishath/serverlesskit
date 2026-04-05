import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_ROLES,
	ROLE_EDITOR,
	ROLE_SUPER_ADMIN,
	ROLE_VIEWER,
	checkPermission,
	createAuthContext,
	createRoleRegistry,
} from '../src/rbac.js';

/** Helper to create a test auth context */
const makeCtx = (role: Parameters<typeof createAuthContext>[1]) => {
	return createAuthContext(
		{ id: '1', email: 'u@test.com', name: 'Test', role: role.name, isActive: true },
		role,
		{ id: 's1', userId: '1', expiresAt: '' },
	);
};

describe('RBAC — Edge Cases', () => {
	describe('createRoleRegistry', () => {
		it('starts with 4 built-in roles', () => {
			const reg = createRoleRegistry();
			expect(reg.getAll()).toHaveLength(4);
		});

		it('cannot remove built-in roles', () => {
			const reg = createRoleRegistry();
			expect(reg.remove('super-admin')).toBe(false);
			expect(reg.remove('admin')).toBe(false);
			expect(reg.remove('editor')).toBe(false);
			expect(reg.remove('viewer')).toBe(false);
		});

		it('returns false when removing non-existent role', () => {
			const reg = createRoleRegistry();
			expect(reg.remove('non-existent')).toBe(false);
		});

		it('overwrites when adding duplicate role name', () => {
			const reg = createRoleRegistry();
			reg.add({ name: 'custom', description: 'v1', permissions: ['*:read'] });
			reg.add({ name: 'custom', description: 'v2', permissions: ['*:read', '*:create'] });
			const role = reg.get('custom');
			expect(role?.description).toBe('v2');
			expect(role?.permissions).toHaveLength(2);
		});

		it('can remove custom roles', () => {
			const reg = createRoleRegistry();
			reg.add({ name: 'temp', description: 'Temporary', permissions: ['*:read'] });
			expect(reg.remove('temp')).toBe(true);
			expect(reg.get('temp')).toBeUndefined();
		});
	});

	describe('checkPermission', () => {
		it('editor cannot delete', () => {
			const ctx = makeCtx(ROLE_EDITOR);
			expect(checkPermission(ctx, 'posts', 'delete')).toBe(false);
		});

		it('editor can read, create, update', () => {
			const ctx = makeCtx(ROLE_EDITOR);
			expect(checkPermission(ctx, 'posts', 'read')).toBe(true);
			expect(checkPermission(ctx, 'posts', 'create')).toBe(true);
			expect(checkPermission(ctx, 'posts', 'update')).toBe(true);
		});

		it('editor has full media access', () => {
			const ctx = makeCtx(ROLE_EDITOR);
			expect(checkPermission(ctx, 'media', 'upload')).toBe(true);
			expect(checkPermission(ctx, 'media', 'delete')).toBe(true);
		});

		it('viewer can only read', () => {
			const ctx = makeCtx(ROLE_VIEWER);
			expect(checkPermission(ctx, 'posts', 'read')).toBe(true);
			expect(checkPermission(ctx, 'posts', 'create')).toBe(false);
			expect(checkPermission(ctx, 'posts', 'update')).toBe(false);
			expect(checkPermission(ctx, 'posts', 'delete')).toBe(false);
		});

		it('super-admin has all permissions', () => {
			const ctx = makeCtx(ROLE_SUPER_ADMIN);
			expect(checkPermission(ctx, 'any-resource', 'any-action')).toBe(true);
		});
	});

	describe('createAuthContext', () => {
		it('pre-computes permission map from role', () => {
			const ctx = makeCtx(ROLE_EDITOR);
			expect(ctx.permissionMap).toBeInstanceOf(Set);
			expect(ctx.permissionMap.size).toBeGreaterThan(0);
		});

		it('includes user and session data', () => {
			const ctx = makeCtx(ROLE_VIEWER);
			expect(ctx.user.id).toBe('1');
			expect(ctx.session.id).toBe('s1');
		});
	});
});
