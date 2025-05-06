import { Page, expect } from '@playwright/test';

/**
 * Helper functions for authentication-related operations
 */
export class AuthHelper {
  private baseUrl: string;

  constructor(private page: Page) {
    this.baseUrl = 'http://test-frontend:5173';
  }
  
  /**
   * Get full URL for a path
   * @param path Path to append to base URL
   * @returns Full URL
   */
  private getUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /**
   * Navigate to the login page
   */
  async navigateToLoginPage() {
    await this.page.goto(this.baseUrl + '/auth/login', { timeout: 30000 });
    await expect(this.page.locator('h1:has-text("Sign in")')).toBeVisible({ timeout: 30000 });
  }

  /**
   * Navigate to the registration page
   */
  async navigateToSignUpPage() {
    await this.page.goto(this.baseUrl + '/auth/signup', { timeout: 30000 });
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
