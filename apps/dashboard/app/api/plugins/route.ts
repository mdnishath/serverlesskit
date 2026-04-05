import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getAllPluginsInfo, enablePlugin, disablePlugin, getPluginDetail, updatePluginConfig } from '@/lib/plugin-runtime';

/**
 * GET /api/plugins — List all plugins with state.
 */
export async function GET() {
	try {
		const auth = await requirePermission('plugins', 'read');
		if ('error' in auth) return auth.error;

		const plugins = await getAllPluginsInfo();
		return NextResponse.json({ ok: true, data: plugins });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list plugins';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * POST /api/plugins — Enable or disable a plugin.
 * Body: { name: string, enabled: boolean }
 */
export async function POST(request: Request) {
	try {
		const auth = await requirePermission('plugins', 'update');
		if ('error' in auth) return auth.error;

		const { name, enabled } = await request.json();
		if (!name || typeof enabled !== 'boolean') {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'name (string) and enabled (boolean) are required' } },
				{ status: 400 },
			);
		}

		const result = enabled ? await enablePlugin(name) : await disablePlugin(name);

		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: 'PLUGIN_ERROR', message: result.message } },
				{ status: 400 },
			);
		}

		const plugins = await getAllPluginsInfo();
		return NextResponse.json({ ok: true, data: plugins });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to toggle plugin';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}

/**
 * PATCH /api/plugins — Update plugin configuration.
 * Body: { name: string, config: Record<string, unknown> }
 */
export async function PATCH(request: Request) {
	try {
		const auth = await requirePermission('plugins', 'update');
		if ('error' in auth) return auth.error;

		const { name, config } = await request.json();
		if (!name || !config || typeof config !== 'object') {
			return NextResponse.json(
				{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'name (string) and config (object) are required' } },
				{ status: 400 },
			);
		}

		const result = await updatePluginConfig(name, config);
		if (!result.ok) {
			return NextResponse.json(
				{ ok: false, error: { code: 'PLUGIN_ERROR', message: result.message } },
				{ status: 400 },
			);
		}

		const detail = await getPluginDetail(name);
		return NextResponse.json({ ok: true, data: detail });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update config';
		return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
	}
}
