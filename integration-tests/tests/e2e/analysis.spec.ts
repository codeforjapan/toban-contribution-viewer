import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { SlackHelper } from './helpers/slack-helper';
import { AnalysisHelper } from './helpers/analysis-helper';
import { AnalysisPage, NewAnalysisPage, AnalysisResultsPage } from './pages/analysis-pages';

const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!'
};

const TEST_INTEGRATION = {
  name: 'Test Slack Workspace'
};

test.describe('Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
  });
  
  test('should run a new analysis', async ({ page }) => {
    const slackHelper = new SlackHelper(page);
    
    if (!(await slackHelper.integrationExists(TEST_INTEGRATION.name))) {
      await slackHelper.connectSlackWorkspace(TEST_INTEGRATION.name);
      await slackHelper.syncChannels(TEST_INTEGRATION.name);
    }
    
    const analysisPage = new AnalysisPage(page);
    await analysisPage.goto();
    
    await expect(page).toHaveTitle(/Analysis/);
    
    await analysisPage.newAnalysisButton.click();
    
    const newAnalysisPage = new NewAnalysisPage(page);
    await newAnalysisPage.selectIntegration(TEST_INTEGRATION.name);
    
    const channelElements = await page.locator('[data-testid^="channel-"]').all();
    if (channelElements.length > 0) {
      await page.locator('[data-testid^="channel-"] [data-testid="select-channel-checkbox"]').first().check();
      
      await newAnalysisPage.setTimeRange('month');
      
      await newAnalysisPage.startAnalysis();
      
      await expect(page.locator('text=Analysis started')).toBeVisible();
      
      await expect(page.locator('text=Analysis complete')).toBeVisible({ timeout: 30000 });
    } else {
      test.skip('No channels available for analysis');
    }
  });
  
  test('should view analysis results', async ({ page }) => {
    const analysisHelper = new AnalysisHelper(page);
    
    const analysisPage = new AnalysisPage(page);
    await analysisPage.goto();
    
    const analyses = await analysisPage.getCompletedAnalyses();
    
    if (analyses.length > 0) {
      await analysisPage.clickAnalysis(analyses[0]);
      
      const resultsPage = new AnalysisResultsPage(page);
      await expect(page).toHaveTitle(/Analysis Results/);
      
      await expect(resultsPage.resultsContainer).toBeVisible();
    } else {
      test.skip('No completed analyses available');
    }
  });
  
  test('should generate a report from analysis', async ({ page }) => {
    const analysisHelper = new AnalysisHelper(page);
    
    const analysisPage = new AnalysisPage(page);
    await analysisPage.goto();
    
    const analyses = await analysisPage.getCompletedAnalyses();
    
    if (analyses.length > 0) {
      await analysisPage.clickAnalysis(analyses[0]);
      
      const resultsPage = new AnalysisResultsPage(page);
      await resultsPage.generateReport(`Test Report ${Date.now()}`);
      
      await expect(page.locator('text=Report generated successfully')).toBeVisible();
    } else {
      test.skip('No completed analyses available');
    }
  });
});
