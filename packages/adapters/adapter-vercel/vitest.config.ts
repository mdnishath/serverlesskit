import { defineConfig } from 'vitest/config';

// biome-ignore lint/style/noDefaultExport: Vitest requires default export
export default defineConfig({
	test: { globals: false, environment: 'node', include: ['__tests__/**/*.test.ts'] },
});
