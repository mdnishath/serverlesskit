import { definePlugin } from '@serverlesskit/plugin-sdk';

/**
 * Webhook plugin — sends HTTP POST to configured URLs on CRUD events.
 * Enable from dashboard, configure webhook URL in plugin settings.
 */
export const webhookPlugin = definePlugin({
	name: 'webhook',
	version: '1.0.0',
	description: 'Send HTTP webhooks on create, update, and delete events',
	author: 'ServerlessKit',
	setup: (api) => {
		const config = api.getConfig<{ url?: string }>();

		const sendWebhook = async (event: string, payload: unknown) => {
			const url = config.url;
			if (!url) return;
			try {
				await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-ServerlessKit-Event': event },
					body: JSON.stringify({ event, timestamp: new Date().toISOString(), payload }),
				});
			} catch { /* webhook delivery is best-effort */ }
		};

		api.registerHook('afterCreate', async (payload) => {
			await sendWebhook('entry.created', payload);
			return payload;
		});

		api.registerHook('afterUpdate', async (payload) => {
			await sendWebhook('entry.updated', payload);
			return payload;
		});

		api.registerHook('afterDelete', async (payload) => {
			await sendWebhook('entry.deleted', payload);
			return payload;
		});
	},
});
