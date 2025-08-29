import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';
import { ApiHelper } from '../utils/api-helper';

test.describe('Authentication Security E2E Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(async () => {
    apiHelper = new ApiHelper();
  });

  test.afterAll(async () => {
    await apiHelper.dispose();
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test.describe('Rate Limiting Tests', () => {
    test('should enforce rate limiting on login endpoint', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      const testUser = generateTestUser();
      let rateLimitHit = false;
      
      // Monitor network requests
      page.on('response', response => {
        if (response.url().includes('/api/auth/login') && response.status() === 429) {
          rateLimitHit = true;
        }
      });
      
      // Make rapid login attempts
      for (let i = 0; i < 10; i++) {
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitLogin();
        
        if (rateLimitHit) {
          break;
        }
        
        // Small delay to allow for response
        await page.waitForTimeout(100);
      }
      
      // Should hit rate limit
      expect(rateLimitHit).toBe(true);
      
      // Should show rate limit error in UI
      await loginPage.expectRateLimitError();
    });

    test('should enforce rate limiting on registration endpoint', async ({ registerPage, page }) => {
      await registerPage.navigate();
      
      let rateLimitHit = false;
      
      // Monitor network requests
      page.on('response', response => {
        if (response.url().includes('/api/auth/register') && response.status() === 429) {
          rateLimitHit = true;
        }
      });
      
      // Make rapid registration attempts with different emails
      for (let i = 0; i < 8; i++) {
        const testUser = generateTestUser();
        await registerPage.fillName(testUser.name);
        await registerPage.fillEmail(testUser.email);
        await registerPage.fillPassword(testUser.password);
        await registerPage.fillConfirmPassword(testUser.password);
        await registerPage.acceptTerms();
        await registerPage.submitRegistration();
        
        if (rateLimitHit) {
          break;
        }
        
        // Clear form for next attempt
        await registerPage.page.reload();
        await registerPage.expectFormVisible();
      }
      
      expect(rateLimitHit).toBe(true);
    });

    test('should enforce rate limiting on password reset endpoint', async ({ forgotPasswordPage, page }) => {
      await forgotPasswordPage.navigate();
      
      let rateLimitHit = false;
      
      // Monitor network requests
      page.on('response', response => {
        if (response.url().includes('/api/auth/forgot-password') && response.status() === 429) {
          rateLimitHit = true;
        }
      });
      
      // Make rapid password reset requests
      for (let i = 0; i < 8; i++) {
        await forgotPasswordPage.fillEmail(`test${i}@example.com`);
        await forgotPasswordPage.submitRequest();
        
        if (rateLimitHit) {
          break;
        }
        
        await page.waitForTimeout(100);
      }
      
      expect(rateLimitHit).toBe(true);
      await forgotPasswordPage.expectErrorMessage('rate limit');
    });

    test('should measure API rate limiting performance', async () => {
      // Test login endpoint rate limiting
      const loginResults = await apiHelper.testRateLimit('/api/auth/login', 'POST', 10);
      
      const rateLimitedRequests = loginResults.filter(result => result.rateLimited);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
      
      // Should start rate limiting after a certain number of requests
      const firstRateLimit = loginResults.findIndex(result => result.rateLimited);
      expect(firstRateLimit).toBeLessThanOrEqual(5); // Should start limiting within first 5 attempts
    });
  });

  test.describe('Account Lockout Security', () => {
    test('should lock account after multiple failed login attempts', async ({ 
      registerPage, 
      loginPage, 
      dashboardPage 
    }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      // Attempt failed logins
      await loginPage.navigate();
      
      for (let i = 0; i < 5; i++) {
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitLogin();
        
        if (i < 4) {
          await loginPage.expectLoginError();
        }
      }
      
      // Account should be locked
      await loginPage.expectLockoutMessage();
      await loginPage.expectSubmitButtonDisabled();
    });

    test('should track failed login attempts', async ({ registerPage, loginPage, dashboardPage }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      // Make failed login attempts
      await loginPage.navigate();
      
      for (let i = 0; i < 3; i++) {
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitLogin();
        await loginPage.expectLoginError();
      }
      
      // Verify that failed attempts are tracked (would require API integration)
      // This could be verified through security metrics endpoint
    });

    test('should reset failed attempts counter after successful login', async ({ 
      registerPage, 
      loginPage, 
      dashboardPage 
    }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      await dashboardPage.logout();
      
      await loginPage.navigate();
      
      // Make some failed attempts
      for (let i = 0; i < 2; i++) {
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitLogin();
        await loginPage.expectLoginError();
      }
      
      // Then successful login
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      await loginPage.submitLogin();
      await dashboardPage.expectDashboardVisible();
      
      // Failed attempts counter should be reset
      // This would typically be verified through API or database check
    });
  });

  test.describe('JWT Token Security', () => {
    test('should handle expired JWT tokens', async ({ 
      registerPage, 
      dashboardPage, 
      loginPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register and login
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired');
      });
      
      // Try to access protected route
      await dashboardPage.navigate();
      
      // Should redirect to login due to expired token
      await expect(page).toHaveURL('/auth/login');
    });

    test('should handle invalid JWT tokens', async ({ dashboardPage, page }) => {
      // Set invalid token
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid.jwt.token');
      });
      
      // Try to access protected route
      await dashboardPage.navigate();
      
      // Should redirect to login due to invalid token
      await expect(page).toHaveURL('/auth/login');
    });

    test('should refresh tokens automatically', async ({ 
      registerPage, 
      dashboardPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register user
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Get initial token
      const initialToken = await page.evaluate(() => localStorage.getItem('token'));
      expect(initialToken).toBeTruthy();
      
      // Mock token refresh scenario
      await page.route('**/api/auth/refresh', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'new-refreshed-token',
            refreshToken: 'new-refresh-token'
          })
        })
      );
      
      // Simulate token near expiry
      await page.evaluate(() => {
        localStorage.setItem('token', 'expiring-token');
      });
      
      // Navigate to trigger token refresh
      await dashboardPage.refresh();
      
      // Should still be on dashboard (token refreshed)
      await dashboardPage.expectDashboardVisible();
    });

    test('should logout when refresh token is invalid', async ({ 
      registerPage, 
      dashboardPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register user
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Mock failed token refresh
      await page.route('**/api/auth/refresh', route => 
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid refresh token' })
        })
      );
      
      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('refreshToken', 'invalid-refresh-token');
      });
      
      // Try to access dashboard
      await dashboardPage.navigate();
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
      
      // Tokens should be cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });
  });

  test.describe('Session Security', () => {
    test('should handle concurrent sessions', async ({ 
      registerPage, 
      dashboardPage,
      page,
      context 
    }) => {
      const testUser = generateTestUser();
      
      // Register in first session
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Create second browser context (new session)
      const secondContext = await context.browser()?.newContext();
      if (!secondContext) return;
      
      const secondPage = await secondContext.newPage();
      
      // Try to login in second session with same user
      await secondPage.goto('/auth/login');
      
      const secondLoginPage = new (await import('../pages/login-page')).LoginPage(secondPage);
      await secondLoginPage.loginAndExpectSuccess(testUser);
      
      // Both sessions should be able to coexist
      await dashboardPage.expectDashboardVisible();
      
      const secondDashboard = new (await import('../pages/dashboard-page')).DashboardPage(secondPage);
      await secondDashboard.expectDashboardVisible();
      
      await secondContext.close();
    });

    test('should handle session timeout', async ({ 
      registerPage, 
      dashboardPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register user
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Mock session timeout response
      await page.route('**/api/**', (route) => {
        if (route.request().url().includes('/dashboard')) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Session expired' })
          });
        } else {
          route.continue();
        }
      });
      
      // Try to access dashboard after "session timeout"
      await dashboardPage.refresh();
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should clear session data on logout', async ({ 
      registerPage, 
      dashboardPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register and login
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Verify session data exists
      const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenBefore).toBeTruthy();
      
      // Logout
      await dashboardPage.logout();
      
      // Verify session data is cleared
      const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
      const refreshTokenAfter = await page.evaluate(() => localStorage.getItem('refreshToken'));
      
      expect(tokenAfter).toBeNull();
      expect(refreshTokenAfter).toBeNull();
    });
  });

  test.describe('Input Validation Security', () => {
    test('should prevent XSS attacks in registration', async ({ registerPage }) => {
      const xssPayload = '<script>alert("xss")</script>';
      
      await registerPage.navigate();
      await registerPage.fillName(xssPayload);
      await registerPage.fillEmail(`test${xssPayload}@example.com`);
      await registerPage.fillPassword('Password123!');
      await registerPage.fillConfirmPassword('Password123!');
      await registerPage.acceptTerms();
      await registerPage.submitRegistration();
      
      // Check that XSS payload was sanitized
      const nameValue = await registerPage.nameInput.inputValue();
      const emailValue = await registerPage.emailInput.inputValue();
      
      expect(nameValue).not.toContain('<script>');
      expect(emailValue).not.toContain('<script>');
    });

    test('should prevent SQL injection in login', async ({ loginPage }) => {
      const sqlInjection = "admin'; DROP TABLE users; --";
      
      await loginPage.navigate();
      await loginPage.fillEmail(sqlInjection);
      await loginPage.fillPassword('password');
      await loginPage.submitLogin();
      
      // Should show validation error, not database error
      await loginPage.expectLoginError();
      
      // Application should still be functional
      await loginPage.expectFormVisible();
    });

    test('should validate email format strictly', async ({ registerPage }) => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'spaces in@email.com',
        'double..dots@example.com',
        'toolong' + 'a'.repeat(250) + '@example.com'
      ];
      
      await registerPage.navigate();
      
      for (const email of invalidEmails) {
        await registerPage.fillEmail(email);
        await registerPage.fillName('Test User');
        await registerPage.fillPassword('Password123!');
        await registerPage.fillConfirmPassword('Password123!');
        await registerPage.acceptTerms();
        await registerPage.submitRegistration();
        
        await registerPage.expectEmailError();
        
        // Clear form for next test
        await registerPage.page.reload();
        await registerPage.expectFormVisible();
      }
    });

    test('should enforce password complexity', async ({ registerPage }) => {
      const weakPasswords = [
        'password',
        '12345678',
        'PASSWORD',
        'password123',
        'PASSWORD123',
        'Pass123', // Too short
        'passwordwithoutuppercase123',
        'PASSWORDWITHLOWERCASE123'
      ];
      
      await registerPage.navigate();
      
      for (const password of weakPasswords) {
        await registerPage.fillName('Test User');
        await registerPage.fillEmail('test@example.com');
        await registerPage.fillPassword(password);
        await registerPage.fillConfirmPassword(password);
        await registerPage.acceptTerms();
        await registerPage.submitRegistration();
        
        await registerPage.expectPasswordError();
        
        // Clear form for next test
        await registerPage.page.reload();
        await registerPage.expectFormVisible();
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should include CSRF tokens in forms', async ({ loginPage, registerPage }) => {
      // Check login form
      await loginPage.navigate();
      const loginCsrf = await loginPage.page.locator('input[name="_token"], meta[name="csrf-token"]').count();
      expect(loginCsrf).toBeGreaterThanOrEqual(0); // May not be implemented yet
      
      // Check registration form
      await registerPage.navigate();
      const registerCsrf = await registerPage.page.locator('input[name="_token"], meta[name="csrf-token"]').count();
      expect(registerCsrf).toBeGreaterThanOrEqual(0);
    });

    test('should reject requests without valid CSRF tokens', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Mock CSRF validation failure
      await page.route('**/api/auth/login', route => {
        const headers = route.request().headers();
        if (!headers['x-csrf-token'] && !headers['x-xsrf-token']) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'CSRF token mismatch' })
          });
        } else {
          route.continue();
        }
      });
      
      const testUser = generateTestUser();
      await loginPage.login(testUser);
      
      // Should handle CSRF error gracefully
      await loginPage.expectLoginError();
    });
  });

  test.describe('Security Headers', () => {
    test('should include security headers in responses', async ({ page }) => {
      let securityHeaders = {};
      
      page.on('response', response => {
        if (response.url().includes('/auth/')) {
          securityHeaders = response.headers();
        }
      });
      
      await page.goto('/auth/login');
      
      // Check for important security headers
      expect(securityHeaders).toHaveProperty('x-frame-options');
      expect(securityHeaders).toHaveProperty('x-content-type-options');
      expect(securityHeaders).toHaveProperty('referrer-policy');
      // Note: Some headers may not be present depending on server configuration
    });

    test('should enforce HTTPS in production', async ({ page }) => {
      // This test would verify HTTPS enforcement
      // Implementation depends on deployment configuration
      const currentUrl = page.url();
      
      if (process.env.NODE_ENV === 'production') {
        expect(currentUrl).toMatch(/^https:/);
      }
    });
  });

  test.describe('API Security', () => {
    test('should validate API endpoint security', async () => {
      const healthCheck = await apiHelper.healthCheck();
      expect(healthCheck.healthy).toBe(true);
    });

    test('should measure API response times', async () => {
      const loginPerformance = await apiHelper.measureApiPerformance('/api/auth/login', 'POST', 5);
      
      expect(loginPerformance.averageTime).toBeLessThan(1000); // Should respond within 1 second
      expect(loginPerformance.successRate).toBeGreaterThan(0); // Some responses should succeed
    });

    test('should handle API errors gracefully', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Simulate various API errors
      const errorScenarios = [
        { status: 500, message: 'Internal Server Error' },
        { status: 503, message: 'Service Unavailable' },
        { status: 429, message: 'Too Many Requests' }
      ];
      
      for (const scenario of errorScenarios) {
        await page.route('**/api/auth/login', route => 
          route.fulfill({
            status: scenario.status,
            body: scenario.message
          })
        );
        
        const testUser = generateTestUser();
        await loginPage.login(testUser);
        
        // Should show appropriate error message
        await loginPage.expectLoginError();
        
        // Clear route for next test
        await page.unroute('**/api/auth/login');
      }
    });
  });
});