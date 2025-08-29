import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object class with common functionality
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common locators
  get loadingSpinner(): Locator {
    return this.page.getByTestId('loading-spinner');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('error-message');
  }

  get successMessage(): Locator {
    return this.page.getByTestId('success-message');
  }

  get notificationMessage(): Locator {
    return this.page.getByTestId('notification');
  }

  // Common actions
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoadingToFinish(): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Loading spinner might not exist, which is fine
    }
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }

  async expectToBeVisible(): Promise<void> {
    await this.waitForLoad();
    await this.waitForLoadingToFinish();
  }

  async expectErrorMessage(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectSuccessMessage(message?: string): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    }
  }

  async expectNotification(message?: string): Promise<void> {
    await expect(this.notificationMessage).toBeVisible();
    if (message) {
      await expect(this.notificationMessage).toContainText(message);
    }
  }

  // Navigation helpers
  async goTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  // Form helpers
  async fillInput(selector: string, value: string): Promise<void> {
    const input = this.page.getByTestId(selector);
    await input.clear();
    await input.fill(value);
  }

  async clickButton(selector: string): Promise<void> {
    const button = this.page.getByTestId(selector);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
  }

  async selectOption(selector: string, value: string): Promise<void> {
    const select = this.page.getByTestId(selector);
    await select.selectOption(value);
  }

  // Validation helpers
  async expectInputValue(selector: string, value: string): Promise<void> {
    const input = this.page.getByTestId(selector);
    await expect(input).toHaveValue(value);
  }

  async expectInputError(selector: string, errorMessage?: string): Promise<void> {
    const errorElement = this.page.getByTestId(`${selector}-error`);
    await expect(errorElement).toBeVisible();
    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  async expectButtonDisabled(selector: string): Promise<void> {
    const button = this.page.getByTestId(selector);
    await expect(button).toBeDisabled();
  }

  async expectButtonEnabled(selector: string): Promise<void> {
    const button = this.page.getByTestId(selector);
    await expect(button).toBeEnabled();
  }

  // Utility methods
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForUrl(expectedUrl: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(expectedUrl, { timeout });
  }

  // Local storage helpers
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => localStorage.getItem(key), key);
  }

  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  // Performance monitoring
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForLoad();
    return Date.now() - startTime;
  }

  // Accessibility helpers
  async checkPageAccessibility(): Promise<void> {
    // Check for proper heading structure
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check for alt text on images
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // Check for proper form labels
    const inputs = await this.page.locator('input[type="text"], input[type="email"], input[type="password"]').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = this.page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  }

  // Mobile specific helpers
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }
}