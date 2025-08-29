import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TestUser } from '../utils/test-data';

export class LoginPage extends BasePage {
  // Page URL
  readonly url = '/auth/login';

  // Form locators
  get loginForm(): Locator {
    return this.page.getByTestId('login-form');
  }

  get emailInput(): Locator {
    return this.page.getByTestId('login-email');
  }

  get passwordInput(): Locator {
    return this.page.getByTestId('login-password');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('login-submit');
  }

  get rememberMeCheckbox(): Locator {
    return this.page.getByTestId('login-remember-me');
  }

  // Link locators
  get forgotPasswordLink(): Locator {
    return this.page.getByTestId('forgot-password-link');
  }

  get registerLink(): Locator {
    return this.page.getByTestId('register-link');
  }

  // Error locators
  get emailError(): Locator {
    return this.page.getByTestId('login-email-error');
  }

  get passwordError(): Locator {
    return this.page.getByTestId('login-password-error');
  }

  get loginError(): Locator {
    return this.page.getByTestId('login-error');
  }

  // Account lockout locators
  get lockoutMessage(): Locator {
    return this.page.getByTestId('lockout-message');
  }

  get lockoutTimer(): Locator {
    return this.page.getByTestId('lockout-timer');
  }

  // Page actions
  async navigate(): Promise<void> {
    await this.goTo(this.url);
    await expect(this.loginForm).toBeVisible();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  async toggleRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.click();
  }

  async submitLogin(): Promise<void> {
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
  }

  async login(user: TestUser, rememberMe: boolean = false): Promise<void> {
    await this.fillEmail(user.email);
    await this.fillPassword(user.password);
    
    if (rememberMe) {
      await this.toggleRememberMe();
    }
    
    await this.submitLogin();
  }

  async loginAndExpectSuccess(user: TestUser, expectedUrl: string = '/dashboard'): Promise<void> {
    await this.login(user);
    await this.waitForUrl(expectedUrl);
  }

  async loginAndExpectError(user: TestUser, expectedError?: string): Promise<void> {
    await this.login(user);
    await expect(this.loginError).toBeVisible();
    
    if (expectedError) {
      await expect(this.loginError).toContainText(expectedError);
    }
  }

  // Navigation actions
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
    await this.waitForUrl('/auth/register');
  }

  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForUrl('/auth/forgot-password');
  }

  // Validation methods
  async expectFormVisible(): Promise<void> {
    await expect(this.loginForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectEmailError(message?: string): Promise<void> {
    await expect(this.emailError).toBeVisible();
    if (message) {
      await expect(this.emailError).toContainText(message);
    }
  }

  async expectPasswordError(message?: string): Promise<void> {
    await expect(this.passwordError).toBeVisible();
    if (message) {
      await expect(this.passwordError).toContainText(message);
    }
  }

  async expectLoginError(message?: string): Promise<void> {
    await expect(this.loginError).toBeVisible();
    if (message) {
      await expect(this.loginError).toContainText(message);
    }
  }

  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  // Account lockout methods
  async expectLockoutMessage(): Promise<void> {
    await expect(this.lockoutMessage).toBeVisible();
    await expect(this.submitButton).toBeDisabled();
  }

  async expectLockoutTimer(): Promise<void> {
    await expect(this.lockoutTimer).toBeVisible();
  }

  async waitForLockoutToEnd(timeoutMs: number = 900000): Promise<void> {
    // Wait for submit button to be enabled again
    await expect(this.submitButton).toBeEnabled({ timeout: timeoutMs });
    await expect(this.lockoutMessage).not.toBeVisible();
  }

  // Rate limiting methods
  async expectRateLimitError(): Promise<void> {
    await expect(this.loginError).toBeVisible();
    await expect(this.loginError).toContainText('rate limit');
  }

  // Form validation methods
  async validateEmptyForm(): Promise<void> {
    await this.submitLogin();
    await this.expectEmailError('Email is required');
    await this.expectPasswordError('Password is required');
  }

  async validateInvalidEmail(): Promise<void> {
    await this.fillEmail('invalid-email');
    await this.fillPassword('password123');
    await this.submitLogin();
    await this.expectEmailError('Please enter a valid email');
  }

  async validateShortPassword(): Promise<void> {
    await this.fillEmail('user@test.com');
    await this.fillPassword('123');
    await this.submitLogin();
    await this.expectPasswordError('Password must be at least 8 characters');
  }

  // Security testing methods
  async attemptMultipleFailedLogins(user: TestUser, attempts: number = 5): Promise<void> {
    const wrongPassword = 'wrongpassword';
    
    for (let i = 0; i < attempts; i++) {
      await this.fillEmail(user.email);
      await this.fillPassword(wrongPassword);
      await this.submitLogin();
      
      if (i < attempts - 1) {
        await expect(this.loginError).toBeVisible();
        await this.page.waitForTimeout(100); // Small delay between attempts
      }
    }
  }

  async testPasswordVisibilityToggle(): Promise<void> {
    const toggleButton = this.page.getByTestId('password-visibility-toggle');
    
    // Initially password should be hidden
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(this.passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle to hide password again
    await toggleButton.click();
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
  }

  // Accessibility methods
  async testKeyboardNavigation(): Promise<void> {
    // Tab to email field
    await this.page.keyboard.press('Tab');
    await expect(this.emailInput).toBeFocused();
    
    // Tab to password field
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    // Tab to remember me checkbox
    await this.page.keyboard.press('Tab');
    await expect(this.rememberMeCheckbox).toBeFocused();
    
    // Tab to submit button
    await this.page.keyboard.press('Tab');
    await expect(this.submitButton).toBeFocused();
    
    // Enter should submit the form
    await this.page.keyboard.press('Enter');
  }

  async testScreenReaderLabels(): Promise<void> {
    // Check for proper labels
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.passwordInput).toHaveAttribute('aria-label');
    
    // Check for error announcements
    await expect(this.loginError).toHaveAttribute('role', 'alert');
  }

  // Mobile specific methods
  async testMobileLayout(): Promise<void> {
    await this.setMobileViewport();
    await this.expectFormVisible();
    
    // Check that form elements are properly sized for mobile
    const formWidth = await this.loginForm.boundingBox();
    expect(formWidth?.width).toBeLessThan(400);
  }

  // Performance testing
  async measureFormSubmissionTime(): Promise<number> {
    const startTime = Date.now();
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
    return Date.now() - startTime;
  }
}