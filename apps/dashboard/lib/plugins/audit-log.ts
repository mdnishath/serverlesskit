import { definePlugin } from '@serverlesskit/plugin-sdk';
import { getDb } from '../db';

const AUDIT_TABLE = '_audit_log';

/**
 * Ensures the audit log table exists.
 */
const ensureAuditTable = async () => {
	const db = getDb();
	await db.execute(`
		CREATE TABLE IF NOT EXISTS "${AUDIT_TABLE}" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"event" TEXT NOT NULL,
			"collection" TEXT NOT NULL,
			"entryId" TEXT,
			"userId" TEXT,
			"timestamp" TEXT NOT NULL,
			"details" TEXT NOT NULL DEFAULT '{}'
		);
	`);
};

/**
 * Audit Log plugin — records all CRUD operations to _audit_log table.
 * Useful for compliance, debugging, and activity tracking.
 */
export const auditLogPlugin = definePlugin({
	name: 'audit-log',
	version: '1.0.0',
	description: 'Log all create, update, and delete operations for audit trail',
	author: 'ServerlessKit',
	setup: (api) => {
		let tableReady = false;

		const log = async (event: string, payload: unknown) => {
			try {
				if (!tableReady) { await ensureAuditTable(); tableReady = true; }
				const p = payload as { collection?: string; entryId?: string; context?: { userId?: string }; data?: unknown };
				const db = getDb();
				await db.execute({
					sql: `INSERT INTO "${AUDIT_TABLE}" ("event", "collection", "entryId", "userId", "timestamp", "details") VALUES (?, ?, ?, ?, ?, ?)`,
					args: [
						event,
						p.collection ?? '',
						p.entryId ?? '',
						p.context?.userId ?? '',
						new Date().toISOString(),
						JSON.stringify(p.data ?? {}),
					],
				});
			} catch { /* audit log failure should not block operations */ }
		};

		api.registerHook('afterCreate', async (payload) => {
			await log('create', payload);
			return payload;
		});

		api.registerHook('afterUpdate', async (payload) => {
			await log('update', payload);
			return payload;
		});

		api.registerHook('afterDelete', async (payload) => {
			await log('delete', payload);
			return payload;
		});
	},
});
