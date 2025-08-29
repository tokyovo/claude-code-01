/**
 * Transaction factory for generating test transaction data
 */
export class TransactionFactory {
  private static idCounter = 1;

  /**
   * Create a base transaction object
   */
  static create(overrides: Partial<any> = {}) {
    const id = this.idCounter++;
    const now = new Date().toISOString();

    return {
      id,
      user_id: 1,
      account_id: 1,
      category_id: 1,
      type: 'expense' as const,
      amount: 50.99,
      description: `Test transaction ${id}`,
      date: now.split('T')[0], // YYYY-MM-DD format
      tags: ['test', 'automated'],
      receipt_url: null,
      location: null,
      notes: null,
      is_recurring: false,
      recurring_pattern: null,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create an income transaction
   */
  static createIncome(overrides: Partial<any> = {}) {
    return this.create({
      type: 'income',
      amount: 2500.00,
      description: 'Salary payment',
      category_id: 2, // Assume income category
      ...overrides,
    });
  }

  /**
   * Create an expense transaction
   */
  static createExpense(overrides: Partial<any> = {}) {
    return this.create({
      type: 'expense',
      amount: 75.50,
      description: 'Grocery shopping',
      category_id: 3, // Assume expense category
      ...overrides,
    });
  }

  /**
   * Create a transfer transaction
   */
  static createTransfer(overrides: Partial<any> = {}) {
    return this.create({
      type: 'transfer',
      amount: 200.00,
      description: 'Transfer between accounts',
      category_id: null, // Transfers might not have categories
      transfer_account_id: 2,
      ...overrides,
    });
  }

  /**
   * Create a transaction with receipt
   */
  static createWithReceipt(overrides: Partial<any> = {}) {
    return this.create({
      receipt_url: '/uploads/receipts/test-receipt.pdf',
      description: 'Restaurant bill',
      location: 'Downtown Restaurant',
      ...overrides,
    });
  }

  /**
   * Create a recurring transaction
   */
  static createRecurring(overrides: Partial<any> = {}) {
    return this.create({
      is_recurring: true,
      recurring_pattern: {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 1,
        end_date: null,
      },
      description: 'Monthly subscription',
      amount: 9.99,
      ...overrides,
    });
  }

  /**
   * Create a large transaction (for testing limits)
   */
  static createLarge(overrides: Partial<any> = {}) {
    return this.create({
      amount: 9999.99,
      description: 'Large expense',
      ...overrides,
    });
  }

  /**
   * Create multiple transactions
   */
  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create transactions for date range
   */
  static createForDateRange(startDate: string, endDate: string, count: number = 5) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return Array.from({ length: count }, (_, index) => {
      const randomDays = Math.floor(Math.random() * daysDiff);
      const transactionDate = new Date(start.getTime() + randomDays * 24 * 60 * 60 * 1000);
      
      return this.create({
        date: transactionDate.toISOString().split('T')[0],
        amount: Math.round((Math.random() * 500 + 10) * 100) / 100, // Random amount 10-510
      });
    });
  }

  /**
   * Create transactions by type distribution
   */
  static createMixed(totalCount: number) {
    const incomeCount = Math.floor(totalCount * 0.2); // 20% income
    const expenseCount = Math.floor(totalCount * 0.75); // 75% expenses
    const transferCount = totalCount - incomeCount - expenseCount; // Remaining transfers

    return [
      ...Array.from({ length: incomeCount }, () => this.createIncome()),
      ...Array.from({ length: expenseCount }, () => this.createExpense()),
      ...Array.from({ length: transferCount }, () => this.createTransfer()),
    ];
  }

  /**
   * Reset the ID counter
   */
  static resetCounter() {
    this.idCounter = 1;
  }

  /**
   * Create valid financial amounts for testing precision
   */
  static createValidAmount(baseAmount: number = 100): number {
    // Ensure proper financial precision (2 decimal places)
    return Math.round(baseAmount * 100) / 100;
  }

  /**
   * Create transaction for specific category testing
   */
  static createForCategory(categoryId: number, overrides: Partial<any> = {}) {
    return this.create({
      category_id: categoryId,
      ...overrides,
    });
  }
}

/**
 * Transaction test scenarios
 */
export const transactionTestScenarios = {
  validExpense: {
    type: 'expense',
    amount: 25.99,
    description: 'Coffee shop',
    category_id: 1,
    date: new Date().toISOString().split('T')[0],
  },

  validIncome: {
    type: 'income',
    amount: 3000.00,
    description: 'Freelance payment',
    category_id: 2,
    date: new Date().toISOString().split('T')[0],
  },

  invalidAmount: {
    type: 'expense',
    amount: -50.00, // Negative amount should be invalid
    description: 'Invalid transaction',
    category_id: 1,
    date: new Date().toISOString().split('T')[0],
  },

  missingRequiredFields: {
    // Missing type, amount, description, category_id
    date: new Date().toISOString().split('T')[0],
  },

  futureDate: {
    type: 'expense',
    amount: 100.00,
    description: 'Future transaction',
    category_id: 1,
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },

  tooLongDescription: {
    type: 'expense',
    amount: 50.00,
    description: 'A'.repeat(1001), // Too long description
    category_id: 1,
    date: new Date().toISOString().split('T')[0],
  },

  precisionTest: {
    type: 'expense',
    amount: 123.456789, // More than 2 decimal places
    description: 'Precision test',
    category_id: 1,
    date: new Date().toISOString().split('T')[0],
  },

  zeroAmount: {
    type: 'expense',
    amount: 0.00,
    description: 'Zero amount transaction',
    category_id: 1,
    date: new Date().toISOString().split('T')[0],
  },
};