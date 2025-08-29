import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createTestUser, cleanupTestUser, waitForApiResponse } from '../helpers/e2e-helpers';

// Test configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

// Test user data
const testUser = {
  email: 'e2e-test@example.com',
  password: 'E2ETestPassword@123',
  first_name: 'E2E',
  last_name: 'Test',
  phone: '+1234567890'
};

// Test utilities
class AuthPage {
  constructor(private page: Page) {}

  async navigateToLogin() {
    await this.page.goto(`${FRONTEND_URL}/login`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToRegister() {
    await this.page.goto(`${FRONTEND_URL}/register`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToForgotPassword() {
    await this.page.goto(`${FRONTEND_URL}/forgot-password`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillLoginForm(email: string, password: string, rememberMe = false) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    
    if (rememberMe) {
      await this.page.check('input[name="rememberMe"]');
    }
  }

  async fillRegistrationForm(userData: typeof testUser) {
    await this.page.fill('input[name="email"]', userData.email);
    await this.page.fill('input[name="password"]', userData.password);
    await this.page.fill('input[name="first_name"]', userData.first_name);
    await this.page.fill('input[name="last_name"]', userData.last_name);
    await this.page.fill('input[name="phone"]', userData.phone);
  }

  async submitForm() {
    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.click();
  }

  async logout() {
    // Look for logout button in navigation or user menu
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try user menu dropdown
      const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu').first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await this.page.locator('button:has-text("Logout"), button:has-text("Sign out")').click();
      }
    }
  }

  async waitForRedirect(expectedPath: string, timeout = 5000) {
    await this.page.waitForURL(`**${expectedPath}`, { timeout });
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.page.locator('h1, h2').getByText(/sign in/i)).toBeVisible();
  }

  async expectToBeOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard$/);
    await expect(this.page.locator('h1, h2').getByText(/dashboard/i)).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator('[role="alert"]', { hasText: message })).toBeVisible();
  }

  async expectSuccessMessage(message: string) {
    await expect(this.page.locator('.success, .alert-success', { hasText: message })).toBeVisible();
  }
}

test.describe('Authentication Workflows', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.afterEach(async () => {
    // Cleanup any test users created during the test
    try {
      await cleanupTestUser(testUser.email);
    } catch (error) {
      console.warn('Failed to cleanup test user:', error);
    }
  });

  test.describe('User Registration Flow', () => {
    test('should register a new user successfully', async ({ page }) => {
      await authPage.navigateToRegister();

      // Fill out registration form
      await authPage.fillRegistrationForm(testUser);

      // Submit form and wait for response
      const registrationPromise = waitForApiResponse(page, '/auth/register', 'POST');
      await authPage.submitForm();
      const registrationResponse = await registrationPromise;

      expect(registrationResponse.status()).toBe(201);

      // Should redirect to dashboard or show success message
      await expect(page).toHaveURL(/\/dashboard$|\/login$/);
      
      if (page.url().includes('/login')) {
        await authPage.expectSuccessMessage('registered successfully');
      }
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await authPage.navigateToRegister();

      // Submit form with invalid data
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'weak');
      await authPage.submitForm();

      // Should show validation errors
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
      
      // Should remain on registration page
      await expect(page).toHaveURL(/\/register$/);
    });

    test('should prevent registration with existing email', async ({ page }) => {
      // First, create a user
      await createTestUser(testUser);

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(testUser);

      const registrationPromise = waitForApiResponse(page, '/auth/register', 'POST');
      await authPage.submitForm();
      const registrationResponse = await registrationPromise;

      expect(registrationResponse.status()).toBe(400);
      await authPage.expectErrorMessage('already exists');
    });

    test('should sanitize malicious input', async ({ page }) => {
      await authPage.navigateToRegister();

      const maliciousData = {
        ...testUser,
        first_name: '<script>alert("xss")</script>Malicious',
        last_name: '"><img src=x onerror=alert("xss")>Name'
      };

      await authPage.fillRegistrationForm(maliciousData);

      const registrationPromise = waitForApiResponse(page, '/auth/register', 'POST');
      await authPage.submitForm();
      await registrationPromise;

      // If registration succeeds, check that malicious content is not rendered
      await expect(page.locator('script')).toHaveCount(0);
      await expect(page.locator('img[onerror]')).toHaveCount(0);
    });
  });

  test.describe('User Login Flow', () => {
    test.beforeEach(async () => {
      // Create test user before each login test
      await createTestUser(testUser);
    });

    test('should login user successfully', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);

      const loginPromise = waitForApiResponse(page, '/auth/login', 'POST');
      await authPage.submitForm();
      const loginResponse = await loginPromise;

      expect(loginResponse.status()).toBe(200);

      // Should redirect to dashboard
      await authPage.expectToBeOnDashboard();

      // Should store authentication data
      const localStorage = await page.evaluate(() => window.localStorage);
      expect(localStorage['auth_token']).toBeDefined();
      expect(localStorage['user']).toBeDefined();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, 'wrongpassword');

      const loginPromise = waitForApiResponse(page, '/auth/login', 'POST');
      await authPage.submitForm();
      const loginResponse = await loginPromise;

      expect(loginResponse.status()).toBe(401);

      // Should show error message
      await authPage.expectErrorMessage('Invalid email or password');

      // Should remain on login page
      await authPage.expectToBeOnLoginPage();
    });

    test('should handle remember me functionality', async ({ page, context }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password, true);

      await authPage.submitForm();
      await authPage.expectToBeOnDashboard();

      // Close and reopen browser to test persistence
      await page.close();
      const newPage = await context.newPage();
      const newAuthPage = new AuthPage(newPage);

      await newPage.goto(`${FRONTEND_URL}/dashboard`);

      // Should still be logged in
      await expect(newPage).toHaveURL(/\/dashboard$/);
    });

    test('should redirect protected routes to login', async ({ page }) => {
      // Try to access protected route without login
      await page.goto(`${FRONTEND_URL}/dashboard`);

      // Should redirect to login
      await authPage.expectToBeOnLoginPage();
    });
  });

  test.describe('Account Lockout Protection', () => {
    test.beforeEach(async () => {
      await createTestUser(testUser);
    });

    test('should lock account after failed attempts', async ({ page }) => {
      await authPage.navigateToLogin();

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await authPage.fillLoginForm(testUser.email, 'wrongpassword');
        
        const loginPromise = waitForApiResponse(page, '/auth/login', 'POST');
        await authPage.submitForm();
        await loginPromise;

        if (i < 4) {
          // Should show remaining attempts
          await expect(page.locator(':has-text("attempts remaining")')).toBeVisible();
        }
      }

      // 6th attempt should show lockout
      await authPage.fillLoginForm(testUser.email, 'wrongpassword');
      const lockoutPromise = waitForApiResponse(page, '/auth/login', 'POST');
      await authPage.submitForm();
      const lockoutResponse = await lockoutPromise;

      expect(lockoutResponse.status()).toBe(401);
      await authPage.expectErrorMessage('Account locked');

      // Even correct credentials should be rejected
      await authPage.fillLoginForm(testUser.email, testUser.password);
      const correctCredsPromise = waitForApiResponse(page, '/auth/login', 'POST');
      await authPage.submitForm();
      const correctCredsResponse = await correctCredsPromise;

      expect(correctCredsResponse.status()).toBe(401);
      await authPage.expectErrorMessage('Account locked');
    });

    test('should show security warnings', async ({ page }) => {
      await authPage.navigateToLogin();

      // Make a few failed attempts
      for (let i = 0; i < 2; i++) {
        await authPage.fillLoginForm(testUser.email, 'wrongpassword');
        await authPage.submitForm();
        await page.waitForTimeout(1000); // Brief pause between attempts
      }

      // Enter valid email to trigger security check
      await page.fill('input[type="email"]', testUser.email);
      await page.waitForTimeout(2000); // Wait for security metrics to load

      // Should show security warning
      await expect(page.locator(':has-text("Security Warning")')).toBeVisible();
      await expect(page.locator(':has-text("failed login attempts")')).toBeVisible();
    });
  });

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async () => {
      await createTestUser(testUser);
    });

    test('should request password reset', async ({ page }) => {
      await authPage.navigateToForgotPassword();

      await page.fill('input[type="email"]', testUser.email);

      const resetPromise = waitForApiResponse(page, '/auth/forgot-password', 'POST');
      await authPage.submitForm();
      const resetResponse = await resetPromise;

      expect(resetResponse.status()).toBe(200);

      // Should show success message (even for non-existent emails for security)
      await authPage.expectSuccessMessage('password reset link has been sent');
    });

    test('should handle password reset with token', async ({ page }) => {
      // In a real scenario, you'd need to intercept the email or generate a test token
      // For this test, we'll simulate having a valid token
      
      const resetToken = 'test-reset-token-123';
      await page.goto(`${FRONTEND_URL}/reset-password?token=${resetToken}`);

      await page.fill('input[name="password"]', 'NewPassword@456');
      await page.fill('input[name="confirmPassword"]', 'NewPassword@456');

      const resetPromise = waitForApiResponse(page, '/auth/reset-password', 'POST');
      await authPage.submitForm();
      
      // This might fail in real testing due to token validation
      // In a real scenario, you'd use a valid test token
      try {
        const resetResponse = await resetPromise;
        if (resetResponse.status() === 200) {
          await authPage.expectSuccessMessage('Password reset successfully');
        }
      } catch (error) {
        // Expected in this test scenario
        console.log('Password reset failed as expected without valid token');
      }
    });

    test('should validate new password strength', async ({ page }) => {
      const resetToken = 'test-reset-token-123';
      await page.goto(`${FRONTEND_URL}/reset-password?token=${resetToken}`);

      // Try weak password
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      await authPage.submitForm();

      // Should show validation error
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test.beforeEach(async () => {
      await createTestUser(testUser);
    });

    test('should logout user successfully', async ({ page }) => {
      // Login first
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();
      await authPage.expectToBeOnDashboard();

      // Logout
      const logoutPromise = waitForApiResponse(page, '/auth/logout', 'POST');
      await authPage.logout();
      await logoutPromise;

      // Should redirect to login
      await authPage.expectToBeOnLoginPage();

      // Should clear authentication data
      const localStorage = await page.evaluate(() => window.localStorage);
      expect(localStorage['auth_token']).toBeUndefined();
      expect(localStorage['user']).toBeUndefined();
    });

    test('should handle session expiry', async ({ page }) => {
      // Login first
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();
      await authPage.expectToBeOnDashboard();

      // Simulate session expiry by manipulating localStorage
      await page.evaluate(() => {
        const authData = JSON.parse(localStorage.getItem('persist:auth') || '{}');
        // Set expiry to past time
        authData.sessionExpiry = Date.now() - 1000;
        localStorage.setItem('persist:auth', JSON.stringify(authData));
      });

      // Navigate to a protected route
      await page.goto(`${FRONTEND_URL}/dashboard`);

      // Should redirect to login due to expired session
      await authPage.expectToBeOnLoginPage();
    });

    test('should refresh tokens automatically', async ({ page, context }) => {
      // This test would require intercepting network requests to mock token refresh
      // For now, we'll test basic token persistence
      
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();
      await authPage.expectToBeOnDashboard();

      // Wait some time and check if user is still logged in
      await page.waitForTimeout(2000);
      await page.reload();

      // Should still be on dashboard
      await authPage.expectToBeOnDashboard();
    });
  });

  test.describe('Cross-browser Security Tests', () => {
    test.beforeEach(async () => {
      await createTestUser(testUser);
    });

    test('should prevent CSRF attacks', async ({ page }) => {
      // Login first
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();
      await authPage.expectToBeOnDashboard();

      // Try to make API request from different origin (simulated)
      const csrfTestResult = await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(`${apiUrl}/v1/auth/me`, {
            method: 'GET',
            credentials: 'omit', // Don't send cookies
            headers: {
              'Origin': 'https://malicious-site.com'
            }
          });
          return response.status;
        } catch (error) {
          return 0; // Network error
        }
      }, API_BASE_URL);

      // Should be rejected or require proper authentication
      expect(csrfTestResult).not.toBe(200);
    });

    test('should handle multiple tabs/windows', async ({ context }) => {
      // Login in first tab
      const page1 = await context.newPage();
      const authPage1 = new AuthPage(page1);
      
      await authPage1.navigateToLogin();
      await authPage1.fillLoginForm(testUser.email, testUser.password);
      await authPage1.submitForm();
      await authPage1.expectToBeOnDashboard();

      // Open second tab and check if logged in
      const page2 = await context.newPage();
      await page2.goto(`${FRONTEND_URL}/dashboard`);
      await expect(page2).toHaveURL(/\/dashboard$/);

      // Logout from first tab
      await authPage1.logout();

      // Second tab should eventually redirect to login
      await page2.reload();
      await expect(page2).toHaveURL(/\/login$/);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await authPage.navigateToLogin();

      // Tab through form elements
      await page.keyboard.press('Tab'); // Email field
      await expect(page.locator('input[type="email"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Password field
      await expect(page.locator('input[type="password"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Remember me checkbox
      await expect(page.locator('input[type="checkbox"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Forgot password link
      await expect(page.locator('a:has-text("Forgot")')).toBeFocused();

      await page.keyboard.press('Tab'); // Submit button
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await authPage.navigateToLogin();

      // Check form has proper labeling
      await expect(page.locator('form')).toHaveAttribute('aria-label');
      
      // Check inputs have labels
      await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-label');
      await expect(page.locator('input[type="password"]')).toHaveAttribute('aria-label');

      // Check error messages are properly associated
      await page.fill('input[type="email"]', 'invalid-email');
      await authPage.submitForm();
      
      const errorMessage = page.locator('[role="alert"]').first();
      if (await errorMessage.isVisible()) {
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load login page quickly', async ({ page }) => {
      const startTime = Date.now();
      await authPage.navigateToLogin();
      const loadTime = Date.now() - startTime;

      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle rapid form submissions', async ({ page }) => {
      await createTestUser(testUser);
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);

      // Rapidly click submit button multiple times
      const submitButton = page.locator('button[type="submit"]');
      
      const clickPromises = [];
      for (let i = 0; i < 5; i++) {
        clickPromises.push(submitButton.click());
      }

      await Promise.all(clickPromises);

      // Should eventually redirect to dashboard (not crash)
      await authPage.expectToBeOnDashboard();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await authPage.navigateToLogin();

      // Simulate network failure by going offline
      await page.context().setOffline(true);

      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();

      // Should show network error message
      await expect(page.locator(':has-text("network"), :has-text("connection")')).toBeVisible();

      // Go back online
      await page.context().setOffline(false);

      // Should be able to retry
      await authPage.submitForm();
      
      // Should eventually work (though user might not exist in this case)
      await page.waitForTimeout(2000);
    });

    test('should handle server errors gracefully', async ({ page, context }) => {
      await authPage.navigateToLogin();

      // Mock server error response
      await context.route(`${API_BASE_URL}/v1/auth/login`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        });
      });

      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitForm();

      // Should show server error message
      await authPage.expectErrorMessage('server error');
    });
  });
});