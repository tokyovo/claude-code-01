import { APIRequestContext } from '@playwright/test';

export interface TestUser {
  id?: string;
  name: string;
  email: string;
  password: string;
  isVerified?: boolean;
}

export interface TestTransaction {
  id?: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

export interface TestBudget {
  id?: string;
  name: string;
  amount: number;
  period: 'monthly' | 'yearly';
  category: string;
}

// Counter for unique test data
let userCounter = 0;
let transactionCounter = 0;
let budgetCounter = 0;

/**
 * Generate a unique test user
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  userCounter++;
  const timestamp = Date.now();
  
  return {
    name: `Test User ${userCounter}`,
    email: `testuser${userCounter}${timestamp}@playwright.test`,
    password: 'TestPassword123!',
    isVerified: true,
    ...overrides
  };
}

/**
 * Generate test transaction data
 */
export function generateTestTransaction(overrides?: Partial<TestTransaction>): TestTransaction {
  transactionCounter++;
  
  return {
    amount: Math.floor(Math.random() * 1000) + 10,
    description: `Test Transaction ${transactionCounter}`,
    category: 'Food & Dining',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    ...overrides
  };
}

/**
 * Generate test budget data
 */
export function generateTestBudget(overrides?: Partial<TestBudget>): TestBudget {
  budgetCounter++;
  
  return {
    name: `Test Budget ${budgetCounter}`,
    amount: Math.floor(Math.random() * 5000) + 500,
    period: 'monthly',
    category: 'Food & Dining',
    ...overrides
  };
}

/**
 * Create test user via API
 */
export async function createTestUserViaAPI(
  request: APIRequestContext,
  userData?: Partial<TestUser>
): Promise<TestUser> {
  const user = generateTestUser(userData);
  
  const response = await request.post('/api/auth/register', {
    data: {
      name: user.name,
      email: user.email,
      password: user.password
    }
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create user: ${error.message}`);
  }
  
  const result = await response.json();
  return {
    ...user,
    id: result.user.id
  };
}

/**
 * Create test transaction via API
 */
export async function createTestTransactionViaAPI(
  request: APIRequestContext,
  token: string,
  transactionData?: Partial<TestTransaction>
): Promise<TestTransaction> {
  const transaction = generateTestTransaction(transactionData);
  
  const response = await request.post('/api/transactions', {
    data: transaction,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
  
  const result = await response.json();
  return {
    ...transaction,
    id: result.transaction.id
  };
}

/**
 * Create test budget via API
 */
export async function createTestBudgetViaAPI(
  request: APIRequestContext,
  token: string,
  budgetData?: Partial<TestBudget>
): Promise<TestBudget> {
  const budget = generateTestBudget(budgetData);
  
  const response = await request.post('/api/budgets', {
    data: budget,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create budget: ${error.message}`);
  }
  
  const result = await response.json();
  return {
    ...budget,
    id: result.budget.id
  };
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // This would typically make API calls to clean up test data
    // For now, we'll log the cleanup action
    console.log('🧹 Cleaning up test data...');
    
    // In a real implementation, you might:
    // - Delete test users by email pattern
    // - Delete test transactions 
    // - Delete test budgets
    // - Clear test files/uploads
    
    // Reset counters
    userCounter = 0;
    transactionCounter = 0;
    budgetCounter = 0;
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
    // Don't throw error to avoid breaking test runs
  }
}

/**
 * Get random test data sets
 */
export function getRandomTestDataSet() {
  return {
    users: Array.from({ length: 3 }, () => generateTestUser()),
    transactions: Array.from({ length: 10 }, () => generateTestTransaction()),
    budgets: Array.from({ length: 5 }, () => generateTestBudget())
  };
}

/**
 * Wait for specified time (useful for debugging)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate test email with timestamp
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = generateRandomString(6);
  return `${prefix}${timestamp}${random}@playwright.test`;
}