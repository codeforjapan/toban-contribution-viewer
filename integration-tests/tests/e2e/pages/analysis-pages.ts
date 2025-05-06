import { Page, Locator } from '@playwright/test';

/**
 * Page object for the analysis list page
 */
export class AnalysisPage {
  readonly page: Page;
  readonly newAnalysisButton: Locator;
  readonly analysisList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newAnalysisButton = page.locator('[data-testid="new-analysis-button"]');
    this.analysisList = page.locator('[data-testid="analysis-list"]');
  }

  /**
   * Navigate to the analysis page
   */
  async goto() {
    await this.page.goto('/analysis');
  }

  /**
   * Click on an analysis by ID
   * @param id ID of the analysis
   */
  async clickAnalysis(id: string) {
    await this.page.locator(`[data-testid="analysis-item-${id}"]`).click();
  }

  /**
   * Get the list of completed analyses
   * @returns Array of analysis IDs
   */
  async getCompletedAnalyses() {
    const analysisItems = await this.page.locator('[data-testid^="analysis-item-"]').all();
    
    const analysisIds = [];
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

/**
 * Page object for the new analysis page
 */
export class NewAnalysisPage {
  readonly page: Page;
  readonly integrationSelect: Locator;
  readonly timeRangeSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly analysisTypeSelect: Locator;
  readonly startAnalysisButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.integrationSelect = page.locator('[data-testid="integration-select"]');
    this.timeRangeSelect = page.locator('[data-testid="time-range-select"]');
    this.startDateInput = page.locator('[data-testid="start-date"]');
    this.endDateInput = page.locator('[data-testid="end-date"]');
    this.analysisTypeSelect = page.locator('[data-testid="analysis-type-select"]');
    this.startAnalysisButton = page.locator('[data-testid="start-analysis-button"]');
  }

  /**
   * Select an integration
   * @param integrationName Name of the integration
   */
  async selectIntegration(integrationName: string) {
    await this.integrationSelect.click();
    await this.page.locator(`[data-testid="integration-option-${integrationName}"]`).click();
  }

  /**
   * Select channels for analysis
   * @param channelNames Array of channel names to select
   */
  async selectChannels(channelNames: string[]) {
    for (const channelName of channelNames) {
      await this.page.locator(`[data-testid="channel-${channelName}"] [data-testid="select-channel-checkbox"]`).check();
    }
  }

  /**
   * Set time range for analysis
   * @param timeRange Time range option
   * @param startDate Optional start date for custom range
   * @param endDate Optional end date for custom range
   */
  async setTimeRange(
    timeRange: 'week' | 'month' | 'quarter' | 'year' | 'custom',
    startDate?: string,
    endDate?: string
  ) {
    await this.timeRangeSelect.click();
    await this.page.locator(`[data-testid="time-range-option-${timeRange}"]`).click();
    
    if (timeRange === 'custom' && startDate && endDate) {
      await this.startDateInput.fill(startDate);
      await this.endDateInput.fill(endDate);
    }
  }

  /**
   * Set analysis type
   * @param analysisType Type of analysis to perform
   */
  async setAnalysisType(analysisType: string) {
    await this.analysisTypeSelect.click();
    await this.page.locator(`[data-testid="analysis-type-option-${analysisType}"]`).click();
  }

  /**
   * Start the analysis
   */
  async startAnalysis() {
    await this.startAnalysisButton.click();
  }
}

/**
 * Page object for the analysis results page
 */
export class AnalysisResultsPage {
  readonly page: Page;
  readonly resultsContainer: Locator;
  readonly generateReportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.resultsContainer = page.locator('[data-testid="analysis-results"]');
    this.generateReportButton = page.locator('[data-testid="generate-report-button"]');
  }

  /**
   * Navigate to the analysis results page
   * @param analysisId ID of the analysis
   */
  async goto(analysisId: string) {
    await this.page.goto(`/analysis/${analysisId}`);
  }

  /**
   * Generate a report from the analysis
   * @param reportName Name for the report
   */
  async generateReport(reportName: string) {
    await this.generateReportButton.click();
    await this.page.locator('input[name="reportName"]').fill(reportName);
    await this.page.locator('[data-testid="create-report-button"]').click();
  }

  /**
   * Check if results are loaded
   */
  async resultsLoaded() {
    return await this.resultsContainer.isVisible();
  }
}
