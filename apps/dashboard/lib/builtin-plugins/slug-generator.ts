import { definePlugin } from '@serverlesskit/plugin-sdk';

/**
 * Slug Generator plugin — auto-generates a 'slug' field from 'title' or 'name'
 * on beforeCreate if the collection has a slug field and it's empty.
 */
export const slugGeneratorPlugin = definePlugin({
	name: 'slug-generator',
	version: '1.0.0',
	description: 'Auto-generate slug from title or name field on entry creation',
	author: 'ServerlessKit',
	setup: (api) => {
		api.registerHook('beforeCreate', async (payload) => {
			const data = (payload as { data?: Record<string, unknown> }).data;
			if (!data) return payload;

			/* Only generate if there's a slug field and it's empty */
			if ('slug' in data && !data.slug) {
				const source = (data.title as string) ?? (data.name as string) ?? '';
				if (source) {
					data.slug = source
						.toLowerCase()
						.trim()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-|-$/g, '');
				}
			}

			return payload;
		});
	},
});
