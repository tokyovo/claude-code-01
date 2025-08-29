import { test as baseTest, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { RegisterPage } from '../pages/register-page';
import { ForgotPasswordPage } from '../pages/forgot-password-page';
import { DashboardPage } from '../pages/dashboard-page';
import { generateTestUser, TestUser } from '../utils/test-data';
import { authenticateUser, clearAuthState } from '../utils/auth-helper';

// Define custom fixtures
export interface TestFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  forgotPasswordPage: ForgotPasswordPage;
  dashboardPage: DashboardPage;
  testUser: TestUser;
  authenticatedUser: TestUser;
}

// Extend the base test with our custom fixtures
export const test = baseTest.extend<TestFixtures>({
  // Login page fixture
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  // Register page fixture
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  // Forgot password page fixture
  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },

  // Dashboard page fixture
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Test user fixture - creates a new test user for each test
  testUser: async ({}, use) => {
    const user = generateTestUser();
    await use(user);
  },

  // Authenticated user fixture - creates and authenticates a user
  authenticatedUser: async ({ page, testUser }, use) => {
    // Clear any existing auth state
    await clearAuthState(page);
    
    // Authenticate the test user
    const authenticatedUser = await authenticateUser(page, testUser);
    
    await use(authenticatedUser);
    
    // Cleanup after test
    await clearAuthState(page);
  },
});

// Export expect for convenience
export { expect } from '@playwright/test';