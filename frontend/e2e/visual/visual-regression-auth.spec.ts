import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('Visual Regression Tests for Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test.describe('Login Page Visual Tests', () => {
    test('should match login page design', async ({ loginPage }) => {
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      // Wait for fonts and styles to load
      await loginPage.page.waitForTimeout(1000);
      
      // Take full page screenshot
      await expect(loginPage.page).toHaveScreenshot('login-page-full.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      // Take form-specific screenshot
      await expect(loginPage.loginForm).toHaveScreenshot('login-form.png', {
        animations: 'disabled'
      });
    });

    test('should match login page with validation errors', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Trigger validation errors
      await loginPage.submitLogin();
      await loginPage.expectEmailError();
      await loginPage.expectPasswordError();
      
      // Take screenshot with errors visible
      await expect(loginPage.loginForm).toHaveScreenshot('login-form-errors.png', {
        animations: 'disabled'
      });
    });

    test('should match login page in loading state', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Mock slow response to capture loading state
      await page.route('**/api/auth/login', async route => {
        // Delay the response
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });
      
      // Start login and capture loading state
      const submitPromise = loginPage.submitLogin();
      
      // Wait a bit for loading state to appear
      await loginPage.page.waitForTimeout(100);
      
      // Take screenshot of loading state
      await expect(loginPage.loginForm).toHaveScreenshot('login-form-loading.png', {
        animations: 'disabled'
      });
      
      await submitPromise;
    });

    test('should match login page on different screen sizes', async ({ loginPage, page }) => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'desktop-large', width: 1920, height: 1080 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await loginPage.navigate();
        await loginPage.expectFormVisible();
        
        // Wait for responsive layout to settle
        await page.waitForTimeout(500);
        
        await expect(loginPage.page).toHaveScreenshot(`login-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('should match login page hover states', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Hover over submit button
      await loginPage.submitButton.hover();
      await expect(loginPage.submitButton).toHaveScreenshot('login-submit-hover.png');
      
      // Hover over register link
      await loginPage.registerLink.hover();
      await expect(loginPage.registerLink).toHaveScreenshot('register-link-hover.png');
      
      // Hover over forgot password link
      await loginPage.forgotPasswordLink.hover();
      await expect(loginPage.forgotPasswordLink).toHaveScreenshot('forgot-password-link-hover.png');
    });

    test('should match login page focus states', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Focus email input
      await loginPage.emailInput.focus();
      await expect(loginPage.emailInput).toHaveScreenshot('email-input-focus.png');
      
      // Focus password input
      await loginPage.passwordInput.focus();
      await expect(loginPage.passwordInput).toHaveScreenshot('password-input-focus.png');
      
      // Focus submit button
      await loginPage.submitButton.focus();
      await expect(loginPage.submitButton).toHaveScreenshot('submit-button-focus.png');
    });
  });

  test.describe('Registration Page Visual Tests', () => {
    test('should match registration page design', async ({ registerPage }) => {
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Wait for fonts and styles to load
      await registerPage.page.waitForTimeout(1000);
      
      // Take full page screenshot
      await expect(registerPage.page).toHaveScreenshot('register-page-full.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      // Take form-specific screenshot
      await expect(registerPage.registerForm).toHaveScreenshot('register-form.png', {
        animations: 'disabled'
      });
    });

    test('should match registration page with validation errors', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Trigger all validation errors
      await registerPage.submitRegistration();
      
      await registerPage.expectNameError();
      await registerPage.expectEmailError();
      await registerPage.expectPasswordError();
      await registerPage.expectConfirmPasswordError();
      await registerPage.expectTermsError();
      
      // Take screenshot with all errors visible
      await expect(registerPage.registerForm).toHaveScreenshot('register-form-all-errors.png', {
        animations: 'disabled'
      });
    });

    test('should match password strength indicator states', async ({ registerPage }) => {
      await registerPage.navigate();
      
      const passwords = [
        { password: 'weak', name: 'weak' },
        { password: 'medium123', name: 'medium' },
        { password: 'StrongPassword123!', name: 'strong' }
      ];
      
      for (const { password, name } of passwords) {
        await registerPage.fillPassword(password);
        await expect(registerPage.passwordStrength).toBeVisible();
        
        await expect(registerPage.passwordStrength).toHaveScreenshot(`password-strength-${name}.png`);
        
        // Also capture the full password section
        const passwordSection = registerPage.page.locator('[data-testid*="password"]').first().locator('..');
        await expect(passwordSection).toHaveScreenshot(`password-section-${name}.png`);
        
        await registerPage.passwordInput.clear();
      }
    });

    test('should match registration form progress states', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Empty form
      await expect(registerPage.registerForm).toHaveScreenshot('register-form-empty.png');
      
      // Partially filled form
      const testUser = generateTestUser();
      await registerPage.fillName(testUser.name);
      await registerPage.fillEmail(testUser.email);
      
      await expect(registerPage.registerForm).toHaveScreenshot('register-form-partial.png');
      
      // Completely filled form
      await registerPage.fillPassword(testUser.password);
      await registerPage.fillConfirmPassword(testUser.password);
      await registerPage.acceptTerms();
      
      await expect(registerPage.registerForm).toHaveScreenshot('register-form-complete.png');
    });

    test('should match registration page on mobile devices', async ({ registerPage, page }) => {
      const mobileViewports = [
        { name: 'iphone-se', width: 375, height: 667 },
        { name: 'iphone-12', width: 390, height: 844 },
        { name: 'pixel-5', width: 393, height: 851 },
        { name: 'samsung-galaxy', width: 360, height: 740 }
      ];
      
      for (const viewport of mobileViewports) {
        await page.setViewportSize(viewport);
        await registerPage.navigate();
        await registerPage.expectFormVisible();
        
        // Wait for mobile layout to settle
        await page.waitForTimeout(500);
        
        await expect(registerPage.page).toHaveScreenshot(`register-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Forgot Password Page Visual Tests', () => {
    test('should match forgot password page design', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      await forgotPasswordPage.expectFormVisible();
      
      await expect(forgotPasswordPage.page).toHaveScreenshot('forgot-password-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      await expect(forgotPasswordPage.forgotPasswordForm).toHaveScreenshot('forgot-password-form.png', {
        animations: 'disabled'
      });
    });

    test('should match forgot password success state', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      
      // Mock successful response
      await forgotPasswordPage.page.route('**/api/auth/forgot-password', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password reset email sent' })
        })
      );
      
      await forgotPasswordPage.requestPasswordReset('test@example.com');
      await forgotPasswordPage.expectSuccessMessage();
      
      await expect(forgotPasswordPage.forgotPasswordForm).toHaveScreenshot('forgot-password-success.png', {
        animations: 'disabled'
      });
    });

    test('should match forgot password rate limited state', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.navigate();
      
      // Mock rate limit response
      await forgotPasswordPage.page.route('**/api/auth/forgot-password', route => 
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Too many requests',
            retryAfter: 60
          })
        })
      );
      
      await forgotPasswordPage.requestPasswordReset('test@example.com');
      await forgotPasswordPage.expectErrorMessage('rate limit');
      
      await expect(forgotPasswordPage.forgotPasswordForm).toHaveScreenshot('forgot-password-rate-limited.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Dashboard Visual Tests', () => {
    test('should match dashboard layout after login', async ({ 
      registerPage, 
      dashboardPage 
    }) => {
      const testUser = generateTestUser();
      
      // Register and login user
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      await dashboardPage.expectDashboardVisible();
      
      // Wait for dashboard to fully load
      await dashboardPage.page.waitForTimeout(2000);
      
      // Take full dashboard screenshot
      await expect(dashboardPage.page).toHaveScreenshot('dashboard-full.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      // Take screenshot of main dashboard area
      await expect(dashboardPage.dashboard).toHaveScreenshot('dashboard-main.png', {
        animations: 'disabled'
      });
    });

    test('should match dashboard sidebar', async ({ 
      registerPage, 
      dashboardPage 
    }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      await dashboardPage.expectSidebarVisible();
      
      await expect(dashboardPage.sidebar).toHaveScreenshot('dashboard-sidebar.png', {
        animations: 'disabled'
      });
    });

    test('should match dashboard widgets', async ({ 
      registerPage, 
      dashboardPage 
    }) => {
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      await dashboardPage.expectWidgetsVisible();
      
      // Screenshot individual widgets
      await expect(dashboardPage.balanceWidget).toHaveScreenshot('balance-widget.png');
      await expect(dashboardPage.incomeWidget).toHaveScreenshot('income-widget.png');
      await expect(dashboardPage.expenseWidget).toHaveScreenshot('expense-widget.png');
    });

    test('should match dashboard on tablet layout', async ({ 
      registerPage, 
      dashboardPage, 
      page 
    }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const testUser = generateTestUser();
      
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      await dashboardPage.expectDashboardVisible();
      
      await expect(dashboardPage.page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Theme and Color Scheme Tests', () => {
    test('should match light theme', async ({ loginPage, page }) => {
      // Force light theme
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      await expect(loginPage.page).toHaveScreenshot('login-light-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match dark theme', async ({ loginPage, page }) => {
      // Force dark theme
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      await expect(loginPage.page).toHaveScreenshot('login-dark-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match high contrast mode', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            :root {
              --color-text: #000000 !important;
              --color-background: #ffffff !important;
              --color-primary: #0066cc !important;
              --color-error: #cc0000 !important;
            }
          }
        `
      });
      
      // Force high contrast
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
      
      await expect(loginPage.page).toHaveScreenshot('login-high-contrast.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Error State Visual Tests', () => {
    test('should match 404 error page', async ({ page }) => {
      await page.goto('/auth/nonexistent-page');
      
      const notFoundElement = page.getByTestId('not-found') || page.getByText('404');
      
      await expect(page).toHaveScreenshot('404-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match network error state', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Simulate network error
      await page.route('**/api/auth/login', route => route.abort());
      
      const testUser = generateTestUser();
      await loginPage.login(testUser);
      
      // Should show network error
      await loginPage.expectLoginError();
      
      await expect(loginPage.loginForm).toHaveScreenshot('login-network-error.png', {
        animations: 'disabled'
      });
    });

    test('should match server error state', async ({ registerPage, page }) => {
      await registerPage.navigate();
      
      // Simulate server error
      await page.route('**/api/auth/register', route => 
        route.fulfill({
          status: 500,
          body: 'Internal Server Error'
        })
      );
      
      const testUser = generateTestUser();
      await registerPage.register(testUser);
      
      await registerPage.expectRegisterError();
      
      await expect(registerPage.registerForm).toHaveScreenshot('register-server-error.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Animation and Transition Tests', () => {
    test('should capture form validation transitions', async ({ registerPage, page }) => {
      await registerPage.navigate();
      
      // Enable animations for this test
      await page.addStyleTag({
        content: `
          * {
            transition-duration: 0.3s !important;
            animation-duration: 0.3s !important;
          }
        `
      });
      
      // Submit form to trigger validation animations
      await registerPage.submitRegistration();
      
      // Wait for animations to complete
      await page.waitForTimeout(500);
      
      await expect(registerPage.registerForm).toHaveScreenshot('register-validation-animated.png');
    });

    test('should capture loading spinner animation', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Mock slow response
      await page.route('**/api/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Start login
      const submitPromise = loginPage.submitLogin();
      
      // Wait for spinner to appear
      await page.waitForTimeout(200);
      
      // Capture loading animation frame
      await expect(loginPage.loadingSpinner).toHaveScreenshot('loading-spinner.png');
      
      await submitPromise;
    });
  });

  test.describe('Browser-Specific Visual Tests', () => {
    test('should match Chrome rendering', async ({ loginPage, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      await expect(loginPage.page).toHaveScreenshot('login-chrome.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match Firefox rendering', async ({ loginPage, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      await expect(loginPage.page).toHaveScreenshot('login-firefox.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match Safari rendering', async ({ loginPage, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      await expect(loginPage.page).toHaveScreenshot('login-safari.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});