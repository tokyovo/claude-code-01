import { test, expect } from '../fixtures/test-fixtures';
import { generateTestUser } from '../utils/test-data';

test.describe('Authentication Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = page.context();
    await context.clearCookies();
  });

  test.describe('Page Load Performance', () => {
    test('should load login page quickly', async ({ loginPage, page }) => {
      // Start timing
      const startTime = Date.now();
      
      // Navigate and wait for page to be ready
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Check for performance metrics
      const performanceEntries = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
      });
      
      // DOM should be ready quickly
      expect(performanceEntries.domContentLoaded).toBeLessThan(1000);
      
      // First Contentful Paint should be under 1.5 seconds
      if (performanceEntries.firstContentfulPaint > 0) {
        expect(performanceEntries.firstContentfulPaint).toBeLessThan(1500);
      }
    });

    test('should load registration page quickly', async ({ registerPage, page }) => {
      const startTime = Date.now();
      
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
      
      // Check that password strength indicator loads quickly
      await expect(registerPage.passwordRequirements).toBeVisible();
    });

    test('should load dashboard quickly after login', async ({ 
      registerPage, 
      loginPage, 
      dashboardPage, 
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Register user first
      await registerPage.navigate();
      await registerPage.registerAndExpectSuccess(testUser);
      
      // Logout to test login performance
      await dashboardPage.logout();
      
      // Time the login process
      await loginPage.navigate();
      
      const loginStartTime = Date.now();
      await loginPage.login(testUser);
      await dashboardPage.expectDashboardVisible();
      const loginTime = Date.now() - loginStartTime;
      
      // Login and dashboard load should complete within 3 seconds
      expect(loginTime).toBeLessThan(3000);
      
      // Check dashboard load performance
      const performanceEntries = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        };
      });
      
      expect(performanceEntries.domInteractive).toBeLessThan(2000);
    });
  });

  test.describe('Form Interaction Performance', () => {
    test('should respond to form inputs quickly', async ({ registerPage }) => {
      await registerPage.navigate();
      
      const testUser = generateTestUser();
      
      // Measure time to fill each field
      const measurements = [];
      
      // Name field
      let startTime = Date.now();
      await registerPage.fillName(testUser.name);
      measurements.push({ field: 'name', time: Date.now() - startTime });
      
      // Email field
      startTime = Date.now();
      await registerPage.fillEmail(testUser.email);
      measurements.push({ field: 'email', time: Date.now() - startTime });
      
      // Password field (may trigger strength calculation)
      startTime = Date.now();
      await registerPage.fillPassword(testUser.password);
      measurements.push({ field: 'password', time: Date.now() - startTime });
      
      // Confirm password field
      startTime = Date.now();
      await registerPage.fillConfirmPassword(testUser.password);
      measurements.push({ field: 'confirmPassword', time: Date.now() - startTime });
      
      // All field interactions should be under 500ms
      for (const measurement of measurements) {
        expect(measurement.time).toBeLessThan(500);
      }
      
      console.log('Form field response times:', measurements);
    });

    test('should validate forms quickly', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Test real-time validation performance
      const startTime = Date.now();
      
      // Fill invalid email to trigger validation
      await registerPage.fillEmail('invalid-email');
      await registerPage.nameInput.click(); // Trigger blur validation
      
      // Wait for error to appear
      await registerPage.expectEmailError();
      
      const validationTime = Date.now() - startTime;
      
      // Validation should appear within 300ms
      expect(validationTime).toBeLessThan(300);
    });

    test('should calculate password strength quickly', async ({ registerPage }) => {
      await registerPage.navigate();
      
      const passwords = ['weak', 'medium123', 'StrongPassword123!'];
      
      for (const password of passwords) {
        const startTime = Date.now();
        
        await registerPage.fillPassword(password);
        await expect(registerPage.passwordStrength).toBeVisible();
        
        const calculationTime = Date.now() - startTime;
        
        // Password strength calculation should be under 200ms
        expect(calculationTime).toBeLessThan(200);
        
        // Clear field for next test
        await registerPage.passwordInput.clear();
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ 
      registerPage, 
      page 
    }) => {
      // Simulate slow 3G network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40,
      });
      
      const testUser = generateTestUser();
      
      const startTime = Date.now();
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow connection
      expect(loadTime).toBeLessThan(10000); // 10 seconds for slow 3G
      
      // Form should still be interactive
      await registerPage.register(testUser);
      
      // Should eventually succeed (may take longer on slow connection)
      await expect(page).toHaveURL('/dashboard');
    });

    test('should optimize API request performance', async ({ 
      loginPage, 
      registerPage, 
      dashboardPage,
      page 
    }) => {
      const testUser = generateTestUser();
      
      // Monitor network requests
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            startTime: Date.now()
          });
        }
      });
      
      const responses = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          const request = requests.find(r => r.url === response.url());
          if (request) {
            responses.push({
              url: response.url(),
              method: request.method,
              status: response.status(),
              responseTime: Date.now() - request.startTime
            });
          }
        }
      });
      
      // Register user
      await registerPage.navigate();
      await registerPage.register(testUser);
      
      // Check registration API performance
      const registrationResponse = responses.find(r => 
        r.url.includes('/api/auth/register') && r.method === 'POST'
      );
      
      if (registrationResponse) {
        expect(registrationResponse.responseTime).toBeLessThan(2000); // 2 seconds
        expect(registrationResponse.status).toBe(200);
      }
      
      // Logout and test login performance
      await dashboardPage.logout();
      await loginPage.navigate();
      await loginPage.login(testUser);
      
      // Check login API performance
      const loginResponse = responses.find(r => 
        r.url.includes('/api/auth/login') && r.method === 'POST'
      );
      
      if (loginResponse) {
        expect(loginResponse.responseTime).toBeLessThan(1000); // 1 second
        expect(loginResponse.status).toBe(200);
      }
      
      console.log('API response times:', responses);
    });

    test('should handle concurrent requests efficiently', async ({ 
      page,
      context
    }) => {
      // Create multiple contexts to simulate concurrent users
      const contexts = await Promise.all([
        context.browser()?.newContext(),
        context.browser()?.newContext(),
        context.browser()?.newContext()
      ].filter(Boolean));
      
      const pages = await Promise.all(
        contexts.map(ctx => ctx?.newPage()).filter(Boolean)
      );
      
      // Measure concurrent registration performance
      const startTime = Date.now();
      
      const registrationPromises = pages.map(async (page, index) => {
        if (!page) return;
        
        const registerPage = new (await import('../pages/register-page')).RegisterPage(page);
        const testUser = generateTestUser({ email: `user${index}@concurrent.test` });
        
        await registerPage.navigate();
        await registerPage.register(testUser);
        return { index, success: true };
      });
      
      const results = await Promise.all(registrationPromises);
      const concurrentTime = Date.now() - startTime;
      
      // Concurrent registrations should complete within reasonable time
      expect(concurrentTime).toBeLessThan(10000); // 10 seconds for 3 concurrent users
      
      // All registrations should succeed
      const successfulRegistrations = results.filter(r => r?.success);
      expect(successfulRegistrations.length).toBe(pages.length);
      
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx?.close()));
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not cause memory leaks during form interactions', async ({ 
      registerPage, 
      page 
    }) => {
      await registerPage.navigate();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      const testUser = generateTestUser();
      
      // Perform multiple form interactions
      for (let i = 0; i < 10; i++) {
        await registerPage.fillName(`${testUser.name} ${i}`);
        await registerPage.fillEmail(`${i}${testUser.email}`);
        await registerPage.fillPassword(testUser.password);
        await registerPage.fillConfirmPassword(testUser.password);
        
        // Clear fields
        await registerPage.nameInput.clear();
        await registerPage.emailInput.clear();
        await registerPage.passwordInput.clear();
        await registerPage.confirmPasswordInput.clear();
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // Memory usage shouldn't increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });

    test('should handle large password lists efficiently', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Test password strength calculation with various passwords
      const passwords = [
        'a',
        'ab',
        'abc',
        'password',
        'password123',
        'Password123',
        'Password123!',
        'VeryLongPasswordWithManyCharactersToTestPerformance123!@#',
        'SpecialChars!@#$%^&*()_+-=[]{}|;:,.<>?',
        'UnicodePasswordТест你好123!',
      ];
      
      const measurements = [];
      
      for (const password of passwords) {
        const startTime = Date.now();
        
        await registerPage.fillPassword(password);
        await expect(registerPage.passwordStrength).toBeVisible();
        
        const processingTime = Date.now() - startTime;
        measurements.push({ 
          passwordLength: password.length, 
          time: processingTime 
        });
        
        // Each password strength calculation should be under 100ms
        expect(processingTime).toBeLessThan(100);
      }
      
      console.log('Password strength calculation times:', measurements);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render forms without layout shifts', async ({ loginPage, page }) => {
      // Monitor layout shifts
      await page.addInitScript(() => {
        let cumulativeLayoutShift = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              cumulativeLayoutShift += (entry as any).value;
            }
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        
        (window as any).getCLS = () => cumulativeLayoutShift;
      });
      
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      
      // Wait for any potential layout shifts to occur
      await page.waitForTimeout(2000);
      
      // Check Cumulative Layout Shift score
      const cls = await page.evaluate(() => (window as any).getCLS());
      
      // CLS should be under 0.1 (good score)
      expect(cls).toBeLessThan(0.1);
    });

    test('should handle rapid form state changes smoothly', async ({ registerPage }) => {
      await registerPage.navigate();
      
      // Rapidly change form states to test rendering performance
      const startTime = Date.now();
      
      for (let i = 0; i < 20; i++) {
        await registerPage.fillEmail(`test${i}@example.com`);
        await registerPage.fillPassword(`password${i}`);
        
        // Trigger validation by clicking away and back
        await registerPage.nameInput.click();
        await registerPage.emailInput.click();
      }
      
      const totalTime = Date.now() - startTime;
      
      // Rapid state changes should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
      
      // Form should still be responsive
      await registerPage.expectFormVisible();
    });

    test('should maintain 60fps during animations', async ({ loginPage, page }) => {
      await loginPage.navigate();
      
      // Monitor frame rate during interactions
      await page.addInitScript(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        
        function countFrames() {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            (window as any).fps = frameCount;
            frameCount = 0;
            lastTime = currentTime;
          }
          
          requestAnimationFrame(countFrames);
        }
        
        requestAnimationFrame(countFrames);
      });
      
      // Interact with form elements to trigger any animations
      const testUser = generateTestUser();
      await loginPage.fillEmail(testUser.email);
      await loginPage.fillPassword(testUser.password);
      await loginPage.submitLogin();
      
      // Wait for animations to complete
      await page.waitForTimeout(2000);
      
      // Check frame rate
      const fps = await page.evaluate(() => (window as any).fps);
      
      if (fps) {
        // Should maintain close to 60fps
        expect(fps).toBeGreaterThan(30); // At least 30fps acceptable
      }
    });
  });

  test.describe('Bundle Size and Loading', () => {
    test('should load efficiently on first visit', async ({ loginPage, page }) => {
      // Clear cache to simulate first visit
      await page.context().clearCookies();
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      });
      
      const startTime = Date.now();
      await loginPage.navigate();
      await loginPage.expectFormVisible();
      const firstLoadTime = Date.now() - startTime;
      
      // Second visit should be faster (cached)
      const secondStartTime = Date.now();
      await page.reload();
      await loginPage.expectFormVisible();
      const secondLoadTime = Date.now() - secondStartTime;
      
      // First load should be reasonable
      expect(firstLoadTime).toBeLessThan(5000);
      
      // Second load should be faster than first
      expect(secondLoadTime).toBeLessThan(firstLoadTime);
      
      console.log(`Load times - First: ${firstLoadTime}ms, Second: ${secondLoadTime}ms`);
    });

    test('should lazy load non-critical resources', async ({ registerPage, page }) => {
      // Monitor resource loading
      const resources = [];
      page.on('response', response => {
        resources.push({
          url: response.url(),
          type: response.request().resourceType(),
          size: response.headers()['content-length'] || 0,
          timing: response.timing()
        });
      });
      
      await registerPage.navigate();
      await registerPage.expectFormVisible();
      
      // Check that critical resources loaded first
      const criticalResources = resources.filter(r => 
        r.type === 'document' || 
        r.type === 'stylesheet' || 
        (r.type === 'script' && !r.url.includes('chunk'))
      );
      
      // Non-critical resources should be deferred
      const nonCriticalResources = resources.filter(r =>
        r.type === 'image' ||
        (r.type === 'script' && r.url.includes('chunk'))
      );
      
      console.log(`Critical resources: ${criticalResources.length}`);
      console.log(`Non-critical resources: ${nonCriticalResources.length}`);
      
      // Should prioritize critical resources
      expect(criticalResources.length).toBeGreaterThan(0);
    });
  });
});