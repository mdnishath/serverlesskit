/** Plugin lifecycle states */
export type PluginState = 'installed' | 'active' | 'inactive' | 'error';

/** Plugin manifest describing metadata and requirements */
export type PluginManifest = {
	/** Unique plugin name (kebab-case) */
	name: string;
	/** Semver version */
	version: string;
	/** Human-readable description */
	description: string;
	/** Plugin author */
	author?: string;
	/** Required permissions */
	permissions?: string[];
	/** Dependencies on other plugins */
	dependencies?: string[];
};

/** Configuration for a plugin-registered route */
export type PluginRoute = {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	handler: (request: unknown) => Promise<unknown>;
};

/** Configuration for a plugin dashboard page */
export type PluginDashboardPage = {
	title: string;
	path: string;
	icon?: string;
};

/** Configuration for a custom field type */
export type PluginFieldType = {
	name: string;
	label: string;
	validate?: (value: unknown) => boolean;
};

/** Configuration for a custom action in the UI */
export type PluginAction = {
	label: string;
	collection?: string;
	handler: (context: unknown) => Promise<void>;
};

/** Hook event handler for plugins */
export type PluginHookHandler = (payload: unknown) => Promise<unknown | void>;

/** API exposed to plugins during setup */
export type PluginAPI = {
	/** Register a lifecycle hook */
	registerHook: (event: string, handler: PluginHookHandler) => void;
	/** Register an API route under /api/plugins/{pluginName}/... */
	registerRoute: (route: PluginRoute) => void;
	/** Register a dashboard page under /plugins/{pluginName}/... */
	registerDashboardPage: (page: PluginDashboardPage) => void;
	/** Register a custom field type */
	registerFieldType: (fieldType: PluginFieldType) => void;
	/** Register a custom action */
	registerAction: (action: PluginAction) => void;
	/** Get plugin-scoped configuration */
	getConfig: <T = Record<string, unknown>>() => T;
	/** Get the plugin's name */
	getPluginName: () => string;
};

/** Setup function called when plugin is activated */
export type PluginSetupFn = (api: PluginAPI) => Promise<void> | void;

/** Complete plugin definition returned by definePlugin */
export type PluginDefinition = {
	manifest: Readonly<PluginManifest>;
	setup: PluginSetupFn;
};

/** Runtime state of an installed plugin */
export type PluginInstance = {
	definition: PluginDefinition;
	state: PluginState;
	hooks: Map<string, PluginHookHandler[]>;
	routes: PluginRoute[];
	dashboardPages: PluginDashboardPage[];
	fieldTypes: PluginFieldType[];
	actions: PluginAction[];
	config: Record<string, unknown>;
	error?: string;
};
