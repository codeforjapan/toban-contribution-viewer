import { Page, Locator, expect } from '@playwright/test';

/**
 * Utility functions for testing
 */
export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for an element to be visible and stable
   * @param selector Selector for the element
   * @param options Wait options
   */
  async waitForElement(selector: string, options: { timeout?: number, state?: 'visible' | 'hidden' | 'attached' | 'detached' } = {}) {
    const locator = this.page.locator(selector);
    await locator.waitFor({ 
      state: options.state || 'visible', 
      timeout: options.timeout || 10000 
    });
    return locator;
  }

  /**
   * Wait for navigation to complete
   * @param options Navigation options
   */
  async waitForNavigation(options: { url?: string | RegExp, timeout?: number } = {}) {
    if (options.url) {
      await this.page.waitForURL(options.url, { timeout: options.timeout || 10000 });
    } else {
      await this.page.waitForLoadState('networkidle', { timeout: options.timeout || 10000 });
    }
  }

  /**
   * Take a screenshot and save it with a descriptive name
   * @param name Name for the screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `./test-results/${name}-${Date.now()}.png` });
  }

  /**
   * Get a data-testid selector
   * @param testId The data-testid value
   * @returns Locator for the element
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Check if an element exists
   * @param selector Selector for the element
   * @returns Boolean indicating if the element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Get text content from an element
   * @param selector Selector for the element
   * @returns Text content of the element
   */
  async getTextContent(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Wait for a toast notification
   * @param text Text content to look for in the notification
   * @param options Wait options
   */
  async waitForToast(text: string, options: { timeout?: number } = {}) {
    await expect(this.page.locator('.toast-message', { hasText: text }))
      .toBeVisible({ timeout: options.timeout || 5000 });
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingToComplete() {
    await this.page.locator('.loading-indicator').waitFor({ state: 'detached', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }
}
