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
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    
    await expect(page).toHaveTitle(/Sign up/);
    
    await signUpPage.signUp(TEST_USER.name, TEST_USER.email, TEST_USER.password);
    
    await expect(page.locator('text=Dashboard, text=Create Team').first()).toBeVisible();
  });
  
  test('should allow user to log in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await expect(page).toHaveTitle(/Sign in/);
    
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
  
  test('should display error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await loginPage.login('invalid@example.com', 'WrongPassword123!');
    
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(/Invalid credentials/);
  });
  
  test('should allow user to switch teams', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
    
    const dashboardPage = new DashboardPage(page);
    
    await expect(dashboardPage.teamSwitcher).toBeVisible();
    
    await dashboardPage.teamSwitcher.click();
    
    const teamOption = page.locator('[data-testid^="team-option-"]').first();
    const teamName = await teamOption.textContent();
    
    await teamOption.click();
    
    await expect(page.locator(`[data-testid="current-team-name"]`)).toContainText(teamName || '');
  });
  
  test('should allow user to sign out', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.signOut();
    
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();
  });
});
