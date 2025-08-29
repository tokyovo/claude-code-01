/**
 * Budget factory for generating test budget data
 */
export class BudgetFactory {
  private static idCounter = 1;

  /**
   * Create a base budget object
   */
  static create(overrides: Partial<any> = {}) {
    const id = this.idCounter++;
    const now = new Date().toISOString();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return {
      id,
      user_id: 1,
      category_id: 1,
      name: `Test Budget ${id}`,
      amount: 500.00,
      period: 'monthly' as const,
      start_date: startOfMonth.toISOString().split('T')[0],
      end_date: null,
      alert_threshold: 80, // Alert at 80% of budget
      alert_enabled: true,
      rollover_unused: false,
      is_active: true,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create a monthly budget
   */
  static createMonthly(overrides: Partial<any> = {}) {
    return this.create({
      period: 'monthly',
      name: 'Monthly Budget',
      amount: 1000.00,
      ...overrides,
    });
  }

  /**
   * Create a weekly budget
   */
  static createWeekly(overrides: Partial<any> = {}) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.create({
      period: 'weekly',
      name: 'Weekly Budget',
      amount: 200.00,
      start_date: startOfWeek.toISOString().split('T')[0],
      ...overrides,
    });
  }

  /**
   * Create a yearly budget
   */
  static createYearly(overrides: Partial<any> = {}) {
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    return this.create({
      period: 'yearly',
      name: 'Yearly Budget',
      amount: 12000.00,
      start_date: startOfYear.toISOString().split('T')[0],
      ...overrides,
    });
  }

  /**
   * Create a custom period budget
   */
  static createCustom(startDate: string, endDate: string, overrides: Partial<any> = {}) {
    return this.create({
      period: 'custom',
      name: 'Custom Budget',
      start_date: startDate,
      end_date: endDate,
      ...overrides,
    });
  }

  /**
   * Create budget with rollover enabled
   */
  static createWithRollover(overrides: Partial<any> = {}) {
    return this.create({
      rollover_unused: true,
      name: 'Rollover Budget',
      ...overrides,
    });
  }

  /**
   * Create budget with no alerts
   */
  static createNoAlerts(overrides: Partial<any> = {}) {
    return this.create({
      alert_enabled: false,
      alert_threshold: null,
      name: 'No Alerts Budget',
      ...overrides,
    });
  }

  /**
   * Create inactive budget
   */
  static createInactive(overrides: Partial<any> = {}) {
    return this.create({
      is_active: false,
      name: 'Inactive Budget',
      ...overrides,
    });
  }

  /**
   * Create expired budget
   */
  static createExpired(overrides: Partial<any> = {}) {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    
    const endOfLastMonth = new Date();
    endOfLastMonth.setMonth(endOfLastMonth.getMonth(), 0);

    return this.create({
      period: 'custom',
      name: 'Expired Budget',
      start_date: lastMonth.toISOString().split('T')[0],
      end_date: endOfLastMonth.toISOString().split('T')[0],
      is_active: false,
      ...overrides,
    });
  }

  /**
   * Create multiple budgets
   */
  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create budgets for different categories
   */
  static createForCategories(categoryIds: number[]) {
    return categoryIds.map(categoryId => this.create({
      category_id: categoryId,
      name: `Budget for Category ${categoryId}`,
    }));
  }

  /**
   * Create budgets with different alert thresholds
   */
  static createWithDifferentAlerts() {
    return [
      this.create({ alert_threshold: 50, name: 'Low Alert Budget' }),
      this.create({ alert_threshold: 80, name: 'Medium Alert Budget' }),
      this.create({ alert_threshold: 95, name: 'High Alert Budget' }),
    ];
  }

  /**
   * Reset the ID counter
   */
  static resetCounter() {
    this.idCounter = 1;
  }

  /**
   * Create valid financial amount for budget
   */
  static createValidAmount(baseAmount: number = 500): number {
    return Math.round(baseAmount * 100) / 100;
  }

  /**
   * Create budget with spending progress
   */
  static createWithProgress(spentPercentage: number = 50, overrides: Partial<any> = {}) {
    const budget = this.create(overrides);
    const spentAmount = Math.round((budget.amount * spentPercentage / 100) * 100) / 100;
    
    return {
      ...budget,
      spent_amount: spentAmount,
      remaining_amount: budget.amount - spentAmount,
      progress_percentage: spentPercentage,
    };
  }
}

/**
 * Budget test scenarios
 */
export const budgetTestScenarios = {
  validMonthly: {
    name: 'Groceries',
    amount: 400.00,
    period: 'monthly',
    category_id: 1,
    alert_threshold: 80,
  },

  validWeekly: {
    name: 'Entertainment',
    amount: 100.00,
    period: 'weekly',
    category_id: 2,
    alert_threshold: 75,
  },

  invalidAmount: {
    name: 'Invalid Budget',
    amount: -100.00, // Negative amount
    period: 'monthly',
    category_id: 1,
  },

  zeroAmount: {
    name: 'Zero Budget',
    amount: 0.00,
    period: 'monthly',
    category_id: 1,
  },

  missingRequiredFields: {
    // Missing name, amount, period, category_id
  },

  invalidPeriod: {
    name: 'Invalid Period Budget',
    amount: 500.00,
    period: 'invalid_period',
    category_id: 1,
  },

  invalidAlertThreshold: {
    name: 'Invalid Alert Budget',
    amount: 500.00,
    period: 'monthly',
    category_id: 1,
    alert_threshold: 150, // Over 100%
  },

  tooLongName: {
    name: 'A'.repeat(256), // Too long name
    amount: 500.00,
    period: 'monthly',
    category_id: 1,
  },

  customPeriodValid: {
    name: 'Custom Period Budget',
    amount: 1000.00,
    period: 'custom',
    category_id: 1,
    start_date: '2024-01-01',
    end_date: '2024-03-31',
  },

  customPeriodInvalid: {
    name: 'Invalid Custom Budget',
    amount: 1000.00,
    period: 'custom',
    category_id: 1,
    start_date: '2024-03-31',
    end_date: '2024-01-01', // End before start
  },

  precisionTest: {
    name: 'Precision Budget',
    amount: 123.456789, // More than 2 decimal places
    period: 'monthly',
    category_id: 1,
  },
};