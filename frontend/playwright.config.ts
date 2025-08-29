import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Timeout for each test
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    // Maximum time expect() should wait for the condition to be met.
    timeout: 5000,
    // Threshold for screenshot comparisons
    threshold: 0.2,
    // Maximum allowed pixel difference for screenshots
    toHaveScreenshot: { threshold: 0.2, mode: 'pixel' },
    // Maximum allowed pixel difference for page screenshots
    toMatchSnapshot: { threshold: 0.2 },
  },

  // Global test setup
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['line']
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:3002',
    
    // API endpoint for backend requests
    // @ts-ignore
    apiURL: 'http://localhost:3001',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot after each test failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Maximum time each action such as `click()` can take
    actionTimeout: 10000,
    
    // Maximum time navigation can take
    navigationTimeout: 15000,
    
    // Maximum time page.waitForLoadState() can take
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100, // Slow down by 100ms in non-CI environments
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state for authenticated tests
        storageState: 'e2e/auth/user.json',
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'e2e/auth/user.json',
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'e2e/auth/user.json',
      },
    },

    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 7'],
        storageState: 'e2e/auth/user.json',
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 14'],
        storageState: 'e2e/auth/user.json',
      },
    },

    // Authentication setup projects
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // Tests that don't require authentication
    {
      name: 'auth-tests',
      testMatch: /auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // Don't load any authentication state for auth tests
      },
    },

    // Tests that require authentication - depend on auth setup
    {
      name: 'authenticated',
      testMatch: /authenticated\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/user.json',
      },
    },

    // Cross-browser authenticated tests
    {
      name: 'cross-browser-auth',
      testMatch: /cross-browser\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: 'e2e/auth/user.json',
      },
    },

    // Performance tests
    {
      name: 'performance',
      testMatch: /performance\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/user.json',
      },
    },

    // Accessibility tests  
    {
      name: 'accessibility',
      testMatch: /accessibility\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/user.json',
      },
    },

    // Visual regression tests
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/user.json',
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Uncomment if you want Playwright to also start the backend
    // {
    //   command: 'cd ../backend && npm run dev',
    //   url: 'http://localhost:3001',
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 120 * 1000,
    // }
  ],

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'test-results/',

  // Whether to update snapshots
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
});