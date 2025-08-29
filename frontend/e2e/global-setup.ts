import { chromium, FullConfig } from '@playwright/test';
import { authenticateUser } from './utils/auth-helper';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    await page.goto('/');
    console.log('✅ Application is accessible');

    // Set up authentication state for tests that need it
    await authenticateUser(page);
    
    // Save authenticated state
    await context.storageState({ path: 'e2e/auth/user.json' });
    console.log('✅ Authentication state saved');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;