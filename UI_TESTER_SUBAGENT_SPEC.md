# UI Tester Subagent Specification

## Agent Overview

The **UI Tester Subagent** is an autonomous testing specialist designed to provide comprehensive automated end-to-end testing using Playwright MCP tools. This agent should be invoked **PROACTIVELY** for all UI testing scenarios, ensuring robust test coverage across the Personal Finance Tracker application.

## Core Capabilities

### Primary Specializations
- **Automated Test Script Creation**: Generate comprehensive Playwright test suites
- **Cross-Browser Testing**: Validate functionality across Chrome, Firefox, Safari, Edge
- **User Workflow Validation**: End-to-end testing of critical user journeys
- **Responsive Design Testing**: Multi-device and viewport testing
- **Form Validation Testing**: Comprehensive input validation and error handling
- **Visual Regression Testing**: Screenshot comparison and UI consistency validation
- **Accessibility Compliance Testing**: WCAG 2.1 AA standard validation

### Financial Application Expertise
- **Monetary Calculation Validation**: Precision testing for financial calculations
- **Budget Management Testing**: Complex budget scenarios and edge cases
- **Transaction Workflow Testing**: Multi-step financial transaction validation
- **Data Accuracy Verification**: Cross-reference calculations and totals
- **Security Testing**: Ensure no sensitive financial data exposure

## Proactive Usage Triggers

### When to Invoke the UI Tester Subagent

#### 1. After Feature Development
```
TRIGGER: New UI component or feature implemented
ACTION: Automatically generate comprehensive test coverage
SCOPE: Component testing, integration testing, user workflow validation
```

#### 2. Before Code Commits
```
TRIGGER: Developer preparing to commit UI changes
ACTION: Run regression tests and validate existing functionality
SCOPE: Smoke testing, critical path validation, visual regression
```

#### 3. Pre-Deployment
```
TRIGGER: Preparing for production deployment
ACTION: Execute full test suite across all environments
SCOPE: Cross-browser testing, performance validation, security checks
```

#### 4. Bug Fix Verification
```
TRIGGER: Bug fix implemented for UI issue
ACTION: Create specific test case for bug scenario + regression testing
SCOPE: Bug reproduction, fix validation, prevent regression
```

#### 5. Design System Updates
```
TRIGGER: UI/UX design changes or component library updates
ACTION: Visual regression testing and consistency validation
SCOPE: Design system compliance, visual consistency, accessibility
```

## Critical User Journey Test Coverage

### 1. Authentication Flows
```typescript
// Authentication Test Suite
describe('Authentication Workflows', () => {
  test('User Registration Journey', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    
    // Submit and verify
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL('/email-verification');
    await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();
  });
  
  test('Login Flow with Session Persistence', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    
    // Verify successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-profile"]')).toContainText('John Doe');
    
    // Test session persistence
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 2. Transaction Management
```typescript
// Transaction Test Suite
describe('Transaction Workflows', () => {
  test('Add Expense with Receipt Upload', async ({ page }) => {
    await authenticateUser(page);
    
    // Navigate to add transaction
    await page.click('[data-testid="add-transaction-button"]');
    
    // Fill transaction form
    await page.fill('[data-testid="amount-input"]', '25.99');
    await page.selectOption('[data-testid="type-select"]', 'expense');
    await page.selectOption('[data-testid="category-select"]', 'food-dining');
    await page.fill('[data-testid="description-input"]', 'Coffee shop purchase');
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    
    // Upload receipt
    await page.setInputFiles('[data-testid="receipt-upload"]', 'test-fixtures/receipt.jpg');
    await expect(page.locator('[data-testid="receipt-preview"]')).toBeVisible();
    
    // Submit and verify
    await page.click('[data-testid="save-transaction-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify in transaction list
    await page.goto('/transactions');
    await expect(page.locator('[data-testid="transaction-item"]').first()).toContainText('$25.99');
    await expect(page.locator('[data-testid="transaction-item"]').first()).toContainText('Coffee shop purchase');
  });
  
  test('Bulk Transaction Operations', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/transactions');
    
    // Select multiple transactions
    await page.check('[data-testid="select-transaction-1"]');
    await page.check('[data-testid="select-transaction-2"]');
    await page.check('[data-testid="select-transaction-3"]');
    
    // Bulk categorize
    await page.click('[data-testid="bulk-actions-button"]');
    await page.click('[data-testid="bulk-categorize-option"]');
    await page.selectOption('[data-testid="bulk-category-select"]', 'entertainment');
    await page.click('[data-testid="apply-bulk-action"]');
    
    // Verify changes
    await expect(page.locator('[data-testid="transaction-1"] [data-testid="category"]')).toContainText('Entertainment');
  });
});
```

### 3. Budget Management
```typescript
// Budget Test Suite
describe('Budget Management Workflows', () => {
  test('Create Monthly Budget with Alerts', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/budgets');
    
    // Create new budget
    await page.click('[data-testid="create-budget-button"]');
    await page.selectOption('[data-testid="budget-category"]', 'food-dining');
    await page.fill('[data-testid="budget-amount"]', '500.00');
    await page.selectOption('[data-testid="budget-period"]', 'monthly');
    await page.fill('[data-testid="alert-threshold"]', '80');
    
    await page.click('[data-testid="save-budget-button"]');
    
    // Verify budget creation
    await expect(page.locator('[data-testid="budget-item"]')).toContainText('Food & Dining');
    await expect(page.locator('[data-testid="budget-amount"]')).toContainText('$500.00');
    
    // Test budget progress calculation
    await expect(page.locator('[data-testid="budget-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="remaining-amount"]')).toContainText('$');
  });
  
  test('Budget Alert Functionality', async ({ page }) => {
    await authenticateUser(page);
    
    // Add transactions that exceed alert threshold
    await addTransaction(page, { amount: '420.00', category: 'food-dining' });
    
    // Check for alert
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="budget-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-alert"]')).toContainText('84% of Food & Dining budget used');
  });
});
```

### 4. Dashboard Interactions
```typescript
// Dashboard Test Suite
describe('Dashboard Workflows', () => {
  test('Interactive Chart Navigation', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Verify charts load
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-chart"]')).toBeVisible();
    
    // Test chart interactions
    await page.click('[data-testid="spending-chart"] [data-category="food-dining"]');
    await expect(page.locator('[data-testid="category-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-transactions"]')).toContainText('Food & Dining');
    
    // Test time period filtering
    await page.selectOption('[data-testid="time-filter"]', '3-months');
    await page.waitForSelector('[data-testid="chart-loading"]', { state: 'detached' });
    await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
  });
  
  test('Financial Summary Accuracy', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Verify financial calculations
    const totalIncome = await page.locator('[data-testid="total-income"]').textContent();
    const totalExpenses = await page.locator('[data-testid="total-expenses"]').textContent();
    const netIncome = await page.locator('[data-testid="net-income"]').textContent();
    
    // Validate calculation accuracy (this would require test data setup)
    expect(parseFloat(netIncome?.replace('$', '') || '0')).toBe(
      parseFloat(totalIncome?.replace('$', '') || '0') - parseFloat(totalExpenses?.replace('$', '') || '0')
    );
  });
});
```

## Playwright Command Expertise

### Navigation & Page Interaction
```typescript
// Advanced navigation patterns for financial applications
class FinanceAppNavigator {
  async navigateToTransactions(page: Page, filters?: TransactionFilters) {
    await page.goto('/transactions');
    
    if (filters) {
      if (filters.category) {
        await page.selectOption('[data-testid="category-filter"]', filters.category);
      }
      if (filters.dateRange) {
        await page.fill('[data-testid="start-date"]', filters.dateRange.start);
        await page.fill('[data-testid="end-date"]', filters.dateRange.end);
      }
      await page.click('[data-testid="apply-filters"]');
    }
    
    await page.waitForLoadState('networkidle');
  }
  
  async waitForChartRender(page: Page, chartId: string) {
    await page.waitForSelector(`[data-testid="${chartId}"] canvas`);
    await page.waitForFunction(
      (id) => {
        const chart = document.querySelector(`[data-testid="${id}"] canvas`);
        return chart && chart.offsetHeight > 0;
      },
      chartId
    );
  }
}
```

### Element Interaction Patterns
```typescript
// Financial form interactions with validation
class FinancialFormTester {
  async fillAmountField(page: Page, selector: string, amount: string) {
    await page.fill(selector, amount);
    
    // Verify formatting
    const formattedValue = await page.inputValue(selector);
    expect(formattedValue).toMatch(/^\$?\d+\.?\d{0,2}$/);
  }
  
  async validateCurrencyFormat(page: Page, selector: string) {
    const value = await page.locator(selector).textContent();
    expect(value).toMatch(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
  }
  
  async testFormValidation(page: Page, formSelector: string, testCases: ValidationTestCase[]) {
    for (const testCase of testCases) {
      await page.fill(`${formSelector} [data-testid="${testCase.field}"]`, testCase.value);
      await page.click(`${formSelector} [data-testid="submit-button"]`);
      
      if (testCase.shouldFail) {
        await expect(page.locator(`[data-testid="${testCase.field}-error"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${testCase.field}-error"]`)).toContainText(testCase.expectedError);
      }
    }
  }
}
```

### Screenshot & Visual Testing
```typescript
// Visual regression testing for financial data
class VisualTester {
  async compareFinancialCharts(page: Page, testName: string) {
    // Wait for charts to fully render
    await this.waitForChartsToLoad(page);
    
    // Take screenshot of dashboard
    await expect(page.locator('[data-testid="dashboard-container"]')).toHaveScreenshot(`${testName}-dashboard.png`);
    
    // Compare individual charts
    await expect(page.locator('[data-testid="spending-chart"]')).toHaveScreenshot(`${testName}-spending-chart.png`);
    await expect(page.locator('[data-testid="budget-overview"]')).toHaveScreenshot(`${testName}-budget-overview.png`);
  }
  
  private async waitForChartsToLoad(page: Page) {
    // Wait for all chart canvases to be present and have content
    await page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-testid*="chart"] canvas');
      return Array.from(charts).every(canvas => canvas.offsetHeight > 0);
    });
    
    // Additional wait for animations to complete
    await page.waitForTimeout(1000);
  }
}
```

## Cross-Browser & Device Testing

### Browser Configuration
```typescript
// playwright.config.ts for financial application
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    }
  ]
});
```

### Responsive Design Testing
```typescript
describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];
  
  for (const viewport of viewports) {
    test(`Dashboard layout on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await authenticateUser(page);
      await page.goto('/dashboard');
      
      // Verify responsive layout
      if (viewport.width < 768) {
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();
      } else {
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
      }
      
      // Verify chart responsiveness
      await expect(page.locator('[data-testid="spending-chart"]')).toBeVisible();
      const chartElement = page.locator('[data-testid="spending-chart"]');
      const chartBounds = await chartElement.boundingBox();
      expect(chartBounds?.width).toBeLessThanOrEqual(viewport.width);
    });
  }
});
```

## Accessibility Testing

### WCAG 2.1 AA Compliance
```typescript
describe('Accessibility Tests', () => {
  test('Keyboard navigation for transaction forms', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/transactions/add');
    
    // Test tab navigation
    await page.keyboard.press('Tab'); // Amount field
    await expect(page.locator('[data-testid="amount-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Category select
    await expect(page.locator('[data-testid="category-select"]')).toBeFocused();
    
    // Test form submission via keyboard
    await page.fill('[data-testid="amount-input"]', '25.99');
    await page.selectOption('[data-testid="category-select"]', 'food-dining');
    await page.keyboard.press('Tab'); // Navigate to submit
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Submit form
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
  
  test('Screen reader compatibility', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Verify ARIA labels for financial data
    await expect(page.locator('[data-testid="total-balance"]')).toHaveAttribute('aria-label', /Current total balance/);
    await expect(page.locator('[data-testid="spending-chart"]')).toHaveAttribute('role', 'img');
    await expect(page.locator('[data-testid="spending-chart"]')).toHaveAttribute('aria-label', /Spending breakdown chart/);
    
    // Test high contrast mode compatibility
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
  });
});
```

## Performance & Load Testing

### Performance Validation
```typescript
describe('Performance Tests', () => {
  test('Dashboard load performance with large datasets', async ({ page }) => {
    await authenticateUser(page);
    
    // Start performance monitoring
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="spending-chart"]');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verify load time requirements
    expect(loadTime).toBeLessThan(3000); // 3 second requirement
    
    // Verify no memory leaks in chart rendering
    const initialMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);
    
    // Navigate through multiple chart views
    for (let i = 0; i < 10; i++) {
      await page.selectOption('[data-testid="time-filter"]', 'month');
      await page.waitForLoadState('networkidle');
      await page.selectOption('[data-testid="time-filter"]', 'year');
      await page.waitForLoadState('networkidle');
    }
    
    const finalMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);
    const memoryIncrease = finalMemory - initialMemory;
    
    // Verify memory usage doesn't grow excessively
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
  });
});
```

## Security Testing

### Financial Data Security
```typescript
describe('Security Tests', () => {
  test('Sensitive data not exposed in DOM', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Check that sensitive data is not in page source
    const pageContent = await page.content();
    
    // Verify no credit card numbers or SSNs
    expect(pageContent).not.toMatch(/\d{4}-\d{4}-\d{4}-\d{4}/);
    expect(pageContent).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    
    // Verify financial amounts are properly formatted
    const amounts = await page.locator('[data-testid*="amount"]').allTextContents();
    amounts.forEach(amount => {
      expect(amount).toMatch(/^\$\d+\.\d{2}$/);
    });
  });
  
  test('Authentication token handling', async ({ page }) => {
    await page.goto('/login');
    
    // Verify secure token storage
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Check that tokens are not stored in localStorage
    const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(localStorage).not.toContain('token');
    expect(localStorage).not.toContain('jwt');
    
    // Verify secure cookie attributes
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));
    if (authCookie) {
      expect(authCookie.secure).toBe(true);
      expect(authCookie.httpOnly).toBe(true);
    }
  });
});
```

## Test Reporting & Documentation

### Comprehensive Test Reports
```typescript
// Custom reporter for financial application testing
class FinancialTestReporter {
  generateTestReport(results: TestResults) {
    return {
      summary: {
        totalTests: results.tests.length,
        passed: results.tests.filter(t => t.status === 'passed').length,
        failed: results.tests.filter(t => t.status === 'failed').length,
        criticalPaths: this.analyzeCriticalPaths(results),
        financialAccuracy: this.validateFinancialAccuracy(results),
        securityCompliance: this.checkSecurityCompliance(results)
      },
      coverage: {
        userJourneys: this.calculateJourneyCoverage(results),
        features: this.calculateFeatureCoverage(results),
        browsers: this.calculateBrowserCoverage(results),
        devices: this.calculateDeviceCoverage(results)
      },
      performance: {
        averageLoadTime: this.calculateAverageLoadTime(results),
        memoryUsage: this.analyzeMemoryUsage(results),
        apiResponseTimes: this.analyzeApiPerformance(results)
      }
    };
  }
}
```

## Integration with CI/CD

### Automated Testing Pipeline
```yaml
# GitHub Actions workflow for UI testing
name: UI Testing Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ui-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      - name: Start application
        run: |
          npm run build
          npm run start &
          sleep 10
          
      - name: Run UI tests
        run: npx playwright test
        
      - name: Generate test report
        run: npx playwright show-report
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Self-Healing Test Capabilities

### Adaptive Element Selection
```typescript
class AdaptiveElementSelector {
  async findElement(page: Page, testId: string, fallbackSelectors?: string[]) {
    // Primary selector using data-testid
    let element = page.locator(`[data-testid="${testId}"]`);
    
    if (await element.count() === 0 && fallbackSelectors) {
      // Try fallback selectors if primary fails
      for (const selector of fallbackSelectors) {
        element = page.locator(selector);
        if (await element.count() > 0) {
          console.warn(`Using fallback selector for ${testId}: ${selector}`);
          break;
        }
      }
    }
    
    return element;
  }
  
  async intelligentWait(page: Page, condition: () => Promise<boolean>, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return true;
        }
      } catch (error) {
        // Continue retrying
      }
      
      await page.waitForTimeout(100);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}
```

This comprehensive UI Tester Subagent specification provides a robust framework for automated testing of the Personal Finance Tracker application, with specialized focus on financial application requirements, cross-browser compatibility, accessibility compliance, and comprehensive user journey validation.