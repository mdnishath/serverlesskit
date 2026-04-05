import { expect, test } from '@playwright/test';

test.describe('Collections Management', () => {
	test.beforeEach(async ({ page }) => {
		// TODO: Implement authenticated session setup
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@serverlesskit.dev');
		await page.getByLabel(/password/i).fill('admin123');
		await page.getByRole('button', { name: /sign in|log in/i }).click();
		await page.waitForURL('**/dashboard**', { timeout: 10000 });
	});

	test('displays collections list page', async ({ page }) => {
		await page.goto('/collections');
		await expect(page.getByRole('heading', { name: /collections/i })).toBeVisible();
	});

	test('navigates to new collection form', async ({ page }) => {
		await page.goto('/collections');
		await page.getByRole('link', { name: /new collection|create/i }).click();
		await page.waitForURL('**/collections/new**');
		await expect(page.getByLabel(/name/i)).toBeVisible();
	});

	test('creates a new collection', async ({ page }) => {
		await page.goto('/collections/new');
		await page.getByLabel(/name/i).fill('Test Products');
		// TODO: Add fields via the field builder UI
		await page.getByRole('button', { name: /save|create/i }).click();
		await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 5000 });
	});
});
