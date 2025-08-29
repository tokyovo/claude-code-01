import { Page, Response } from '@playwright/test';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

export interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

/**
 * Create a test user via direct API call
 */
export async function createTestUser(userData: TestUser): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Cleanup test user via direct API call
 */
export async function cleanupTestUser(email: string): Promise<void> {
  // This would require an admin endpoint or direct database access
  // For now, we'll just make a best effort cleanup
  try {
    // In a real implementation, you might have an admin endpoint like:
    // await fetch(`${API_BASE_URL}/admin/users/${email}`, { method: 'DELETE' });
    
    // Or use direct database connection in test environment
    console.log(`Cleaning up test user: ${email}`);
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}

/**
 * Wait for specific API response during page interactions
 */
export async function waitForApiResponse(
  page: Page, 
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
): Promise<Response> {
  return page.waitForResponse(response => 
    response.url().includes(endpoint) && 
    response.request().method() === method
  );
}

/**
 * Login a user programmatically and get tokens
 */
export async function loginUser(userData: { email: string; password: string }): Promise<{
  accessToken: string;
  refreshToken: string;
  user: any;
}> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract refresh token from cookies
  const cookies = response.headers.get('set-cookie') || '';
  const refreshTokenMatch = cookies.match(/refreshToken=([^;]+)/);
  const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : '';

  return {
    accessToken: data.data.tokens.accessToken,
    refreshToken,
    user: data.data.user,
  };
}

/**
 * Set authentication state in browser
 */
export async function setAuthState(page: Page, authData: {
  user: any;
  token: string;
  refreshToken?: string;
}): Promise<void> {
  await page.evaluate((data) => {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Set Redux persist state if using Redux Persist
    const authState = {
      user: data.user,
      token: data.token,
      refreshToken: data.refreshToken || null,
      isAuthenticated: true,
      isLoading: false,
      lastActivity: Date.now(),
      sessionExpiry: Date.now() + (15 * 60 * 1000), // 15 minutes
    };

    localStorage.setItem('persist:auth', JSON.stringify({
      ...authState,
      _persist: {
        version: 1,
        rehydrated: true
      }
    }));
  }, authData);

  // Set refresh token cookie if provided
  if (authData.refreshToken) {
    await page.context().addCookies([{
      name: 'refreshToken',
      value: authData.refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Strict'
    }]);
  }
}

/**
 * Clear all authentication state
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('persist:auth');
    
    // Clear all localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth') || key.startsWith('persist')) {
        localStorage.removeItem(key);
      }
    });
  });

  // Clear cookies
  await page.context().clearCookies();
}

/**
 * Mock API responses for testing
 */
export async function mockApiResponse(
  page: Page, 
  endpoint: string, 
  response: any, 
  status = 200
): Promise<void> {
  await page.route(`**${endpoint}*`, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Mock network failure
 */
export async function mockNetworkFailure(page: Page, endpoint: string): Promise<void> {
  await page.route(`**${endpoint}*`, route => {
    route.abort('failed');
  });
}

/**
 * Wait for element to be stable (no animation/movement)
 */
export async function waitForStableElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  
  // Wait for any animations to complete
  await page.waitForTimeout(100);
  
  // Check element is stable by comparing positions
  const box1 = await element.boundingBox();
  await page.waitForTimeout(100);
  const box2 = await element.boundingBox();
  
  if (box1 && box2) {
    if (box1.x !== box2.x || box1.y !== box2.y) {
      // Element is still moving, wait more
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Fill form with typing delay for more realistic interaction
 */
export async function fillFormSlowly(
  page: Page, 
  selector: string, 
  value: string, 
  delay = 100
): Promise<void> {
  await page.click(selector);
  await page.type(selector, value, { delay });
}

/**
 * Check if element has specific CSS class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
  return await page.evaluate(
    ({ selector, className }) => {
      const element = document.querySelector(selector);
      return element ? element.classList.contains(className) : false;
    }, 
    { selector, className }
  );
}

/**
 * Wait for loading states to complete
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.loading, .spinner, [data-loading="true"]', { 
    state: 'hidden', 
    timeout: 10000 
  }).catch(() => {
    // Ignore if no loading indicators found
  });

  // Wait for network idle
  await page.waitForLoadState('networkidle');
}

/**
 * Simulate slow network conditions
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  await page.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    route.continue();
  });
}

/**
 * Take screenshot on failure for debugging
 */
export async function takeFailureScreenshot(page: Page, testName: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `failure-${testName}-${timestamp}.png`;
  
  try {
    await page.screenshot({ 
      path: `test-results/screenshots/${filename}`,
      fullPage: true 
    });
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
}

/**
 * Check console for errors
 */
export async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Measure page performance metrics
 */
export async function measurePerformance(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
}> {
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    };
  });

  return performanceMetrics;
}

/**
 * Verify accessibility attributes
 */
export async function checkAccessibility(page: Page, selector: string): Promise<{
  hasAriaLabel: boolean;
  hasRole: boolean;
  hasTabIndex: boolean;
  isFocusable: boolean;
}> {
  return await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) {
      return {
        hasAriaLabel: false,
        hasRole: false,
        hasTabIndex: false,
        isFocusable: false,
      };
    }

    return {
      hasAriaLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
      hasRole: element.hasAttribute('role'),
      hasTabIndex: element.hasAttribute('tabindex'),
      isFocusable: element.getAttribute('tabindex') !== '-1' && 
                   !element.hasAttribute('disabled') &&
                   ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName),
    };
  }, selector);
}

/**
 * Simulate different viewport sizes
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
};

/**
 * Test responsive design across viewports
 */
export async function testResponsiveDesign(
  page: Page, 
  testFunction: (viewport: { width: number; height: number }) => Promise<void>
): Promise<void> {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    console.log(`Testing ${name} viewport (${viewport.width}x${viewport.height})`);
    await page.setViewportSize(viewport);
    await testFunction(viewport);
  }
}

/**
 * Generate random test data
 */
export const generateTestData = {
  email: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  password: () => `TestPass@${Math.random().toString(36).substring(2, 8)}`,
  name: () => `Test${Math.random().toString(36).substring(2, 8)}`,
  phone: () => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
};

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Operation failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry failed');
}