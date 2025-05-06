import { Page, expect } from '@playwright/test';

/**
 * Helper functions for authentication-related operations
 */
export class AuthHelper {
  constructor(private page: Page) {
  }

  /**
   * Navigate to the login page
   */
  async navigateToLoginPage() {
    console.log('Navigating to login page: /auth/login');
    await this.page.goto('/auth/login', { timeout: 60000 });
    
    await this.page.screenshot({ path: '/app/results/login-page-debug.png' });
    
    await expect(this.page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Try different selectors for the login page
    const selectors = [
      'h1:has-text("Sign in")',
      'form input[type="email"]',
      'button[type="submit"]',
      'div:has-text("Sign in")'
    ];
    
    for (const selector of selectors) {
      console.log(`Trying to find selector: ${selector}`);
      if (await this.page.locator(selector).isVisible()) {
        console.log(`Found visible element with selector: ${selector}`);
        return;
      }
    }
    
    throw new Error('Could not find any login page elements');
  }

  /**
   * Navigate to the registration page
   */
  async navigateToSignUpPage() {
    await this.page.goto('/auth/signup', { timeout: 30000 });
    await expect(this.page.locator('h1:has-text("Sign up")')).toBeVisible({ timeout: 30000 });
  }

  /**
   * Login with the provided credentials
   * @param email User email
   * @param password User password
   */
  async login(email: string, password: string) {
    await this.navigateToLoginPage();
    
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    
    await this.page.locator('button[type="submit"]').click();
    
    await expect(this.page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param name User's full name
   */
  async signUp(email: string, password: string, name: string) {
    await this.navigateToSignUpPage();
    
    await this.page.locator('input[name="name"]').fill(name);
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    
    await this.page.locator('button[type="submit"]').click();
    
    await expect(
      this.page.locator('text=Dashboard, text=Create Team').first()
    ).toBeVisible({ timeout: 10000 });
  }

  /**
   * Switch to a different team
   * @param teamName Name of the team to switch to
   */
  async switchTeam(teamName: string) {
    await this.page.locator('[data-testid="team-switcher"]').click();
    
    await this.page.locator(`[data-testid="team-option-${teamName}"]`).click();
    
    await expect(this.page.locator(`[data-testid="current-team-name"]:has-text("${teamName}")`))
      .toBeVisible({ timeout: 5000 });
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    await this.page.locator('[data-testid="user-menu"]').click();
    
    await this.page.locator('[data-testid="sign-out"]').click();
    
    await expect(this.page.locator('h1:has-text("Sign in")')).toBeVisible();
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    return await this.page.locator('[data-testid="user-menu"]').isVisible();
  }
}
