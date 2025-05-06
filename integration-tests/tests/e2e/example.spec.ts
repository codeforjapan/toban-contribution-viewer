import { test, expect } from '@playwright/test';

test('basic application flow', async ({ page }) => {
  await page.goto('/');
  
  await expect(page).toHaveTitle(/Toban Contribution Viewer/);
  
  await expect(page.locator('text=Sign in')).toBeVisible();
});
