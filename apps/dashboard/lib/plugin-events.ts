'use client';

type PluginMenu = { name: string; label: string; icon: string };

/**
 * Dispatches a custom event to notify sidebar of plugin menu changes.
 * @param menus - Updated array of active plugin menus
 */
export const dispatchPluginMenuUpdate = (menus: PluginMenu[]) => {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('plugin-menu-update', { detail: menus }));
};

/**
 * Subscribes to plugin menu updates.
 * @param callback - Called with updated menus array
 * @returns Cleanup function
 */
export const onPluginMenuUpdate = (callback: (menus: PluginMenu[]) => void): (() => void) => {
	if (typeof window === 'undefined') return () => {};
	const handler = (e: Event) => callback((e as CustomEvent<PluginMenu[]>).detail);
	window.addEventListener('plugin-menu-update', handler);
	return () => window.removeEventListener('plugin-menu-update', handler);
};
