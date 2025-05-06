import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { LoginPage, SignUpPage, DashboardPage } from './pages/auth-pages';

const TEST_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!'
};

test.describe('Authentication Flow', () => {
  test('should allow user to sign up', async ({ page }) => {
    console.log('Testing user signup flow');
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    
    await page.screenshot({ path: '/app/results/signup-test-debug.png' });
    
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveTitle(/Sign Up/, { timeout: 30000 });
    
    await signUpPage.signUp(TEST_USER.name, TEST_USER.email, TEST_USER.password);
    
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 30000 });
  });
  
  test('should allow user to log in', async ({ page }) => {
    console.log('Testing user login flow');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await page.screenshot({ path: '/app/results/login-test-debug.png' });
    
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveTitle(/Login/, { timeout: 30000 });
    
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 30000 });
  });
  
  test('should display error for invalid credentials', async ({ page }) => {
    console.log('Testing invalid credentials error');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await loginPage.login('invalid@example.com', 'WrongPassword123!');
    
    await page.screenshot({ path: '/app/results/login-error-debug.png' });
    
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10000 });
    await expect(loginPage.errorMessage).toContainText(/Invalid credentials/);
  });
  
  test('should allow user to switch teams', async ({ page }) => {
    console.log('Testing team switching flow');
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
    
    await page.screenshot({ path: '/app/results/dashboard-debug.png' });
    
    const dashboardPage = new DashboardPage(page);
    
    await expect(dashboardPage.teamSwitcher).toBeVisible({ timeout: 10000 });
    
    await dashboardPage.teamSwitcher.click();
    
    const teamOption = page.locator('[data-testid^="team-option-"]').first();
    const teamName = await teamOption.textContent();
    
    await teamOption.click();
    
    await expect(page.locator(`[data-testid="current-team-name"]`)).toContainText(teamName || '', { timeout: 10000 });
  });
  
  test('should allow user to sign out', async ({ page }) => {
    console.log('Testing sign out flow');
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.signOut();
    
    await page.screenshot({ path: '/app/results/signout-debug.png' });
    
    await expect(page.locator('h1:has-text("Login")')).toBeVisible({ timeout: 10000 });
  });
});
