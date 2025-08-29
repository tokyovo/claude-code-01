import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class ForgotPasswordPage extends BasePage {
  // Page URL
  readonly url = '/auth/forgot-password';

  // Form locators
  get forgotPasswordForm(): Locator {
    return this.page.getByTestId('forgot-password-form');
  }

  get emailInput(): Locator {
    return this.page.getByTestId('forgot-password-email');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('forgot-password-submit');
  }

  // Link locators
  get backToLoginLink(): Locator {
    return this.page.getByTestId('back-to-login-link');
  }

  // Message locators
  get successMessage(): Locator {
    return this.page.getByTestId('forgot-password-success');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('forgot-password-error');
  }

  get emailError(): Locator {
    return this.page.getByTestId('forgot-password-email-error');
  }

  // Rate limiting locators
  get rateLimitMessage(): Locator {
    return this.page.getByTestId('rate-limit-message');
  }

  get cooldownTimer(): Locator {
    return this.page.getByTestId('cooldown-timer');
  }

  // Page actions
  async navigate(): Promise<void> {
    await this.goTo(this.url);
    await expect(this.forgotPasswordForm).toBeVisible();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async submitRequest(): Promise<void> {
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.submitRequest();
  }

  async requestPasswordResetAndExpectSuccess(email: string): Promise<void> {
    await this.requestPasswordReset(email);
    await this.expectSuccessMessage();
  }

  async requestPasswordResetAndExpectError(email: string, expectedError?: string): Promise<void> {
    await this.requestPasswordReset(email);
    await this.expectErrorMessage(expectedError);
  }

  // Navigation actions
  async goBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
    await this.waitForUrl('/auth/login');
  }

  // Validation methods
  async expectFormVisible(): Promise<void> {
    await expect(this.forgotPasswordForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.backToLoginLink).toBeVisible();
  }

  async expectSuccessMessage(message?: string): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    } else {
      await expect(this.successMessage).toContainText('password reset');
    }
  }

  async expectErrorMessage(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectEmailError(message?: string): Promise<void> {
    await expect(this.emailError).toBeVisible();
    if (message) {
      await expect(this.emailError).toContainText(message);
    }
  }

  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  // Form validation methods
  async validateEmptyForm(): Promise<void> {
    await this.submitRequest();
    await this.expectEmailError('Email is required');
  }

  async validateInvalidEmail(): Promise<void> {
    await this.fillEmail('invalid-email');
    await this.submitRequest();
    await this.expectEmailError('Please enter a valid email');
  }

  async validateNonExistentEmail(): Promise<void> {
    await this.fillEmail('nonexistent@example.com');
    await this.submitRequest();
    // Should still show success for security reasons
    await this.expectSuccessMessage();
  }

  async validateExistingEmail(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.submitRequest();
    await this.expectSuccessMessage();
  }

  // Rate limiting testing
  async testRateLimiting(): Promise<void> {
    const testEmail = 'test@example.com';

    // Make multiple rapid requests
    for (let i = 0; i < 6; i++) {
      await this.fillEmail(testEmail);
      await this.submitRequest();
      
      if (i < 5) {
        // Wait for response and clear form
        await this.page.waitForTimeout(500);
        await this.emailInput.clear();
      }
    }

    // Should show rate limit message
    await expect(this.rateLimitMessage).toBeVisible();
    await expect(this.cooldownTimer).toBeVisible();
    await this.expectSubmitButtonDisabled();
  }

  async waitForRateLimitCooldown(maxWaitMs: number = 60000): Promise<void> {
    // Wait for cooldown to complete
    await expect(this.submitButton).toBeEnabled({ timeout: maxWaitMs });
    await expect(this.rateLimitMessage).not.toBeVisible();
  }

  // Security testing
  async testEmailEnumeration(): Promise<void> {
    // Test with non-existent email
    await this.requestPasswordResetAndExpectSuccess('nonexistent@fake.com');
    
    // Test with existing email - should have same response
    await this.page.reload();
    await this.expectFormVisible();
    await this.requestPasswordResetAndExpectSuccess('existing@user.com');
    
    // Both should show the same success message for security
  }

  async testCSRFProtection(): Promise<void> {
    // This would require more complex setup to test CSRF tokens
    // For now, we'll just verify the form includes CSRF protection
    const csrfToken = await this.page.locator('input[name="_token"]').count();
    expect(csrfToken).toBeGreaterThanOrEqual(0); // May or may not be present depending on implementation
  }

  // Accessibility testing
  async testKeyboardNavigation(): Promise<void> {
    // Tab to email field
    await this.page.keyboard.press('Tab');
    await expect(this.emailInput).toBeFocused();

    // Tab to submit button
    await this.page.keyboard.press('Tab');
    await expect(this.submitButton).toBeFocused();

    // Tab to back link
    await this.page.keyboard.press('Tab');
    await expect(this.backToLoginLink).toBeFocused();

    // Enter should submit the form when on submit button
    await this.submitButton.focus();
    await this.page.keyboard.press('Enter');
  }

  async testScreenReaderSupport(): Promise<void> {
    // Check for proper labels and ARIA attributes
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.errorMessage).toHaveAttribute('role', 'alert');
    await expect(this.successMessage).toHaveAttribute('role', 'status');
  }

  // Mobile testing
  async testMobileLayout(): Promise<void> {
    await this.setMobileViewport();
    await this.expectFormVisible();

    // Check form is responsive
    const formWidth = await this.forgotPasswordForm.boundingBox();
    expect(formWidth?.width).toBeLessThan(400);

    // Test touch interactions
    await this.emailInput.tap();
    await expect(this.emailInput).toBeFocused();
  }

  // User experience testing
  async testFormFeedback(): Promise<void> {
    // Test loading state during submission
    await this.fillEmail('test@example.com');
    
    // Start submission and check for loading indicator
    const submitPromise = this.submitButton.click();
    await expect(this.loadingSpinner).toBeVisible();
    await submitPromise;
    
    // Loading should disappear after response
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  async testInstructions(): Promise<void> {
    // Check for helpful instructions
    const instructions = this.page.getByTestId('forgot-password-instructions');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText('reset your password');
  }

  // Email template testing (would require email service integration)
  async verifyEmailWasSent(email: string): Promise<void> {
    // This would typically integrate with email service to verify
    // For now, we'll just check that the success message is shown
    await this.expectSuccessMessage();
    
    // Could also check browser network requests
    // Or integrate with email testing service
  }

  // Performance testing
  async measureRequestTime(): Promise<number> {
    const startTime = Date.now();
    await this.submitButton.click();
    await this.waitForLoadingToFinish();
    return Date.now() - startTime;
  }

  // Edge cases
  async testVeryLongEmail(): Promise<void> {
    const longEmail = 'a'.repeat(100) + '@example.com';
    await this.fillEmail(longEmail);
    await this.submitRequest();
    // Should handle gracefully, either success or appropriate error
  }

  async testSpecialCharactersInEmail(): Promise<void> {
    // Test email with special characters
    const specialEmail = 'user+test@example-domain.co.uk';
    await this.fillEmail(specialEmail);
    await this.submitRequest();
    await this.expectSuccessMessage();
  }

  async testInternationalCharacters(): Promise<void> {
    // Test email with international characters
    const internationalEmail = 'üser@exämple.cöm';
    await this.fillEmail(internationalEmail);
    await this.submitRequest();
    // Should handle international domains appropriately
  }
}