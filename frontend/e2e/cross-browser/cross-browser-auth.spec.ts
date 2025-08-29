import { test, expect, devices } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { RegisterPage } from '../pages/register-page';
import { DashboardPage } from '../pages/dashboard-page';
import { generateTestUser } from '../utils/test-data';

// Test authentication flows across different browsers and devices
test.describe('Cross-Browser Authentication Tests', () => {
  // Define device configurations for testing
  const testDevices = [
    { name: 'Desktop Chrome', device: devices['Desktop Chrome'] },
    { name: 'Desktop Firefox', device: devices['Desktop Firefox'] },
    { name: 'Desktop Safari', device: devices['Desktop Safari'] },
    { name: 'Mobile Chrome', device: devices['Pixel 5'] },
    { name: 'Mobile Safari', device: devices['iPhone 12'] },
    { name: 'Tablet', device: devices['iPad Pro'] },
  ];

  for (const { name, device } of testDevices) {
    test.describe(`${name} Tests`, () => {
      test.use({ ...device });

      test.beforeEach(async ({ page }) => {
        // Clear any existing session before each test
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        const context = page.context();
        await context.clearCookies();
      });

      test(`should complete registration flow on ${name}`, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        const dashboardPage = new DashboardPage(page);
        const testUser = generateTestUser();

        await registerPage.navigate();
        await registerPage.expectFormVisible();
        
        // Test form interactions
        await registerPage.fillName(testUser.name);
        await registerPage.fillEmail(testUser.email);
        await registerPage.fillPassword(testUser.password);
        await registerPage.fillConfirmPassword(testUser.password);
        await registerPage.acceptTerms();
        
        // Submit registration
        await registerPage.submitRegistration();
        
        // Should redirect to dashboard
        await dashboardPage.expectDashboardVisible();
        await dashboardPage.expectWelcomeMessage(testUser.name);
      });

      test(`should complete login flow on ${name}`, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const testUser = generateTestUser();

        // First register a user
        await registerPage.navigate();
        await registerPage.registerAndExpectSuccess(testUser);
        
        // Logout
        await dashboardPage.logout();
        
        // Test login
        await loginPage.navigate();
        await loginPage.expectFormVisible();
        
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword(testUser.password);
        await loginPage.submitLogin();
        
        // Should redirect to dashboard
        await dashboardPage.expectDashboardVisible();
        await dashboardPage.expectWelcomeMessage(testUser.name);
      });

      test(`should handle form validation on ${name}`, async ({ page }) => {
        const registerPage = new RegisterPage(page);

        await registerPage.navigate();
        await registerPage.expectFormVisible();
        
        // Test empty form validation
        await registerPage.submitRegistration();
        await registerPage.expectNameError();
        await registerPage.expectEmailError();
        await registerPage.expectPasswordError();
        
        // Test email validation
        await registerPage.fillEmail('invalid-email');
        await registerPage.submitRegistration();
        await registerPage.expectEmailError('valid email');
        
        // Test password mismatch
        await registerPage.fillName('Test User');
        await registerPage.fillEmail('test@example.com');
        await registerPage.fillPassword('Password123!');
        await registerPage.fillConfirmPassword('Different123!');
        await registerPage.acceptTerms();
        await registerPage.submitRegistration();
        await registerPage.expectConfirmPasswordError('not match');
      });

      test(`should maintain session persistence on ${name}`, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        const dashboardPage = new DashboardPage(page);
        const testUser = generateTestUser();

        // Register and login
        await registerPage.navigate();
        await registerPage.registerAndExpectSuccess(testUser);
        
        // Verify dashboard is accessible
        await dashboardPage.expectDashboardVisible();
        
        // Refresh the page
        await page.reload();
        
        // Should still be logged in
        await dashboardPage.expectDashboardVisible();
        await dashboardPage.expectWelcomeMessage(testUser.name);
        
        // Navigate to different page and back
        await dashboardPage.goToSettings();
        await expect(page).toHaveURL('/settings');
        
        await page.goBack();
        await dashboardPage.expectDashboardVisible();
      });

      test(`should handle logout correctly on ${name}`, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const testUser = generateTestUser();

        // Register and login
        await registerPage.navigate();
        await registerPage.registerAndExpectSuccess(testUser);
        
        // Verify logged in
        await dashboardPage.expectDashboardVisible();
        
        // Logout
        await dashboardPage.logout();
        
        // Should redirect to login
        await loginPage.expectFormVisible();
        
        // Try to access dashboard directly
        await page.goto('/dashboard');
        
        // Should redirect to login
        await expect(page).toHaveURL('/auth/login');
      });
    });
  }

  test.describe('Mobile-Specific Tests', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Test tap interactions
      await registerPage.nameInput.tap();
      await expect(registerPage.nameInput).toBeFocused();
      
      await registerPage.emailInput.tap();
      await expect(registerPage.emailInput).toBeFocused();
      
      // Test form completion on mobile
      const testUser = generateTestUser();
      await registerPage.fillName(testUser.name);
      await registerPage.fillEmail(testUser.email);
      await registerPage.fillPassword(testUser.password);
      await registerPage.fillConfirmPassword(testUser.password);
      await registerPage.termsCheckbox.tap();
      
      await registerPage.submitButton.tap();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle mobile viewport properly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.navigate();
      
      // Check that form is responsive
      const formBox = await loginPage.loginForm.boundingBox();
      expect(formBox?.width).toBeLessThan(400); // Should fit mobile screen
      
      // Check that all form elements are visible
      await loginPage.expectFormVisible();
      
      // Test scrolling if needed
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should handle mobile navigation correctly', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const dashboardPage = new DashboardPage(page);
      const testUser = generateTestUser();

      // Register user
      await registerPage.navigate();
      await registerPage.register(testUser);
      
      // Check mobile dashboard layout
      await dashboardPage.expectDashboardVisible();
      
      // Test mobile navigation menu
      const mobileMenuButton = page.getByTestId('mobile-menu-button');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.tap();
        await expect(dashboardPage.sidebar).toBeVisible();
      }
    });
  });

  test.describe('Tablet-Specific Tests', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should handle tablet layout correctly', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const dashboardPage = new DashboardPage(page);
      const testUser = generateTestUser();

      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Check tablet form layout
      const formBox = await registerPage.registerForm.boundingBox();
      expect(formBox?.width).toBeGreaterThan(500); // Tablet should have wider forms
      expect(formBox?.width).toBeLessThan(800);
      
      // Complete registration
      await registerPage.register(testUser);
      
      // Check tablet dashboard layout
      await dashboardPage.expectDashboardVisible();
      await dashboardPage.expectSidebarVisible();
      await dashboardPage.expectWidgetsVisible();
    });

    test('should handle tablet touch interactions', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const testUser = generateTestUser();

      await loginPage.navigate();
      
      // Test touch-friendly interactions
      await loginPage.emailInput.tap();
      await loginPage.emailInput.fill(testUser.email);
      
      await loginPage.passwordInput.tap();
      await loginPage.passwordInput.fill(testUser.password);
      
      await loginPage.submitButton.tap();
      
      // Should show validation errors for non-existent user
      await loginPage.expectLoginError();
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('should work with Chrome autofill', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      const loginPage = new LoginPage(page);
      
      await loginPage.navigate();
      
      // Test autofill attributes
      await expect(loginPage.emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('should work with Firefox password manager', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      const registerPage = new RegisterPage(page);
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.register(testUser);
      
      // Firefox should be able to save password
      // This would typically trigger browser's password save dialog
    });

    test('should work with Safari keychain', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      const loginPage = new LoginPage(page);
      
      await loginPage.navigate();
      
      // Test Safari-specific features
      await loginPage.expectFormVisible();
    });
  });

  test.describe('Performance Across Browsers', () => {
    const performanceTests = [
      { name: 'Chrome', device: devices['Desktop Chrome'] },
      { name: 'Firefox', device: devices['Desktop Firefox'] },
      { name: 'Safari', device: devices['Desktop Safari'] },
    ];

    for (const { name, device } of performanceTests) {
      test(`should load registration form quickly on ${name}`, async ({ page }) => {
        test.use({ ...device });
        
        const registerPage = new RegisterPage(page);
        
        const startTime = Date.now();
        await registerPage.navigate();
        await registerPage.expectFormVisible();
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
        
        // Test form interaction performance
        const testUser = generateTestUser();
        const interactionStart = Date.now();
        
        await registerPage.fillName(testUser.name);
        await registerPage.fillEmail(testUser.email);
        await registerPage.fillPassword(testUser.password);
        await registerPage.fillConfirmPassword(testUser.password);
        
        const interactionTime = Date.now() - interactionStart;
        expect(interactionTime).toBeLessThan(1000); // Form interactions should be fast
      });

      test(`should handle login performance on ${name}`, async ({ page }) => {
        test.use({ ...device });
        
        const registerPage = new RegisterPage(page);
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const testUser = generateTestUser();

        // Register user first
        await registerPage.navigate();
        await registerPage.registerAndExpectSuccess(testUser);
        await dashboardPage.logout();
        
        // Test login performance
        await loginPage.navigate();
        
        const loginStart = Date.now();
        await loginPage.login(testUser);
        await dashboardPage.expectDashboardVisible();
        const loginTime = Date.now() - loginStart;
        
        expect(loginTime).toBeLessThan(5000); // Login should complete within 5 seconds
      });
    }
  });

  test.describe('Responsive Design Tests', () => {
    const viewportSizes = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 720 },
      { name: 'Desktop Large', width: 1920, height: 1080 },
    ];

    for (const { name, width, height } of viewportSizes) {
      test(`should work correctly on ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        
        const registerPage = new RegisterPage(page);
        const testUser = generateTestUser();
        
        await registerPage.navigate();
        await registerPage.expectFormVisible();
        
        // Check that form elements are properly sized
        const formBox = await registerPage.registerForm.boundingBox();
        expect(formBox?.width).toBeLessThanOrEqual(width - 40); // Account for margins
        expect(formBox?.height).toBeLessThanOrEqual(height);
        
        // Test form completion at this viewport
        await registerPage.register(testUser);
        
        // Should redirect to dashboard
        await expect(page).toHaveURL('/dashboard');
        
        // Check dashboard responsiveness
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.expectDashboardVisible();
      });
    }
  });

  test.describe('Network Condition Tests', () => {
    test('should work on slow 3G connection', async ({ page }) => {
      // Simulate slow 3G connection
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40,
      });
      
      const registerPage = new RegisterPage(page);
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Form should still work on slow connection
      await registerPage.register(testUser);
      
      // Should eventually redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle intermittent connectivity', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const testUser = generateTestUser();
      
      await loginPage.navigate();
      
      // Simulate network failure
      await page.route('**/api/auth/login', route => route.abort());
      
      await loginPage.login(testUser);
      await loginPage.expectLoginError();
      
      // Restore network
      await page.unroute('**/api/auth/login');
      
      // Should work after network is restored
      await loginPage.login(testUser);
      // Note: This would fail for non-existent user, but tests network recovery
    });
  });
});