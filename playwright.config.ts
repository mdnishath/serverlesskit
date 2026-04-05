import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ServerlessKit E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
// biome-ignore lint/style/noDefaultExport: Playwright requires default export
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'html',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'pnpm --filter @serverlesskit/dashboard dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
