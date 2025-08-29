import { FullConfig } from '@playwright/test';
import { cleanupTestData } from './utils/test-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test cleanup...');

  try {
    // Clean up test data from database
    await cleanupTestData();
    console.log('✅ Test data cleaned up');

    // Remove auth state files
    const fs = await import('fs');
    const path = await import('path');
    
    const authFiles = [
      'e2e/auth/user.json',
      'e2e/auth/admin.json'
    ];

    for (const file of authFiles) {
      const filePath = path.resolve(file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed ${file}`);
      }
    }

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid breaking the test run
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;