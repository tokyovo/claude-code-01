import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TestUser } from '../utils/test-data';

export class RegisterPage extends BasePage {
  // Page URL
  readonly url = '/auth/register';

  // Form locators
  get registerForm(): Locator {
    return this.page.getByTestId('register-form');
  }

  get nameInput(): Locator {
    return this.page.getByTestId('register-name');
  }

  get emailInput(): Locator {
    return this.page.getByTestId('register-email');
  }

  get passwordInput(): Locator {
    return this.page.getByTestId('register-password');
  }

  get confirmPasswordInput(): Locator {
    return this.page.getByTestId('register-confirm-password');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('register-submit');
  }

  get termsCheckbox(): Locator {
    return this.page.getByTestId('terms-checkbox');
  }

  // Link locators
  get loginLink(): Locator {
    return this.page.getByTestId('login-link');
  }

  get termsLink(): Locator {
    return this.page.getByTestId('terms-link');
  }

  get privacyLink(): Locator {
    return this.page.getByTestId('privacy-link');
  }

  // Error locators
  get nameError(): Locator {
    return this.page.getByTestId('register-name-error');
  }

  get emailError(): Locator {
    return this.page.getByTestId('register-email-error');
  }

  get passwordError(): Locator {
    return this.page.getByTestId('register-password-error');
  }

  get confirmPasswordError(): Locator {
    return this.page.getByTestId('register-confirm-password-error');
  }

  get termsError(): Locator {
    return this.page.getByTestId('terms-error');
  }

  get registerError(): Locator {
    return this.page.getByTestId('register-error');
  }

  // Success locators
  get successMessage(): Locator {
    return this.page.getByTestId('register-success');
  }

  get verificationMessage(): Locator {
    return this.page.getByTestId('verification-message');
  }

  // Password strength indicator
  get passwordStrength(): Locator {
    return this.page.getByTestId('password-strength');
  }

  get passwordRequirements(): Locator {
    return this.page.getByTestId('password-requirements');
  }

  // Page actions
  async navigate(): Promise<void> {
    await this.goTo(this.url);
    await expect(this.registerForm).toBeVisible();
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.confirmPasswordInput.clear();
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  async acceptTerms(): Promise<void> {
    await this.termsCheckbox.check();
  }

  async submitRegistration(): Promise<void> {
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
  }

  async register(user: TestUser, acceptTerms: boolean = true): Promise<void> {
    await this.fillName(user.name);
    await this.fillEmail(user.email);
    await this.fillPassword(user.password);
    await this.fillConfirmPassword(user.password);
    
    if (acceptTerms) {
      await this.acceptTerms();
    }
    
    await this.submitRegistration();
  }

  async registerAndExpectSuccess(user: TestUser): Promise<void> {
    await this.register(user);
    await this.expectRegistrationSuccess();
  }

  async registerAndExpectError(user: TestUser, expectedError?: string): Promise<void> {
    await this.register(user);
    await expect(this.registerError).toBeVisible();
    
    if (expectedError) {
      await expect(this.registerError).toContainText(expectedError);
    }
  }

  // Navigation actions
  async goToLogin(): Promise<void> {
    await this.loginLink.click();
    await this.waitForUrl('/auth/login');
  }

  // Validation methods
  async expectFormVisible(): Promise<void> {
    await expect(this.registerForm).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.termsCheckbox).toBeVisible();
  }

  async expectNameError(message?: string): Promise<void> {
    await expect(this.nameError).toBeVisible();
    if (message) {
      await expect(this.nameError).toContainText(message);
    }
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

  async expectConfirmPasswordError(message?: string): Promise<void> {
    await expect(this.confirmPasswordError).toBeVisible();
    if (message) {
      await expect(this.confirmPasswordError).toContainText(message);
    }
  }

  async expectTermsError(message?: string): Promise<void> {
    await expect(this.termsError).toBeVisible();
    if (message) {
      await expect(this.termsError).toContainText(message);
    }
  }

  async expectRegisterError(message?: string): Promise<void> {
    await expect(this.registerError).toBeVisible();
    if (message) {
      await expect(this.registerError).toContainText(message);
    }
  }

  async expectRegistrationSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  async expectVerificationMessage(): Promise<void> {
    await expect(this.verificationMessage).toBeVisible();
  }

  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  // Form validation methods
  async validateEmptyForm(): Promise<void> {
    await this.submitRegistration();
    await this.expectNameError('Name is required');
    await this.expectEmailError('Email is required');
    await this.expectPasswordError('Password is required');
    await this.expectConfirmPasswordError('Please confirm your password');
    await this.expectTermsError('You must accept the terms and conditions');
  }

  async validateInvalidEmail(): Promise<void> {
    await this.fillName('Test User');
    await this.fillEmail('invalid-email');
    await this.fillPassword('Password123!');
    await this.fillConfirmPassword('Password123!');
    await this.acceptTerms();
    await this.submitRegistration();
    await this.expectEmailError('Please enter a valid email');
  }

  async validateWeakPassword(): Promise<void> {
    await this.fillName('Test User');
    await this.fillEmail('test@example.com');
    await this.fillPassword('weak');
    await this.fillConfirmPassword('weak');
    await this.acceptTerms();
    await this.submitRegistration();
    await this.expectPasswordError('Password must be at least 8 characters');
  }

  async validatePasswordMismatch(): Promise<void> {
    await this.fillName('Test User');
    await this.fillEmail('test@example.com');
    await this.fillPassword('Password123!');
    await this.fillConfirmPassword('DifferentPassword123!');
    await this.acceptTerms();
    await this.submitRegistration();
    await this.expectConfirmPasswordError('Passwords do not match');
  }

  async validateExistingEmail(existingEmail: string): Promise<void> {
    await this.fillName('Test User');
    await this.fillEmail(existingEmail);
    await this.fillPassword('Password123!');
    await this.fillConfirmPassword('Password123!');
    await this.acceptTerms();
    await this.submitRegistration();
    await this.expectRegisterError('Email already exists');
  }

  // Password strength testing
  async testPasswordStrength(): Promise<void> {
    // Test weak password
    await this.fillPassword('123');
    await expect(this.passwordStrength).toContainText('Weak');
    await expect(this.passwordStrength).toHaveClass(/.*weak.*/);

    // Test medium password
    await this.fillPassword('password123');
    await expect(this.passwordStrength).toContainText('Medium');
    await expect(this.passwordStrength).toHaveClass(/.*medium.*/);

    // Test strong password
    await this.fillPassword('Password123!');
    await expect(this.passwordStrength).toContainText('Strong');
    await expect(this.passwordStrength).toHaveClass(/.*strong.*/);
  }

  async testPasswordRequirements(): Promise<void> {
    await expect(this.passwordRequirements).toBeVisible();
    await expect(this.passwordRequirements).toContainText('At least 8 characters');
    await expect(this.passwordRequirements).toContainText('At least one uppercase letter');
    await expect(this.passwordRequirements).toContainText('At least one lowercase letter');
    await expect(this.passwordRequirements).toContainText('At least one number');
    await expect(this.passwordRequirements).toContainText('At least one special character');
  }

  // Real-time validation testing
  async testRealTimeValidation(): Promise<void> {
    // Test email validation on blur
    await this.fillEmail('invalid');
    await this.nameInput.click(); // Trigger blur
    await this.expectEmailError('Please enter a valid email');

    // Test password match validation
    await this.fillPassword('Password123!');
    await this.fillConfirmPassword('Different');
    await this.nameInput.click(); // Trigger blur
    await this.expectConfirmPasswordError('Passwords do not match');

    // Fix password match
    await this.fillConfirmPassword('Password123!');
    await this.nameInput.click(); // Trigger blur
    await expect(this.confirmPasswordError).not.toBeVisible();
  }

  // Security testing
  async testPasswordVisibilityToggle(): Promise<void> {
    const passwordToggle = this.page.getByTestId('password-visibility-toggle');
    const confirmPasswordToggle = this.page.getByTestId('confirm-password-visibility-toggle');

    // Test password field toggle
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
    await passwordToggle.click();
    await expect(this.passwordInput).toHaveAttribute('type', 'text');
    await passwordToggle.click();
    await expect(this.passwordInput).toHaveAttribute('type', 'password');

    // Test confirm password field toggle
    await expect(this.confirmPasswordInput).toHaveAttribute('type', 'password');
    await confirmPasswordToggle.click();
    await expect(this.confirmPasswordInput).toHaveAttribute('type', 'text');
    await confirmPasswordToggle.click();
    await expect(this.confirmPasswordInput).toHaveAttribute('type', 'password');
  }

  // Rate limiting testing
  async testRateLimiting(): Promise<void> {
    // Attempt multiple rapid registrations
    const user = {
      name: 'Test User',
      email: 'rate@limit.test',
      password: 'Password123!'
    };

    for (let i = 0; i < 6; i++) {
      await this.register(user);
      if (i < 5) {
        // Clear form for next attempt
        await this.page.reload();
        await this.expectFormVisible();
      }
    }

    // Should show rate limit error
    await expect(this.registerError).toBeVisible();
    await expect(this.registerError).toContainText('rate limit');
  }

  // Accessibility testing
  async testKeyboardNavigation(): Promise<void> {
    // Tab through all form fields
    await this.page.keyboard.press('Tab');
    await expect(this.nameInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.emailInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.confirmPasswordInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.termsCheckbox).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.submitButton).toBeFocused();

    // Test form submission with Enter
    await this.page.keyboard.press('Enter');
  }

  async testScreenReaderSupport(): Promise<void> {
    // Check for proper ARIA labels
    await expect(this.nameInput).toHaveAttribute('aria-label');
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.passwordInput).toHaveAttribute('aria-label');
    await expect(this.confirmPasswordInput).toHaveAttribute('aria-label');

    // Check for error announcements
    await expect(this.registerError).toHaveAttribute('role', 'alert');
    
    // Check for password requirements announcement
    await expect(this.passwordRequirements).toHaveAttribute('aria-live', 'polite');
  }

  // Mobile testing
  async testMobileLayout(): Promise<void> {
    await this.setMobileViewport();
    await this.expectFormVisible();

    // Check form is responsive
    const formWidth = await this.registerForm.boundingBox();
    expect(formWidth?.width).toBeLessThan(400);

    // Test touch interactions
    await this.nameInput.tap();
    await expect(this.nameInput).toBeFocused();
  }

  // Performance testing
  async measureRegistrationTime(): Promise<number> {
    const startTime = Date.now();
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
    return Date.now() - startTime;
  }
}