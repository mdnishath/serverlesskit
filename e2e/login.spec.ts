import { expect, test } from '@playwright/test';

test.describe('Login Flow', () => {
	test('displays login form', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('shows error for invalid credentials', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('wrong@example.com');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in|log in/i }).click();
		await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 5000 });
	});

	test('redirects to dashboard on successful login', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('admin@serverlesskit.dev');
		await page.getByLabel(/password/i).fill('admin123');
		await page.getByRole('button', { name: /sign in|log in/i }).click();
		await page.waitForURL('**/dashboard**', { timeout: 10000 });
		await expect(page).toHaveURL(/dashboard/);
	});

	test('unauthenticated user is redirected to login', async ({ page }) => {
		await page.goto('/');
		await page.waitForURL('**/login**', { timeout: 10000 });
	});
});
