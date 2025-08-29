import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class DashboardPage extends BasePage {
  // Page URL
  readonly url = '/dashboard';

  // Main dashboard locators
  get dashboard(): Locator {
    return this.page.getByTestId('dashboard');
  }

  get welcomeMessage(): Locator {
    return this.page.getByTestId('welcome-message');
  }

  get userProfile(): Locator {
    return this.page.getByTestId('user-profile');
  }

  // Navigation locators
  get sidebar(): Locator {
    return this.page.getByTestId('sidebar');
  }

  get navTransactions(): Locator {
    return this.page.getByTestId('nav-transactions');
  }

  get navBudgets(): Locator {
    return this.page.getByTestId('nav-budgets');
  }

  get navReports(): Locator {
    return this.page.getByTestId('nav-reports');
  }

  get navSettings(): Locator {
    return this.page.getByTestId('nav-settings');
  }

  get logoutButton(): Locator {
    return this.page.getByTestId('logout-button');
  }

  // Dashboard widgets
  get balanceWidget(): Locator {
    return this.page.getByTestId('balance-widget');
  }

  get currentBalance(): Locator {
    return this.page.getByTestId('current-balance');
  }

  get incomeWidget(): Locator {
    return this.page.getByTestId('income-widget');
  }

  get expenseWidget(): Locator {
    return this.page.getByTestId('expense-widget');
  }

  get budgetWidget(): Locator {
    return this.page.getByTestId('budget-widget');
  }

  // Recent transactions
  get recentTransactions(): Locator {
    return this.page.getByTestId('recent-transactions');
  }

  get transactionsList(): Locator {
    return this.page.getByTestId('transactions-list');
  }

  get viewAllTransactionsLink(): Locator {
    return this.page.getByTestId('view-all-transactions');
  }

  // Budget overview
  get budgetOverview(): Locator {
    return this.page.getByTestId('budget-overview');
  }

  get budgetProgressBars(): Locator {
    return this.page.getByTestId('budget-progress');
  }

  get viewBudgetsLink(): Locator {
    return this.page.getByTestId('view-budgets');
  }

  // Quick actions
  get quickActions(): Locator {
    return this.page.getByTestId('quick-actions');
  }

  get addTransactionButton(): Locator {
    return this.page.getByTestId('add-transaction-quick');
  }

  get addBudgetButton(): Locator {
    return this.page.getByTestId('add-budget-quick');
  }

  // Charts and graphs
  get spendingChart(): Locator {
    return this.page.getByTestId('spending-chart');
  }

  get incomeChart(): Locator {
    return this.page.getByTestId('income-chart');
  }

  get categoryChart(): Locator {
    return this.page.getByTestId('category-chart');
  }

  // Date range selector
  get dateRangeSelector(): Locator {
    return this.page.getByTestId('date-range-selector');
  }

  // Page actions
  async navigate(): Promise<void> {
    await this.goTo(this.url);
    await expect(this.dashboard).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.waitForUrl('/auth/login');
  }

  // Navigation actions
  async goToTransactions(): Promise<void> {
    await this.navTransactions.click();
    await this.waitForUrl('/transactions');
  }

  async goToBudgets(): Promise<void> {
    await this.navBudgets.click();
    await this.waitForUrl('/budgets');
  }

  async goToReports(): Promise<void> {
    await this.navReports.click();
    await this.waitForUrl('/reports');
  }

  async goToSettings(): Promise<void> {
    await this.navSettings.click();
    await this.waitForUrl('/settings');
  }

  // Quick actions
  async addQuickTransaction(): Promise<void> {
    await this.addTransactionButton.click();
    await this.waitForUrl('/transactions/add');
  }

  async addQuickBudget(): Promise<void> {
    await this.addBudgetButton.click();
    await this.waitForUrl('/budgets/add');
  }

  async viewAllTransactions(): Promise<void> {
    await this.viewAllTransactionsLink.click();
    await this.waitForUrl('/transactions');
  }

  async viewAllBudgets(): Promise<void> {
    await this.viewBudgetsLink.click();
    await this.waitForUrl('/budgets');
  }

  // Validation methods
  async expectDashboardVisible(): Promise<void> {
    await expect(this.dashboard).toBeVisible();
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.userProfile).toBeVisible();
  }

  async expectWelcomeMessage(userName?: string): Promise<void> {
    await expect(this.welcomeMessage).toBeVisible();
    if (userName) {
      await expect(this.welcomeMessage).toContainText(userName);
    }
  }

  async expectSidebarVisible(): Promise<void> {
    await expect(this.sidebar).toBeVisible();
    await expect(this.navTransactions).toBeVisible();
    await expect(this.navBudgets).toBeVisible();
    await expect(this.navReports).toBeVisible();
    await expect(this.navSettings).toBeVisible();
  }

  async expectWidgetsVisible(): Promise<void> {
    await expect(this.balanceWidget).toBeVisible();
    await expect(this.incomeWidget).toBeVisible();
    await expect(this.expenseWidget).toBeVisible();
    await expect(this.budgetWidget).toBeVisible();
  }

  async expectRecentTransactionsVisible(): Promise<void> {
    await expect(this.recentTransactions).toBeVisible();
    await expect(this.viewAllTransactionsLink).toBeVisible();
  }

  async expectBudgetOverviewVisible(): Promise<void> {
    await expect(this.budgetOverview).toBeVisible();
    await expect(this.viewBudgetsLink).toBeVisible();
  }

  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.quickActions).toBeVisible();
    await expect(this.addTransactionButton).toBeVisible();
    await expect(this.addBudgetButton).toBeVisible();
  }

  async expectChartsVisible(): Promise<void> {
    await expect(this.spendingChart).toBeVisible();
    await expect(this.categoryChart).toBeVisible();
  }

  // Data validation methods
  async expectBalanceValue(expectedBalance?: string): Promise<void> {
    await expect(this.currentBalance).toBeVisible();
    if (expectedBalance) {
      await expect(this.currentBalance).toContainText(expectedBalance);
    }
    
    // Verify balance format (currency symbol, decimal places)
    const balanceText = await this.currentBalance.textContent();
    expect(balanceText).toMatch(/[\$€£¥]\d+(\.\d{2})?/);
  }

  async expectRecentTransactionsCount(minCount: number = 1): Promise<void> {
    const transactions = this.page.getByTestId('transaction-item');
    const count = await transactions.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }

  async expectBudgetProgress(): Promise<void> {
    const progressBars = await this.budgetProgressBars.count();
    expect(progressBars).toBeGreaterThan(0);
    
    // Check that progress bars have proper values
    const bars = await this.page.getByTestId('budget-progress-bar').all();
    for (const bar of bars) {
      const progress = await bar.getAttribute('value');
      expect(Number(progress)).toBeGreaterThanOrEqual(0);
      expect(Number(progress)).toBeLessThanOrEqual(100);
    }
  }

  // Chart validation
  async expectChartData(): Promise<void> {
    // Wait for charts to load
    await this.page.waitForTimeout(2000);
    
    // Check that charts have rendered
    const chartCanvas = this.page.locator('canvas').first();
    await expect(chartCanvas).toBeVisible();
    
    // Verify chart has data (not empty)
    const chartContainer = await this.spendingChart.boundingBox();
    expect(chartContainer?.width).toBeGreaterThan(0);
    expect(chartContainer?.height).toBeGreaterThan(0);
  }

  // Date range functionality
  async changeDateRange(range: 'week' | 'month' | 'quarter' | 'year'): Promise<void> {
    await this.dateRangeSelector.click();
    await this.page.getByTestId(`date-range-${range}`).click();
    await this.waitForLoadingToFinish();
  }

  async expectDateRangeUpdate(): Promise<void> {
    // After changing date range, expect widgets to update
    await this.waitForLoadingToFinish();
    await this.expectWidgetsVisible();
    await this.expectChartData();
  }

  // Performance testing
  async measureDashboardLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigate();
    await this.expectDashboardVisible();
    await this.expectChartsVisible();
    return Date.now() - startTime;
  }

  async measureChartRenderTime(): Promise<number> {
    const startTime = Date.now();
    await this.changeDateRange('month');
    await this.expectChartData();
    return Date.now() - startTime;
  }

  // Mobile testing
  async testMobileLayout(): Promise<void> {
    await this.setMobileViewport();
    await this.expectDashboardVisible();
    
    // Check that mobile navigation works (hamburger menu)
    const mobileMenu = this.page.getByTestId('mobile-menu');
    await expect(mobileMenu).toBeVisible();
    
    await mobileMenu.click();
    await this.expectSidebarVisible();
  }

  async testTabletLayout(): Promise<void> {
    await this.setTabletViewport();
    await this.expectDashboardVisible();
    await this.expectSidebarVisible();
    
    // Check that widgets are properly arranged for tablet
    const widgets = await this.page.getByTestId('dashboard-widget').all();
    expect(widgets.length).toBeGreaterThan(0);
  }

  // Accessibility testing
  async testKeyboardNavigation(): Promise<void> {
    // Test tabbing through dashboard elements
    await this.page.keyboard.press('Tab');
    await expect(this.addTransactionButton).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.addBudgetButton).toBeFocused();
    
    // Test skip links for screen readers
    const skipLink = this.page.getByTestId('skip-to-content');
    await expect(skipLink).toBeVisible();
  }

  async testScreenReaderSupport(): Promise<void> {
    // Check for proper ARIA labels and roles
    await expect(this.dashboard).toHaveAttribute('role', 'main');
    await expect(this.sidebar).toHaveAttribute('role', 'navigation');
    
    // Check chart accessibility
    await expect(this.spendingChart).toHaveAttribute('role', 'img');
    await expect(this.spendingChart).toHaveAttribute('aria-label');
  }

  // Error handling
  async expectErrorState(): Promise<void> {
    const errorMessage = this.page.getByTestId('dashboard-error');
    await expect(errorMessage).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    const emptyState = this.page.getByTestId('dashboard-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('getting started');
  }

  // Session management
  async testSessionPersistence(): Promise<void> {
    // Refresh the page and ensure user stays logged in
    await this.refresh();
    await this.expectDashboardVisible();
    
    // Check that user data is still loaded
    await this.expectBalanceValue();
    await this.expectRecentTransactionsVisible();
  }

  async testSessionTimeout(): Promise<void> {
    // This would typically require backend coordination
    // For now, we'll simulate token expiration
    await this.page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    });
    
    await this.refresh();
    await this.waitForUrl('/auth/login');
  }
}