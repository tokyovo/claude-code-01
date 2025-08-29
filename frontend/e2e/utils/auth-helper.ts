import { Page, expect } from '@playwright/test';
import { generateTestUser, TestUser } from './test-data';

/**
 * Authenticate a user in the browser and save the session
 */
export async function authenticateUser(page: Page, userData?: Partial<TestUser>): Promise<TestUser> {
  const testUser = generateTestUser(userData);
  
  console.log(`🔐 Authenticating user: ${testUser.email}`);

  try {
    // Navigate to login page
    await page.goto('/auth/login');
    await expect(page.getByTestId('login-form')).toBeVisible();

    // Try to register user first (in case they don't exist)
    await registerTestUser(page, testUser);
    
    // Then login
    await loginUser(page, testUser);
    
    // Verify authentication was successful
    await page.waitForURL('/dashboard');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    
    console.log(`✅ User authenticated successfully: ${testUser.email}`);
    return testUser;

  } catch (error) {
    console.error(`❌ Authentication failed for ${testUser.email}:`, error);
    throw error;
  }
}

/**
 * Register a new test user
 */
export async function registerTestUser(page: Page, user: TestUser): Promise<void> {
  console.log(`📝 Registering user: ${user.email}`);
  
  try {
    // Navigate to register page
    await page.goto('/auth/register');
    await expect(page.getByTestId('register-form')).toBeVisible();

    // Fill registration form
    await page.getByTestId('register-name').fill(user.name);
    await page.getByTestId('register-email').fill(user.email);
    await page.getByTestId('register-password').fill(user.password);
    await page.getByTestId('register-confirm-password').fill(user.password);

    // Submit registration
    await page.getByTestId('register-submit').click();

    // Wait for success or handle if user already exists
    try {
      await page.waitForURL('/dashboard', { timeout: 5000 });
      console.log(`✅ User registered successfully: ${user.email}`);
    } catch (error) {
      // User might already exist, check for error message
      const errorMessage = await page.getByTestId('error-message').textContent();
      if (errorMessage?.includes('already exists') || errorMessage?.includes('already registered')) {
        console.log(`ℹ️ User already exists: ${user.email}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`❌ Registration failed for ${user.email}:`, error);
    // Don't throw error if user already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
}

/**
 * Login with existing user credentials
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  console.log(`🔑 Logging in user: ${user.email}`);

  try {
    // Navigate to login page
    await page.goto('/auth/login');
    await expect(page.getByTestId('login-form')).toBeVisible();

    // Fill login form
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);

    // Submit login
    await page.getByTestId('login-submit').click();

    // Wait for successful login redirect
    await page.waitForURL('/dashboard');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    
    console.log(`✅ User logged in successfully: ${user.email}`);
  } catch (error) {
    console.error(`❌ Login failed for ${user.email}:`, error);
    throw error;
  }
}

/**
 * Logout the current user
 */
export async function logoutUser(page: Page): Promise<void> {
  console.log('🚪 Logging out user');

  try {
    // Look for logout button/link
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Wait for redirect to login page
    await page.waitForURL('/auth/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
    
    console.log('✅ User logged out successfully');
  } catch (error) {
    console.error('❌ Logout failed:', error);
    throw error;
  }
}

/**
 * Clear browser authentication state
 */
export async function clearAuthState(page: Page): Promise<void> {
  console.log('🧹 Clearing authentication state');

  try {
    // Clear local storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies
    const context = page.context();
    await context.clearCookies();
    
    console.log('✅ Authentication state cleared');
  } catch (error) {
    console.error('❌ Failed to clear auth state:', error);
    throw error;
  }
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Navigate to a protected route
    await page.goto('/dashboard');
    
    // If we're redirected to login, user is not authenticated
    const currentUrl = page.url();
    return !currentUrl.includes('/auth/login');
  } catch {
    return false;
  }
}

/**
 * Wait for authentication state to be ready
 */
export async function waitForAuthState(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      const token = localStorage.getItem('token');
      return token !== null && token !== 'undefined';
    },
    { timeout }
  );
}