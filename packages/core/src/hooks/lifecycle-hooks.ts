import type { HookEvent, HookHandler, HookPayload } from './hooks.types.js';

/** Internal registry key = "collectionSlug:event" */
type HookKey = `${string}:${HookEvent}`;

/**
 * Creates a new hook manager for registering and executing lifecycle hooks.
 * @returns A HookManager instance
 */
export const createHookManager = () => {
	const hooks = new Map<HookKey, HookHandler[]>();

	const getKey = (collection: string, event: HookEvent): HookKey => {
		return `${collection}:${event}`;
	};

	return {
		/**
		 * Registers a hook handler for a collection event.
		 * @param collection - The collection slug
		 * @param event - The lifecycle event
		 * @param handler - The handler function
		 */
		register: (collection: string, event: HookEvent, handler: HookHandler): void => {
			const key = getKey(collection, event);
			const existing = hooks.get(key) ?? [];
			existing.push(handler);
			hooks.set(key, existing);
		},

		/**
		 * Executes all hooks for a collection event in order.
		 * Each hook can modify the payload for the next hook.
		 * @param collection - The collection slug
		 * @param event - The lifecycle event
		 * @param payload - The initial hook payload
		 * @returns The final payload after all hooks have run
		 */
		execute: async (
			collection: string,
			event: HookEvent,
			payload: HookPayload,
		): Promise<HookPayload> => {
			const key = getKey(collection, event);
			const handlers = hooks.get(key);

			if (!handlers || handlers.length === 0) {
				return payload;
			}

			let current = payload;
			for (const handler of handlers) {
				const result = await handler(current);
				if (result) {
					current = result;
				}
			}

			return current;
		},

		/**
		 * Checks if any hooks are registered for a collection event.
		 * @param collection - The collection slug
		 * @param event - The lifecycle event
		 * @returns True if hooks exist
		 */
		has: (collection: string, event: HookEvent): boolean => {
			const key = getKey(collection, event);
			const handlers = hooks.get(key);
			return handlers !== undefined && handlers.length > 0;
		},

		/**
		 * Removes all hooks for a collection (or all hooks if no collection specified).
		 * @param collection - Optional collection slug to clear hooks for
		 */
		clear: (collection?: string): void => {
			if (collection) {
				for (const key of hooks.keys()) {
					if (key.startsWith(`${collection}:`)) {
						hooks.delete(key);
					}
				}
			} else {
				hooks.clear();
			}
		},
	};
};

/** Type for the hook manager instance */
export type HookManager = ReturnType<typeof createHookManager>;
