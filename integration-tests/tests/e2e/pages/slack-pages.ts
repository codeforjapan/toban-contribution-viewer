import { Page, Locator } from '@playwright/test';

/**
 * Page object for the integrations list page
 */
export class IntegrationsPage {
  readonly page: Page;
  readonly addIntegrationButton: Locator;
  readonly integrationsList: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.addIntegrationButton = page.locator('[data-testid="add-integration-button"]');
    this.integrationsList = page.locator('[data-testid="integrations-list"]');
  }

  /**
   * Navigate to the integrations page
   */
  async goto() {
    await this.page.goto(`${this.baseUrl}/integrations`, { timeout: 60000 });
  }

  /**
   * Click on an integration by name
   * @param name Name of the integration
   */
  async clickIntegration(name: string) {
    await this.page.locator(`[data-testid="integration-item-${name}"]`).click();
  }

  /**
   * Check if an integration exists
   * @param name Name of the integration
   */
  async integrationExists(name: string) {
    return await this.page.locator(`[data-testid="integration-item-${name}"]`).isVisible();
  }
}

/**
 * Page object for the add integration page
 */
export class AddIntegrationPage {
  readonly page: Page;
  readonly slackIntegrationOption: Locator;
  readonly nameInput: Locator;
  readonly connectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.slackIntegrationOption = page.locator('[data-testid="integration-type-slack"]');
    this.nameInput = page.locator('input[name="name"]');
    this.connectButton = page.locator('[data-testid="connect-slack-button"]');
  }

  /**
   * Fill in the Slack integration form and connect
   * @param name Name for the integration
   */
  async connectSlack(name: string) {
    await this.slackIntegrationOption.click();
    await this.nameInput.fill(name);
    await this.connectButton.click();
  }
}

/**
 * Page object for the integration details page
 */
export class IntegrationDetailsPage {
  readonly page: Page;
  readonly syncButton: Locator;
  readonly channelsTab: Locator;
  readonly channelsList: Locator;
  readonly saveSelectionButton: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.syncButton = page.locator('[data-testid="sync-channels-button"]');
    this.channelsTab = page.locator('[data-testid="channels-tab"]');
    this.channelsList = page.locator('[data-testid="channels-list"]');
    this.saveSelectionButton = page.locator('[data-testid="save-channel-selection"]');
  }

  /**
   * Navigate to the integration details page
   * @param integrationId ID of the integration
   */
  async goto(integrationId: string) {
    await this.page.goto(`${this.baseUrl}/integrations/${integrationId}`, { timeout: 60000 });
  }

  /**
   * Sync channels for the integration
   */
  async syncChannels() {
    await this.syncButton.click();
  }

  /**
   * Go to the channels tab
   */
  async goToChannelsTab() {
    await this.channelsTab.click();
  }

  /**
   * Select channels for analysis
   * @param channelNames Array of channel names to select
   */
  async selectChannels(channelNames: string[]) {
    for (const channelName of channelNames) {
      await this.page.locator(`[data-testid="channel-${channelName}"] [data-testid="select-channel-checkbox"]`).check();
    }
    await this.saveSelectionButton.click();
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
