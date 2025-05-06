import { test, expect } from '@playwright/test';

test('basic application flow', async ({ page }) => {
  console.log('Navigating to home page');
  await page.goto('/', { timeout: 60000 });
  
  await page.screenshot({ path: '/app/results/home-page-debug.png' });
  
  await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
  
  await expect(page).toHaveTitle(/Toban Contribution Viewer/, { timeout: 30000 });
  
  await expect(page.locator('text=Sign in')).toBeVisible();
});
