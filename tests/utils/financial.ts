/**
 * Financial precision testing utilities
 * 
 * This module provides utilities for testing financial calculations
 * with proper precision and rounding to ensure accuracy in monetary operations.
 */

/**
 * Financial precision constants
 */
export const FINANCIAL_CONSTANTS = {
  DECIMAL_PLACES: 2,
  MAX_SAFE_AMOUNT: 999999.99,
  MIN_SAFE_AMOUNT: 0.01,
  ROUNDING_PRECISION: 100, // For 2 decimal places (10^2)
} as const;

/**
 * Financial number utilities
 */
export class FinancialUtils {
  /**
   * Round amount to financial precision (2 decimal places)
   */
  static roundToFinancialPrecision(amount: number): number {
    return Math.round(amount * FINANCIAL_CONSTANTS.ROUNDING_PRECISION) / FINANCIAL_CONSTANTS.ROUNDING_PRECISION;
  }

  /**
   * Check if amount has valid financial precision
   */
  static hasValidFinancialPrecision(amount: number): boolean {
    const rounded = this.roundToFinancialPrecision(amount);
    return Math.abs(amount - rounded) < Number.EPSILON;
  }

  /**
   * Format amount for display (always 2 decimal places)
   */
  static formatAmount(amount: number, currency = 'USD'): string {
    const rounded = this.roundToFinancialPrecision(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: FINANCIAL_CONSTANTS.DECIMAL_PLACES,
      maximumFractionDigits: FINANCIAL_CONSTANTS.DECIMAL_PLACES,
    }).format(rounded);
  }

  /**
   * Add two financial amounts with precision
   */
  static addAmounts(amount1: number, amount2: number): number {
    return this.roundToFinancialPrecision(amount1 + amount2);
  }

  /**
   * Subtract two financial amounts with precision
   */
  static subtractAmounts(amount1: number, amount2: number): number {
    return this.roundToFinancialPrecision(amount1 - amount2);
  }

  /**
   * Multiply amount by factor with precision
   */
  static multiplyAmount(amount: number, factor: number): number {
    return this.roundToFinancialPrecision(amount * factor);
  }

  /**
   * Divide amount by divisor with precision
   */
  static divideAmount(amount: number, divisor: number): number {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return this.roundToFinancialPrecision(amount / divisor);
  }

  /**
   * Calculate percentage of amount
   */
  static calculatePercentage(amount: number, percentage: number): number {
    return this.roundToFinancialPrecision((amount * percentage) / 100);
  }

  /**
   * Validate amount is within safe financial range
   */
  static isValidFinancialAmount(amount: number): boolean {
    return (
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= FINANCIAL_CONSTANTS.MAX_SAFE_AMOUNT &&
      this.hasValidFinancialPrecision(amount)
    );
  }

  /**
   * Generate random financial amount for testing
   */
  static generateRandomAmount(
    min: number = FINANCIAL_CONSTANTS.MIN_SAFE_AMOUNT,
    max: number = 1000
  ): number {
    const random = Math.random() * (max - min) + min;
    return this.roundToFinancialPrecision(random);
  }

  /**
   * Sum array of amounts with precision
   */
  static sumAmounts(amounts: number[]): number {
    const sum = amounts.reduce((total, amount) => total + amount, 0);
    return this.roundToFinancialPrecision(sum);
  }

  /**
   * Find average of amounts with precision
   */
  static averageAmounts(amounts: number[]): number {
    if (amounts.length === 0) {
      return 0;
    }
    const sum = this.sumAmounts(amounts);
    return this.divideAmount(sum, amounts.length);
  }
}

/**
 * Financial test assertions
 */
export class FinancialAssertions {
  /**
   * Assert that a value is a valid financial amount
   */
  static expectValidFinancialAmount(amount: number, message?: string): void {
    const errorMessage = message || `Expected ${amount} to be a valid financial amount`;
    
    expect(Number.isFinite(amount)).toBe(true);
    expect(amount).toBeGreaterThanOrEqual(0);
    expect(amount).toBeLessThanOrEqual(FINANCIAL_CONSTANTS.MAX_SAFE_AMOUNT);
    expect(FinancialUtils.hasValidFinancialPrecision(amount)).toBe(true);
  }

  /**
   * Assert that two financial amounts are equal (within precision)
   */
  static expectFinancialAmountsEqual(actual: number, expected: number, message?: string): void {
    const roundedActual = FinancialUtils.roundToFinancialPrecision(actual);
    const roundedExpected = FinancialUtils.roundToFinancialPrecision(expected);
    
    const errorMessage = message || 
      `Expected ${actual} to equal ${expected} (rounded: ${roundedActual} vs ${roundedExpected})`;
    
    expect(roundedActual).toBe(roundedExpected);
  }

  /**
   * Assert that financial calculation is correct
   */
  static expectFinancialCalculation(
    operation: () => number,
    expected: number,
    operationDescription?: string
  ): void {
    const result = operation();
    const description = operationDescription || 'financial calculation';
    
    this.expectValidFinancialAmount(result, `Result of ${description} should be valid`);
    this.expectFinancialAmountsEqual(result, expected, `${description} result`);
  }

  /**
   * Assert that amount has proper precision
   */
  static expectProperPrecision(amount: number, decimalPlaces: number = 2): void {
    const factor = Math.pow(10, decimalPlaces);
    const rounded = Math.round(amount * factor) / factor;
    
    expect(Math.abs(amount - rounded)).toBeLessThan(Number.EPSILON);
  }

  /**
   * Assert financial amount is positive
   */
  static expectPositiveAmount(amount: number): void {
    this.expectValidFinancialAmount(amount);
    expect(amount).toBeGreaterThan(0);
  }

  /**
   * Assert financial amount is zero or positive
   */
  static expectNonNegativeAmount(amount: number): void {
    this.expectValidFinancialAmount(amount);
    expect(amount).toBeGreaterThanOrEqual(0);
  }
}

/**
 * Financial test scenarios generator
 */
export class FinancialTestScenarios {
  /**
   * Generate test cases for basic arithmetic operations
   */
  static getArithmeticTestCases() {
    return [
      // Addition tests
      {
        operation: 'addition',
        values: [10.50, 20.25],
        expected: 30.75,
        description: 'adding two positive amounts',
      },
      {
        operation: 'addition',
        values: [0.01, 0.02],
        expected: 0.03,
        description: 'adding very small amounts',
      },
      {
        operation: 'addition',
        values: [999.99, 0.01],
        expected: 1000.00,
        description: 'adding near maximum amounts',
      },

      // Subtraction tests
      {
        operation: 'subtraction',
        values: [100.00, 25.50],
        expected: 74.50,
        description: 'subtracting positive amounts',
      },
      {
        operation: 'subtraction',
        values: [50.00, 50.00],
        expected: 0.00,
        description: 'subtracting equal amounts',
      },

      // Multiplication tests
      {
        operation: 'multiplication',
        values: [25.00, 0.1],
        expected: 2.50,
        description: 'multiplying by decimal factor',
      },
      {
        operation: 'multiplication',
        values: [99.99, 2],
        expected: 199.98,
        description: 'multiplying by integer factor',
      },

      // Division tests
      {
        operation: 'division',
        values: [100.00, 4],
        expected: 25.00,
        description: 'dividing by integer',
      },
      {
        operation: 'division',
        values: [33.33, 3],
        expected: 11.11,
        description: 'dividing with rounding',
      },
    ];
  }

  /**
   * Generate edge cases for financial calculations
   */
  static getEdgeCases() {
    return [
      {
        value: 0.00,
        description: 'zero amount',
        shouldBeValid: true,
      },
      {
        value: 0.01,
        description: 'minimum valid amount',
        shouldBeValid: true,
      },
      {
        value: 999999.99,
        description: 'maximum valid amount',
        shouldBeValid: true,
      },
      {
        value: -0.01,
        description: 'negative amount',
        shouldBeValid: false,
      },
      {
        value: 1000000.00,
        description: 'amount over maximum',
        shouldBeValid: false,
      },
      {
        value: 0.001,
        description: 'amount with too much precision',
        shouldBeValid: false,
      },
      {
        value: NaN,
        description: 'NaN value',
        shouldBeValid: false,
      },
      {
        value: Infinity,
        description: 'infinite value',
        shouldBeValid: false,
      },
    ];
  }

  /**
   * Generate percentage calculation test cases
   */
  static getPercentageTestCases() {
    return [
      {
        amount: 100.00,
        percentage: 10,
        expected: 10.00,
        description: '10% of $100',
      },
      {
        amount: 33.33,
        percentage: 50,
        expected: 16.67,
        description: '50% of $33.33 (rounding)',
      },
      {
        amount: 1000.00,
        percentage: 2.5,
        expected: 25.00,
        description: '2.5% of $1000',
      },
      {
        amount: 99.99,
        percentage: 100,
        expected: 99.99,
        description: '100% of amount',
      },
      {
        amount: 50.00,
        percentage: 0,
        expected: 0.00,
        description: '0% of amount',
      },
    ];
  }

  /**
   * Generate budget calculation scenarios
   */
  static getBudgetScenarios() {
    return [
      {
        budgetAmount: 500.00,
        spentAmounts: [100.50, 200.25, 150.00],
        expectedTotal: 450.75,
        expectedRemaining: 49.25,
        expectedPercentage: 90.15,
        description: 'typical budget scenario',
      },
      {
        budgetAmount: 1000.00,
        spentAmounts: [999.99],
        expectedTotal: 999.99,
        expectedRemaining: 0.01,
        expectedPercentage: 99.999,
        description: 'nearly exhausted budget',
      },
      {
        budgetAmount: 100.00,
        spentAmounts: [25.00, 25.00, 25.00, 25.00],
        expectedTotal: 100.00,
        expectedRemaining: 0.00,
        expectedPercentage: 100.00,
        description: 'exactly exhausted budget',
      },
    ];
  }
}

/**
 * Performance testing utilities for financial operations
 */
export class FinancialPerformanceUtils {
  /**
   * Benchmark financial operation performance
   */
  static benchmarkOperation(
    operation: () => number,
    iterations: number = 1000,
    description: string = 'financial operation'
  ): { result: number; averageTime: number; totalTime: number } {
    const startTime = performance.now();
    let result = 0;

    for (let i = 0; i < iterations; i++) {
      result = operation();
    }

    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / iterations;

    console.log(`${description}: ${averageTime.toFixed(4)}ms average, ${totalTime.toFixed(2)}ms total`);

    return {
      result,
      averageTime,
      totalTime,
    };
  }

  /**
   * Test financial operations under load
   */
  static stressTestFinancialOperations(operationsCount: number = 10000): {
    success: boolean;
    errors: Error[];
    averageTime: number;
  } {
    const errors: Error[] = [];
    const startTime = performance.now();

    for (let i = 0; i < operationsCount; i++) {
      try {
        const amount1 = FinancialUtils.generateRandomAmount();
        const amount2 = FinancialUtils.generateRandomAmount();
        
        const sum = FinancialUtils.addAmounts(amount1, amount2);
        const difference = FinancialUtils.subtractAmounts(sum, amount1);
        
        // Verify precision is maintained
        if (!FinancialUtils.hasValidFinancialPrecision(sum) ||
            !FinancialUtils.hasValidFinancialPrecision(difference)) {
          throw new Error(`Precision lost in operation ${i}`);
        }
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / operationsCount;

    return {
      success: errors.length === 0,
      errors,
      averageTime,
    };
  }
}