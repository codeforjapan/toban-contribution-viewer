import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { SlackHelper } from './helpers/slack-helper';
import { IntegrationsPage, AddIntegrationPage, IntegrationDetailsPage } from './pages/slack-pages';

const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!'
};

const TEST_INTEGRATION = {
  name: 'Test Slack Workspace'
};

test.describe('Slack Integration Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
  });
  
  test('should allow connecting a Slack workspace', async ({ page }) => {
    const integrationsPage = new IntegrationsPage(page);
    await integrationsPage.goto();
    
    await expect(page).toHaveTitle(/Integrations/);
    
    await integrationsPage.addIntegrationButton.click();
    
    const addIntegrationPage = new AddIntegrationPage(page);
    await addIntegrationPage.connectSlack(TEST_INTEGRATION.name);
    
    await expect(page.locator('text=Successfully connected to Slack')).toBeVisible();
    
    await integrationsPage.goto();
    await expect(page.locator(`[data-testid="integration-item-${TEST_INTEGRATION.name}"]`)).toBeVisible();
  });
  
  test('should sync channels for a Slack integration', async ({ page }) => {
    const slackHelper = new SlackHelper(page);
    
    if (!(await slackHelper.integrationExists(TEST_INTEGRATION.name))) {
      await slackHelper.connectSlackWorkspace(TEST_INTEGRATION.name);
    }
    
    const integrationsPage = new IntegrationsPage(page);
    await integrationsPage.goto();
    
    await integrationsPage.clickIntegration(TEST_INTEGRATION.name);
    
    const integrationDetailsPage = new IntegrationDetailsPage(page);
    await integrationDetailsPage.syncChannels();
    
    await expect(page.locator('text=Channels synchronized successfully')).toBeVisible();
    
    await integrationDetailsPage.goToChannelsTab();
    
    await expect(integrationDetailsPage.channelsList).toBeVisible();
    
    const channels = await integrationDetailsPage.getAvailableChannels();
    expect(channels.length).toBeGreaterThan(0);
  });
  
  test('should select channels for analysis', async ({ page }) => {
    const slackHelper = new SlackHelper(page);
    
    if (!(await slackHelper.integrationExists(TEST_INTEGRATION.name))) {
      await slackHelper.connectSlackWorkspace(TEST_INTEGRATION.name);
    }
    
    const integrationsPage = new IntegrationsPage(page);
    await integrationsPage.goto();
    
    await integrationsPage.clickIntegration(TEST_INTEGRATION.name);
    
    const integrationDetailsPage = new IntegrationDetailsPage(page);
    await integrationDetailsPage.goToChannelsTab();
    
    const channels = await integrationDetailsPage.getAvailableChannels();
    expect(channels.length).toBeGreaterThan(0);
    
    const channelsToSelect = channels.slice(0, Math.min(2, channels.length));
    await integrationDetailsPage.selectChannels(channelsToSelect);
    
    await expect(page.locator('text=Channel selection saved')).toBeVisible();
  });
});
