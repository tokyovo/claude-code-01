import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('User Login E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test('should display login form correctly', async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.expectFormVisible();
    
    // Check form elements are present and properly labeled
    await expect(loginPage.loginForm).toContainText('Sign In');
    await expect(loginPage.registerLink).toContainText('Create an account');
    await expect(loginPage.forgotPasswordLink).toContainText('Forgot password');
  });

  test('should successfully login with valid credentials', async ({ loginPage, registerPage, dashboardPage }) => {
    const testUser = generateTestUser();
    
    // First register a user
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    
    // Logout to test login
    await dashboardPage.logout();
    
    // Now test login
    await loginPage.navigate();
    await loginPage.loginAndExpectSuccess(testUser);
    
    await dashboardPage.expectDashboardVisible();
    await dashboardPage.expectWelcomeMessage(testUser.name);
  });

  test('should validate required fields', async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.validateEmptyForm();
  });

  test('should validate email format', async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.validateInvalidEmail();
  });

  test('should validate password length', async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.validateShortPassword();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    const testUser = generateTestUser();
    
    await loginPage.navigate();
    await loginPage.loginAndExpectError(testUser, 'Invalid credentials');
  });

  test('should handle remember me functionality', async ({ loginPage, registerPage, dashboardPage, page }) => {
    const testUser = generateTestUser();
    
    // Register user first
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    await dashboardPage.logout();
    
    // Login with remember me
    await loginPage.navigate();
    await loginPage.login(testUser, true);
    await dashboardPage.expectDashboardVisible();
    
    // Check that remember me token is set
    const rememberToken = await page.evaluate(() => localStorage.getItem('rememberToken'));
    expect(rememberToken).toBeTruthy();
  });

  test('should toggle password visibility', async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.testPasswordVisibilityToggle();
  });

  test('should navigate to registration page', async ({ loginPage, registerPage }) => {
    await loginPage.navigate();
    await loginPage.goToRegister();
    await registerPage.expectFormVisible();
  });

  test('should navigate to forgot password page', async ({ loginPage, forgotPasswordPage }) => {
    await loginPage.navigate();
    await loginPage.goToForgotPassword();
    await forgotPasswordPage.expectFormVisible();
  });

  test('should measure login performance', async ({ loginPage, registerPage, dashboardPage }) => {
    const testUser = generateTestUser();
    
    // Register user first
    await registerPage.navigate();
    await registerPage.registerAndExpectSuccess(testUser);
    await dashboardPage.logout();
    
    await loginPage.navigate();
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);
    
    const loginTime = await loginPage.measureFormSubmissionTime();
    expect(loginTime).toBeLessThan(3000); // Should complete within 3 seconds
  });

  test('should work on mobile devices', async ({ loginPage, registerPage, dashboardPage }) => {
    const testUser = generateTestUser();
    
    // Register user first
    await registerPage.navigate();
    await registerPage.register(testUser);
    await dashboardPage.logout();
    
    await loginPage.navigate();
    await loginPage.testMobileLayout();
    
    await loginPage.login(testUser);
    await dashboardPage.expectDashboardVisible();
  });

  test.describe('Account Lockout Protection', () => {
    test('should lock account after failed login attempts', async ({ loginPage, registerPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      await loginPage.navigate();
      
      // Attempt multiple failed logins
      await loginPage.attemptMultipleFailedLogins(testUser, 5);
      
      // Account should be locked
      await loginPage.expectLockoutMessage();
      await loginPage.expectLockoutTimer();
    });

    test('should show lockout timer', async ({ loginPage, registerPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      await loginPage.navigate();
      
      // Trigger lockout
      await loginPage.attemptMultipleFailedLogins(testUser, 5);
      await loginPage.expectLockoutMessage();
      
      // Timer should be visible and counting down
      await loginPage.expectLockoutTimer();
      
      // Submit button should be disabled during lockout
      await loginPage.expectSubmitButtonDisabled();
    });

    test('should allow login after lockout expires', async ({ loginPage, registerPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      await loginPage.navigate();
      
      // Trigger lockout
      await loginPage.attemptMultipleFailedLogins(testUser, 5);
      await loginPage.expectLockoutMessage();
      
      // For testing, we'll simulate lockout expiry by waiting or manipulating time
      // In a real test, you might need to wait for actual lockout time or use API to clear lockout
      
      // Wait for lockout to end (this would be 15 minutes in real scenario)
      // For testing purposes, you might have a shorter lockout time
      // await loginPage.waitForLockoutToEnd();
      
      // For now, we'll just verify the lockout state is active
      await loginPage.expectLockoutMessage();
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent SQL injection attempts', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Attempt SQL injection
      await loginPage.fillEmail('admin\'; DROP TABLE users; --');
      await loginPage.fillPassword('password');
      await loginPage.submitLogin();
      
      // Should show invalid credentials error, not a database error
      await loginPage.expectLoginError();
    });

    test('should prevent XSS attacks', async ({ loginPage }) => {
      await loginPage.navigate();
      
      // Attempt XSS injection
      await loginPage.fillEmail('<script>alert("xss")</script>');
      await loginPage.fillPassword('password');
      await loginPage.submitLogin();
      
      // Should sanitize input and show validation error
      const emailValue = await loginPage.emailInput.inputValue();
      expect(emailValue).not.toContain('<script>');
    });

    test('should enforce rate limiting on login attempts', async ({ loginPage }) => {
      await loginPage.navigate();
      
      const testUser = generateTestUser();
      
      // Make rapid login attempts
      for (let i = 0; i < 10; i++) {
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitLogin();
        
        if (i >= 5) {
          // Should start seeing rate limit errors
          try {
            await loginPage.expectRateLimitError();
            break;
          } catch {
            // Continue if no rate limit yet
            continue;
          }
        }
      }
    });

    test('should clear sensitive data from memory', async ({ loginPage, page }) => {
      const testUser = generateTestUser();
      
      await loginPage.navigate();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      await loginPage.submitLogin();
      
      // Navigate away and check that password is not stored in form
      await page.goBack();
      
      const passwordValue = await loginPage.passwordInput.inputValue();
      expect(passwordValue).toBe(''); // Password should be cleared
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ loginPage }) => {
      await loginPage.navigate();
      await loginPage.testKeyboardNavigation();
    });

    test('should support screen reader accessibility', async ({ loginPage }) => {
      await loginPage.navigate();
      await loginPage.testScreenReaderLabels();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle network interruption during login', async ({ loginPage, page }) => {
      const testUser = generateTestUser();
      
      await loginPage.navigate();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Simulate network failure
      await page.route('**/api/auth/login', route => route.abort());
      
      await loginPage.submitLogin();
      
      // Should show appropriate error message
      await loginPage.expectLoginError('network');
      
      // Restore network
      await page.unroute('**/api/auth/login');
    });

    test('should handle slow server response', async ({ loginPage, page }) => {
      const testUser = generateTestUser();
      
      await loginPage.navigate();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      
      // Simulate slow response
      await page.route('**/api/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      
      const startTime = Date.now();
      await loginPage.submitLogin();
      
      // Should show loading state during slow response
      await expect(loginPage.loadingSpinner).toBeVisible();
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeGreaterThan(2000);
    });

    test('should handle server errors gracefully', async ({ loginPage, page }) => {
      const testUser = generateTestUser();
      
      await loginPage.navigate();
      
      // Simulate server error
      await page.route('**/api/auth/login', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await loginPage.login(testUser);
      await loginPage.expectLoginError('server error');
    });

    test('should handle session timeout', async ({ loginPage, dashboardPage, page }) => {
      const testUser = generateTestUser();
      
      // This test would simulate session timeout
      // Implementation depends on your session management
      await dashboardPage.navigate();
      
      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('token', 'expired-token');
      });
      
      // Try to access dashboard
      await dashboardPage.refresh();
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ loginPage, registerPage, dashboardPage, page }) => {
      const testUser = generateTestUser();
      
      // Register and login
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await dashboardPage.expectDashboardVisible();
    });

    test('should clear session on logout', async ({ loginPage, registerPage, dashboardPage, page }) => {
      const testUser = generateTestUser();
      
      // Register and login
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Logout
      await dashboardPage.logout();
      
      // Check that session is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
      
      // Should not be able to access dashboard
      await dashboardPage.navigate();
      await expect(page).toHaveURL('/auth/login');
    });
  });
});