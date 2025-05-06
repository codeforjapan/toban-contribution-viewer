import { Page, Locator } from '@playwright/test';

/**
 * Page object for the login page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly signUpLink: Locator;
  readonly errorMessage: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.signUpLink = page.locator('a', { hasText: 'Sign up' });
    this.errorMessage = page.locator('[data-testid="auth-error"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/auth/login', { timeout: 60000 });
  }

  /**
   * Fill in the login form and submit
   * @param email User email
   * @param password User password
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

/**
 * Page object for the sign up page
 */
export class SignUpPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a', { hasText: 'Sign in' });
    this.errorMessage = page.locator('[data-testid="auth-error"]');
  }

  /**
   * Navigate to the sign up page
   */
  async goto() {
    await this.page.goto('/auth/signup', { timeout: 60000 });
  }

  /**
   * Fill in the sign up form and submit
   * @param name User's full name
   * @param email User email
   * @param password User password
   */
  async signUp(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

/**
 * Page object for the dashboard page
 */
export class DashboardPage {
  readonly page: Page;
  readonly userMenu: Locator;
  readonly teamSwitcher: Locator;
  readonly signOutButton: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.teamSwitcher = page.locator('[data-testid="team-switcher"]');
    this.signOutButton = page.locator('[data-testid="sign-out"]');
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard', { timeout: 60000 });
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    await this.userMenu.click();
    await this.signOutButton.click();
  }

  /**
   * Switch to a different team
   * @param teamName Name of the team to switch to
   */
  async switchTeam(teamName: string) {
    await this.teamSwitcher.click();
    await this.page.locator(`[data-testid="team-option-${teamName}"]`).click();
  }

  /**
   * Check if user is on the dashboard page
   */
  async isOnDashboard() {
    return await this.page.locator('h1', { hasText: 'Dashboard' }).isVisible();
  }
}
