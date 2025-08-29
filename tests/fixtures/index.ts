/**
 * Test fixtures index - exports all factory classes and test scenarios
 */

// Export factory classes
export { UserFactory, userTestScenarios } from './userFactory';
export { TransactionFactory, transactionTestScenarios } from './transactionFactory';
export { BudgetFactory, budgetTestScenarios } from './budgetFactory';

// Export additional factory types that may be needed
export class CategoryFactory {
  private static idCounter = 1;

  static create(overrides: Partial<any> = {}) {
    const id = this.idCounter++;
    const now = new Date().toISOString();

    return {
      id,
      name: `Category ${id}`,
      type: 'expense' as const,
      color: '#007bff',
      icon: 'shopping-cart',
      description: `Test category ${id}`,
      parent_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  static createIncome(overrides: Partial<any> = {}) {
    return this.create({
      name: 'Salary',
      type: 'income',
      color: '#28a745',
      icon: 'dollar-sign',
      description: 'Income category',
      ...overrides,
    });
  }

  static createExpense(overrides: Partial<any> = {}) {
    return this.create({
      name: 'Groceries',
      type: 'expense',
      color: '#dc3545',
      icon: 'shopping-bag',
      description: 'Expense category',
      ...overrides,
    });
  }

  static createSubcategory(parentId: number, overrides: Partial<any> = {}) {
    return this.create({
      parent_id: parentId,
      name: 'Subcategory',
      ...overrides,
    });
  }

  static resetCounter() {
    this.idCounter = 1;
  }
}

export class AccountFactory {
  private static idCounter = 1;

  static create(overrides: Partial<any> = {}) {
    const id = this.idCounter++;
    const now = new Date().toISOString();

    return {
      id,
      user_id: 1,
      name: `Account ${id}`,
      type: 'checking' as const,
      balance: 1000.00,
      currency: 'USD',
      institution: 'Test Bank',
      account_number: `****${id.toString().padStart(4, '0')}`,
      is_active: true,
      include_in_reports: true,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  static createChecking(overrides: Partial<any> = {}) {
    return this.create({
      name: 'Checking Account',
      type: 'checking',
      balance: 2500.00,
      ...overrides,
    });
  }

  static createSavings(overrides: Partial<any> = {}) {
    return this.create({
      name: 'Savings Account',
      type: 'savings',
      balance: 10000.00,
      ...overrides,
    });
  }

  static createCredit(overrides: Partial<any> = {}) {
    return this.create({
      name: 'Credit Card',
      type: 'credit',
      balance: -500.00, // Negative balance for credit cards
      ...overrides,
    });
  }

  static resetCounter() {
    this.idCounter = 1;
  }
}

/**
 * Combined test data builder
 */
export class TestDataBuilder {
  private users: any[] = [];
  private accounts: any[] = [];
  private categories: any[] = [];
  private transactions: any[] = [];
  private budgets: any[] = [];

  /**
   * Add users to the test data set
   */
  addUsers(count: number = 1, overrides: Partial<any> = {}) {
    this.users.push(...UserFactory.createMany(count, overrides));
    return this;
  }

  /**
   * Add accounts to the test data set
   */
  addAccounts(count: number = 1, overrides: Partial<any> = {}) {
    this.accounts.push(...AccountFactory.createMany(count, overrides));
    return this;
  }

  /**
   * Add categories to the test data set
   */
  addCategories(count: number = 1, overrides: Partial<any> = {}) {
    this.categories.push(...CategoryFactory.createMany(count, overrides));
    return this;
  }

  /**
   * Add transactions to the test data set
   */
  addTransactions(count: number = 1, overrides: Partial<any> = {}) {
    this.transactions.push(...TransactionFactory.createMany(count, overrides));
    return this;
  }

  /**
   * Add budgets to the test data set
   */
  addBudgets(count: number = 1, overrides: Partial<any> = {}) {
    this.budgets.push(...BudgetFactory.createMany(count, overrides));
    return this;
  }

  /**
   * Build complete test dataset
   */
  build() {
    return {
      users: this.users,
      accounts: this.accounts,
      categories: this.categories,
      transactions: this.transactions,
      budgets: this.budgets,
    };
  }

  /**
   * Build complete financial scenario
   */
  buildCompleteScenario() {
    // Create a realistic financial scenario
    const user = UserFactory.create();
    const checkingAccount = AccountFactory.createChecking({ user_id: user.id });
    const savingsAccount = AccountFactory.createSavings({ user_id: user.id });
    
    const incomeCategory = CategoryFactory.createIncome();
    const groceryCategory = CategoryFactory.createExpense({ name: 'Groceries' });
    const entertainmentCategory = CategoryFactory.createExpense({ name: 'Entertainment' });
    
    const transactions = [
      ...TransactionFactory.createMany(5, { 
        user_id: user.id, 
        account_id: checkingAccount.id, 
        category_id: incomeCategory.id,
        type: 'income',
      }),
      ...TransactionFactory.createMany(15, { 
        user_id: user.id, 
        account_id: checkingAccount.id, 
        category_id: groceryCategory.id,
        type: 'expense',
      }),
      ...TransactionFactory.createMany(10, { 
        user_id: user.id, 
        account_id: checkingAccount.id, 
        category_id: entertainmentCategory.id,
        type: 'expense',
      }),
    ];
    
    const budgets = [
      BudgetFactory.createMonthly({ 
        user_id: user.id, 
        category_id: groceryCategory.id,
        name: 'Monthly Grocery Budget',
        amount: 400.00,
      }),
      BudgetFactory.createMonthly({ 
        user_id: user.id, 
        category_id: entertainmentCategory.id,
        name: 'Monthly Entertainment Budget',
        amount: 200.00,
      }),
    ];

    return {
      users: [user],
      accounts: [checkingAccount, savingsAccount],
      categories: [incomeCategory, groceryCategory, entertainmentCategory],
      transactions,
      budgets,
    };
  }

  /**
   * Reset all counters
   */
  static resetAllCounters() {
    UserFactory.resetCounter();
    AccountFactory.resetCounter();
    CategoryFactory.resetCounter();
    TransactionFactory.resetCounter();
    BudgetFactory.resetCounter();
  }
}