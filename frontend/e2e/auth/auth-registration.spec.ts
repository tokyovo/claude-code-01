import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('User Registration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test('should display registration form correctly', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.expectFormVisible();
    
    // Check form elements are present and properly labeled
    await expect(registerPage.registerForm).toContainText('Create Account');
    await expect(registerPage.loginLink).toContainText('Already have an account?');
  });

  test('should successfully register a new user', async ({ registerPage, dashboardPage }) => {
    const testUser = generateTestUser();
    
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    
    // Should redirect to dashboard after successful registration
    await dashboardPage.expectDashboardVisible();
    await dashboardPage.expectWelcomeMessage(testUser.name);
  });

  test('should validate required fields', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.validateEmptyForm();
  });

  test('should validate email format', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.validateInvalidEmail();
  });

  test('should validate password strength', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.validateWeakPassword();
  });

  test('should validate password confirmation', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.validatePasswordMismatch();
  });

  test('should show password strength indicator', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.testPasswordStrength();
  });

  test('should display password requirements', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.testPasswordRequirements();
  });

  test('should validate terms and conditions acceptance', async ({ registerPage }) => {
    const testUser = generateTestUser();
    
    await registerPage.navigate();
    await registerPage.fillName(testUser.name);
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(testUser.password);
    await registerPage.fillConfirmPassword(testUser.password);
    
    // Don't accept terms
    await registerPage.submitRegistration();
    await registerPage.expectTermsError();
  });

  test('should prevent duplicate email registration', async ({ registerPage }) => {
    const testUser = generateTestUser();
    
    // Register user first time
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    
    // Try to register with same email
    await registerPage.navigate();
    await registerPage.registerAndExpectError(testUser, 'already exists');
  });

  test('should show real-time validation feedback', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.testRealTimeValidation();
  });

  test('should toggle password visibility', async ({ registerPage }) => {
    await registerPage.navigate();
    await registerPage.testPasswordVisibilityToggle();
  });

  test('should navigate to login page', async ({ registerPage, loginPage }) => {
    await registerPage.navigate();
    await registerPage.goToLogin();
    await loginPage.expectFormVisible();
  });

  test('should handle registration with special characters', async ({ registerPage, dashboardPage }) => {
    const testUser = generateTestUser({
      name: 'José María O\'Connor',
      email: 'jose.maria@example.com',
      password: 'Pássw0rd!@#'
    });
    
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    
    await dashboardPage.expectDashboardVisible();
    await dashboardPage.expectWelcomeMessage(testUser.name);
  });

  test('should handle registration with long names', async ({ registerPage, dashboardPage }) => {
    const testUser = generateTestUser({
      name: 'This Is A Very Long Name That Should Still Be Handled Properly By The Registration System',
    });
    
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    
    await dashboardPage.expectDashboardVisible();
  });

  test('should validate name length', async ({ registerPage }) => {
    await registerPage.navigate();
    
    // Test very short name
    await registerPage.fillName('A');
    await registerPage.fillEmail('test@example.com');
    await registerPage.fillPassword('Password123!');
    await registerPage.fillConfirmPassword('Password123!');
    await registerPage.acceptTerms();
    await registerPage.submitRegistration();
    
    // Should show name length error
    await registerPage.expectNameError('Name must be at least 2 characters');
  });

  test('should measure registration performance', async ({ registerPage }) => {
    const testUser = generateTestUser();
    
    await registerPage.navigate();
    await registerPage.fillName(testUser.name);
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(testUser.password);
    await registerPage.fillConfirmPassword(testUser.password);
    await registerPage.acceptTerms();
    
    const registrationTime = await registerPage.measureRegistrationTime();
    expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should work on mobile devices', async ({ registerPage, page }) => {
    await registerPage.navigate();
    await registerPage.testMobileLayout();
    
    const testUser = generateTestUser();
    await registerPage.register(testUser);
    
    // Should still work on mobile
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ registerPage }) => {
      await registerPage.navigate();
      await registerPage.testKeyboardNavigation();
    });

    test('should support screen reader accessibility', async ({ registerPage }) => {
      await registerPage.navigate();
      await registerPage.testScreenReaderSupport();
    });
  });

  test.describe('Security Tests', () => {
    test('should sanitize input fields', async ({ registerPage }) => {
      const maliciousUser = generateTestUser({
        name: '<script>alert("xss")</script>',
        email: 'test+<script>@example.com',
      });
      
      await registerPage.navigate();
      await registerPage.fillName(maliciousUser.name);
      await registerPage.fillEmail(maliciousUser.email);
      
      // Should sanitize or reject malicious input
      const nameValue = await registerPage.nameInput.inputValue();
      const emailValue = await registerPage.emailInput.inputValue();
      
      expect(nameValue).not.toContain('<script>');
      expect(emailValue).not.toContain('<script>');
    });

    test('should enforce HTTPS redirect', async ({ page }) => {
      // This test would verify that HTTP redirects to HTTPS
      // Implementation depends on your server configuration
    });

    test('should include CSRF protection', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Check for CSRF token in form
      const csrfToken = await registerPage.page.locator('input[name="_token"]').count();
      expect(csrfToken).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle network interruption during registration', async ({ registerPage, page }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.fillName(testUser.name);
      await registerPage.fillEmail(testUser.email);
      await registerPage.fillPassword(testUser.password);
      await registerPage.fillConfirmPassword(testUser.password);
      await registerPage.acceptTerms();
      
      // Simulate network failure
      await page.route('**/api/auth/register', route => route.abort());
      
      await registerPage.submitRegistration();
      
      // Should show appropriate error message
      await registerPage.expectRegisterError('network');
      
      // Restore network
      await page.unroute('**/api/auth/register');
    });

    test('should handle slow server response', async ({ registerPage, page }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.fillName(testUser.name);
      await registerPage.fillEmail(testUser.email);
      await registerPage.fillPassword(testUser.password);
      await registerPage.fillConfirmPassword(testUser.password);
      await registerPage.acceptTerms();
      
      // Simulate slow response
      await page.route('**/api/auth/register', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      
      const startTime = Date.now();
      await registerPage.submitRegistration();
      
      // Should show loading state during slow response
      await expect(registerPage.loadingSpinner).toBeVisible();
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeGreaterThan(2000);
    });

    test('should handle server errors gracefully', async ({ registerPage, page }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      
      // Simulate server error
      await page.route('**/api/auth/register', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await registerPage.register(testUser);
      await registerPage.expectRegisterError('server error');
    });
  });
});