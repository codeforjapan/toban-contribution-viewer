import { Page, expect } from '@playwright/test';

/**
 * Helper functions for Slack integration-related operations
 */
export class SlackHelper {
  private baseUrl: string;

  constructor(private page: Page) {
    this.baseUrl = 'http://test-frontend:5173';
  }

  /**
   * Navigate to the integrations page
   */
  async navigateToIntegrationsPage() {
    console.log(`Navigating to integrations page: ${this.baseUrl}/integrations`);
    await this.page.goto(`${this.baseUrl}/integrations`, { timeout: 60000 });
    await this.page.screenshot({ path: '/app/results/integrations-page-debug.png' });
    
    await expect(this.page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Try different selectors for the integrations page
    const selectors = [
      'h1:has-text("Integrations")',
      '[data-testid="add-integration-button"]',
      'div:has-text("Integrations")'
    ];
    
    for (const selector of selectors) {
      console.log(`Trying to find selector: ${selector}`);
      if (await this.page.locator(selector).isVisible()) {
        console.log(`Found visible element with selector: ${selector}`);
        return;
      }
    }
    
    throw new Error('Could not find any integrations page elements');
  }

  /**
   * Connect a Slack workspace
   * @param workspaceName Name to give to the integration
   */
  async connectSlackWorkspace(workspaceName: string) {
    await this.navigateToIntegrationsPage();
    
    await this.page.locator('[data-testid="add-integration-button"]').click();
    
    await this.page.locator('[data-testid="integration-type-slack"]').click();
    
    await this.page.locator('input[name="name"]').fill(workspaceName);
    
    await this.page.locator('[data-testid="connect-slack-button"]').click();
    
    await expect(this.page.locator('text=Successfully connected to Slack')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Sync channels for a Slack integration
   * @param integrationName Name of the integration to sync
   */
  async syncChannels(integrationName: string) {
    await this.navigateToIntegrationsPage();
    
    await this.page.locator(`[data-testid="integration-item-${integrationName}"]`).click();
    
    await this.page.locator('[data-testid="sync-channels-button"]').click();
    
    await expect(this.page.locator('text=Channels synchronized successfully')).toBeVisible({ timeout: 15000 });
  }

  /**
   * Select channels for analysis
   * @param channelNames Array of channel names to select
   */
  async selectChannelsForAnalysis(channelNames: string[]) {
    
    await this.page.locator('[data-testid="channels-tab"]').click();
    
    for (const channelName of channelNames) {
      await this.page.locator(`[data-testid="channel-${channelName}"] [data-testid="select-channel-checkbox"]`).check();
    }
    
    await this.page.locator('[data-testid="save-channel-selection"]').click();
    
    await expect(this.page.locator('text=Channel selection saved')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if a Slack integration exists
   * @param integrationName Name of the integration to check
   */
  async integrationExists(integrationName: string) {
    await this.navigateToIntegrationsPage();
    return await this.page.locator(`[data-testid="integration-item-${integrationName}"]`).isVisible();
  }

  /**
   * Get the list of available channels
   * @returns Array of channel names
   */
  async getAvailableChannels(): Promise<string[]> {
    const channelElements = await this.page.locator('[data-testid^="channel-"]').all();
    
    const channelNames: string[] = [];
    for (const element of channelElements) {
      const nameElement = await element.locator('.channel-name').first();
      if (nameElement) {
        channelNames.push(await nameElement.textContent() || '');
      }
    }
    
    return channelNames;
  }
}
