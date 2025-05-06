import { Page, expect } from '@playwright/test';

/**
 * Helper functions for analysis-related operations
 */
export class AnalysisHelper {
  private baseUrl: string;

  constructor(private page: Page) {
    this.baseUrl = 'http://test-frontend:5173';
  }

  /**
   * Navigate to the analysis page
   */
  async navigateToAnalysisPage() {
    console.log(`Navigating to analysis page: ${this.baseUrl}/analysis`);
    await this.page.goto(`${this.baseUrl}/analysis`, { timeout: 60000 });
    await this.page.screenshot({ path: '/app/results/analysis-page-debug.png' });
    
    await expect(this.page.locator('body')).toBeVisible({ timeout: 30000 });
    await expect(this.page.locator('h1:has-text("Analysis")')).toBeVisible({ timeout: 30000 });
  }

  /**
   * Start a new analysis
   * @param integrationName Name of the integration to analyze
   * @param channelNames Array of channel names to include in analysis
   * @param options Analysis options
   */
  async startAnalysis(
    integrationName: string, 
    channelNames: string[], 
    options: { 
      timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'custom',
      startDate?: string,
      endDate?: string,
      analysisType?: string
    } = {}
  ) {
    await this.navigateToAnalysisPage();
    
    await this.page.locator('[data-testid="new-analysis-button"]').click();
    
    await this.page.locator('[data-testid="integration-select"]').click();
    await this.page.locator(`[data-testid="integration-option-${integrationName}"]`).click();
    
    for (const channelName of channelNames) {
      await this.page.locator(`[data-testid="channel-${channelName}"] [data-testid="select-channel-checkbox"]`).check();
    }
    
    if (options.timeRange) {
      await this.page.locator('[data-testid="time-range-select"]').click();
      await this.page.locator(`[data-testid="time-range-option-${options.timeRange}"]`).click();
      
      if (options.timeRange === 'custom' && options.startDate && options.endDate) {
        await this.page.locator('[data-testid="start-date"]').fill(options.startDate);
        await this.page.locator('[data-testid="end-date"]').fill(options.endDate);
      }
    }
    
    if (options.analysisType) {
      await this.page.locator('[data-testid="analysis-type-select"]').click();
      await this.page.locator(`[data-testid="analysis-type-option-${options.analysisType}"]`).click();
    }
    
    await this.page.locator('[data-testid="start-analysis-button"]').click();
    
    await expect(this.page.locator('text=Analysis started')).toBeVisible({ timeout: 5000 });
    
    await expect(this.page.locator('text=Analysis complete')).toBeVisible({ timeout: 30000 });
  }

  /**
   * View analysis results
   * @param analysisId ID of the analysis to view
   */
  async viewAnalysisResults(analysisId: string) {
    await this.page.goto(`${this.baseUrl}/analysis/${analysisId}`, { timeout: 60000 });
    await expect(this.page.locator('h1:has-text("Analysis Results")')).toBeVisible({ timeout: 30000 });
    
    await expect(this.page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Generate a report from analysis
   * @param analysisId ID of the analysis
   * @param reportName Name for the report
   */
  async generateReport(analysisId: string, reportName: string) {
    await this.page.goto(`${this.baseUrl}/analysis/${analysisId}`, { timeout: 60000 });
    
    await this.page.locator('[data-testid="generate-report-button"]').click();
    
    await this.page.locator('input[name="reportName"]').fill(reportName);
    
    await this.page.locator('[data-testid="create-report-button"]').click();
    
    await expect(this.page.locator('text=Report generated successfully')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the list of completed analyses
   * @returns Array of analysis IDs
   */
  async getCompletedAnalyses(): Promise<string[]> {
    await this.navigateToAnalysisPage();
    
    const analysisItems = await this.page.locator('[data-testid^="analysis-item-"]').all();
    
    const analysisIds: string[] = [];
    for (const item of analysisItems) {
      const idAttr = await item.getAttribute('data-testid');
      if (idAttr) {
        const id = idAttr.replace('analysis-item-', '');
        analysisIds.push(id);
      }
    }
    
    return analysisIds;
  }
}
