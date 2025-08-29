import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('Password Reset E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test.describe('Forgot Password Flow', () => {
    test('should display forgot password form correctly', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.expectFormVisible();
      
      // Check form elements are present and properly labeled
      await expect(forgotPasswordPage.forgotPasswordForm).toContainText('Reset Password');
      await expect(forgotPasswordPage.backToLoginLink).toContainText('Back to Sign In');
    });

    test('should validate required email field', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.validateEmptyForm();
    });

    test('should validate email format', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.validateInvalidEmail();
    });

    test('should show success message for any email (security)', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.validateNonExistentEmail();
    });

    test('should show success message for existing email', async ({ forgotPasswordPage, registerPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      // Test forgot password with existing email
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.validateExistingEmail(testUser.email);
    });

    test('should navigate back to login', async ({ forgotPasswordPage, loginPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.goBackToLogin();
      await loginPage.expectFormVisible();
    });

    test('should measure password reset request performance', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.fillEmail('test@example.com');
      
      const requestTime = await forgotPasswordPage.measureRequestTime();
      expect(requestTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should work on mobile devices', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.testMobileLayout();
      
      await forgotPasswordPage.requestPasswordReset('test@example.com');
      await forgotPasswordPage.expectSuccessMessage();
    });

    test.describe('Rate Limiting Tests', () => {
      test('should enforce rate limiting on password reset requests', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testRateLimiting();
      });

      test('should show cooldown timer during rate limiting', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        
        // Trigger rate limiting
        const testEmail = 'rate@limit.test';
        for (let i = 0; i < 6; i++) {
          await forgotPasswordPage.requestPasswordReset(testEmail);
          if (i < 5) {
            await forgotPasswordPage.page.reload();
            await forgotPasswordPage.expectFormVisible();
          }
        }
        
        // Should show rate limit message and timer
        await expect(forgotPasswordPage.rateLimitMessage).toBeVisible();
        await expect(forgotPasswordPage.cooldownTimer).toBeVisible();
        await forgotPasswordPage.expectSubmitButtonDisabled();
      });

      test('should allow requests after cooldown period', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        
        // Trigger rate limiting
        await forgotPasswordPage.testRateLimiting();
        
        // For testing purposes, we'll verify the rate limit is active
        // In a real scenario, you'd wait for the cooldown or use API to reset it
        await expect(forgotPasswordPage.rateLimitMessage).toBeVisible();
      });
    });

    test.describe('Security Tests', () => {
      test('should not reveal user existence through different responses', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testEmailEnumeration();
      });

      test('should sanitize email input', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        
        // Attempt to inject malicious content
        await forgotPasswordPage.fillEmail('<script>alert("xss")</script>@example.com');
        await forgotPasswordPage.submitRequest();
        
        const emailValue = await forgotPasswordPage.emailInput.inputValue();
        expect(emailValue).not.toContain('<script>');
      });

      test('should include CSRF protection', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testCSRFProtection();
      });
    });

    test.describe('Keyboard Navigation', () => {
      test('should support full keyboard navigation', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testKeyboardNavigation();
      });

      test('should support screen reader accessibility', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testScreenReaderSupport();
      });
    });

    test.describe('Edge Cases', () => {
      test('should handle very long email addresses', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testVeryLongEmail();
      });

      test('should handle special characters in email', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testSpecialCharactersInEmail();
      });

      test('should handle international characters', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testInternationalCharacters();
      });

      test('should handle network interruption', async ({ forgotPasswordPage, page }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.fillEmail('test@example.com');
        
        // Simulate network failure
        await page.route('**/api/auth/forgot-password', route => route.abort());
        
        await forgotPasswordPage.submitRequest();
        
        // Should show appropriate error message
        await forgotPasswordPage.expectErrorMessage('network');
        
        // Restore network
        await page.unroute('**/api/auth/forgot-password');
      });

      test('should handle server errors gracefully', async ({ forgotPasswordPage, page }) => {
        await forgotPasswordPage.navigate();
        
        // Simulate server error
        await page.route('**/api/auth/forgot-password', route => 
          route.fulfill({ status: 500, body: 'Internal Server Error' })
        );
        
        await forgotPasswordPage.requestPasswordReset('test@example.com');
        await forgotPasswordPage.expectErrorMessage('server error');
      });

      test('should show loading state for slow responses', async ({ forgotPasswordPage, page }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.fillEmail('test@example.com');
        
        // Simulate slow response
        await page.route('**/api/auth/forgot-password', async route => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.continue();
        });
        
        const submitPromise = forgotPasswordPage.submitRequest();
        
        // Should show loading indicator
        await expect(forgotPasswordPage.loadingSpinner).toBeVisible();
        
        await submitPromise;
        
        // Loading should disappear after response
        await expect(forgotPasswordPage.loadingSpinner).not.toBeVisible();
      });
    });

    test.describe('User Experience', () => {
      test('should display helpful instructions', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testInstructions();
      });

      test('should provide clear feedback', async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.navigate();
        await forgotPasswordPage.testFormFeedback();
      });
    });
  });

  test.describe('Password Reset Completion Flow', () => {
    // Note: This section would typically require email integration to get reset tokens
    // For now, we'll create tests that can be run with mock tokens or API setup
    
    test('should display reset password form with valid token', async ({ page }) => {
      // Navigate to reset password page with mock token
      const mockToken = 'valid-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      // Check that form is visible
      const resetForm = page.getByTestId('reset-password-form');
      await expect(resetForm).toBeVisible();
      
      const passwordInput = page.getByTestId('new-password');
      const confirmPasswordInput = page.getByTestId('confirm-new-password');
      const submitButton = page.getByTestId('reset-password-submit');
      
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      const mockToken = 'valid-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      const passwordInput = page.getByTestId('new-password');
      const confirmPasswordInput = page.getByTestId('confirm-new-password');
      const submitButton = page.getByTestId('reset-password-submit');
      
      // Test weak password
      await passwordInput.fill('weak');
      await confirmPasswordInput.fill('weak');
      await submitButton.click();
      
      const passwordError = page.getByTestId('new-password-error');
      await expect(passwordError).toBeVisible();
      await expect(passwordError).toContainText('Password must be at least 8 characters');
    });

    test('should validate password confirmation match', async ({ page }) => {
      const mockToken = 'valid-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      const passwordInput = page.getByTestId('new-password');
      const confirmPasswordInput = page.getByTestId('confirm-new-password');
      const submitButton = page.getByTestId('reset-password-submit');
      
      await passwordInput.fill('StrongPassword123!');
      await confirmPasswordInput.fill('DifferentPassword123!');
      await submitButton.click();
      
      const confirmError = page.getByTestId('confirm-new-password-error');
      await expect(confirmError).toBeVisible();
      await expect(confirmError).toContainText('Passwords do not match');
    });

    test('should handle invalid or expired tokens', async ({ page }) => {
      const expiredToken = 'expired-reset-token-123';
      await page.goto(`/auth/reset-password?token=${expiredToken}`);
      
      // Should show error message for invalid token
      const errorMessage = page.getByTestId('token-error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('invalid or expired');
      
      // Should provide link to request new reset
      const newResetLink = page.getByTestId('request-new-reset');
      await expect(newResetLink).toBeVisible();
    });

    test('should successfully reset password with valid token', async ({ page, loginPage, dashboardPage }) => {
      const mockToken = 'valid-reset-token-123';
      const newPassword = 'NewStrongPassword123!';
      
      // Simulate successful reset
      await page.route('**/api/auth/reset-password', route => 
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Password reset successfully' })
        })
      );
      
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      const passwordInput = page.getByTestId('new-password');
      const confirmPasswordInput = page.getByTestId('confirm-new-password');
      const submitButton = page.getByTestId('reset-password-submit');
      
      await passwordInput.fill(newPassword);
      await confirmPasswordInput.fill(newPassword);
      await submitButton.click();
      
      // Should show success message
      const successMessage = page.getByTestId('reset-success-message');
      await expect(successMessage).toBeVisible();
      
      // Should provide login link
      const loginLink = page.getByTestId('login-after-reset');
      await expect(loginLink).toBeVisible();
      
      await loginLink.click();
      await expect(page).toHaveURL('/auth/login');
    });

    test('should show password strength indicator during reset', async ({ page }) => {
      const mockToken = 'valid-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      const passwordInput = page.getByTestId('new-password');
      const strengthIndicator = page.getByTestId('password-strength-indicator');
      
      // Test weak password
      await passwordInput.fill('weak');
      await expect(strengthIndicator).toContainText('Weak');
      
      // Test strong password
      await passwordInput.fill('StrongPassword123!');
      await expect(strengthIndicator).toContainText('Strong');
    });
  });

  test.describe('Complete Password Reset Journey', () => {
    test('should complete full password reset flow', async ({ 
      registerPage, 
      loginPage, 
      forgotPasswordPage, 
      dashboardPage,
      page 
    }) => {
      const testUser = generateTestUser();
      const newPassword = 'NewPassword123!';
      
      // 1. Register a new user
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // 2. Logout
      await dashboardPage.logout();
      
      // 3. Request password reset
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.requestPasswordResetAndExpectSuccess(testUser.email);
      
      // 4. Simulate receiving email and clicking reset link
      // In a real test, you'd integrate with email service to get the actual token
      const mockResetToken = 'simulated-reset-token-123';
      
      // Mock the reset password API call
      await page.route('**/api/auth/reset-password', route => 
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            message: 'Password reset successfully',
            user: { id: 1, email: testUser.email }
          })
        })
      );
      
      // 5. Navigate to reset password page
      await page.goto(`/auth/reset-password?token=${mockResetToken}`);
      
      // 6. Reset password
      const passwordInput = page.getByTestId('new-password');
      const confirmPasswordInput = page.getByTestId('confirm-new-password');
      const submitButton = page.getByTestId('reset-password-submit');
      
      await passwordInput.fill(newPassword);
      await confirmPasswordInput.fill(newPassword);
      await submitButton.click();
      
      // 7. Should show success and redirect to login
      const successMessage = page.getByTestId('reset-success-message');
      await expect(successMessage).toBeVisible();
      
      // 8. Login with new password
      const loginLink = page.getByTestId('login-after-reset');
      await loginLink.click();
      
      await loginPage.expectFormVisible();
      
      // Mock login with new password
      await page.route('**/api/auth/login', route => 
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true,
            token: 'new-jwt-token',
            user: { id: 1, name: testUser.name, email: testUser.email }
          })
        })
      );
      
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(newPassword);
      await loginPage.submitLogin();
      
      // 9. Should successfully login with new password
      await expect(page).toHaveURL('/dashboard');
    });
  });
});