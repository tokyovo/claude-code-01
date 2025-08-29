import { config } from 'dotenv';
import { knexTestConfig } from './helpers/database';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Ensure test database is set up
  process.env.NODE_ENV = 'test';
  
  // Wait for database to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Clean up any global resources
  if (knexTestConfig) {
    await knexTestConfig.destroy();
  }
});

// Global test configuration
jest.setTimeout(30000); // 30 second timeout for integration tests

// Mock console methods to reduce noise in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});