import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  FinancialUtils,
  FinancialAssertions,
  FinancialTestScenarios,
  FinancialPerformanceUtils,
  FINANCIAL_CONSTANTS,
} from '../../utils/financial';

describe('Financial Utilities', () => {
  describe('FinancialUtils', () => {
    describe('roundToFinancialPrecision', () => {
      it('should round amounts to 2 decimal places', () => {
        expect(FinancialUtils.roundToFinancialPrecision(1.234)).toBe(1.23);
        expect(FinancialUtils.roundToFinancialPrecision(1.235)).toBe(1.24);
        expect(FinancialUtils.roundToFinancialPrecision(1.236)).toBe(1.24);
      });

      it('should handle edge cases', () => {
        expect(FinancialUtils.roundToFinancialPrecision(0)).toBe(0);
        expect(FinancialUtils.roundToFinancialPrecision(0.001)).toBe(0);
        expect(FinancialUtils.roundToFinancialPrecision(0.005)).toBe(0.01);
        expect(FinancialUtils.roundToFinancialPrecision(999999.995)).toBe(1000000);
      });

      it('should preserve already correctly rounded amounts', () => {
        expect(FinancialUtils.roundToFinancialPrecision(10.50)).toBe(10.50);
        expect(FinancialUtils.roundToFinancialPrecision(0.01)).toBe(0.01);
        expect(FinancialUtils.roundToFinancialPrecision(100.00)).toBe(100.00);
      });
    });

    describe('hasValidFinancialPrecision', () => {
      it('should validate amounts with correct precision', () => {
        expect(FinancialUtils.hasValidFinancialPrecision(10.50)).toBe(true);
        expect(FinancialUtils.hasValidFinancialPrecision(0.01)).toBe(true);
        expect(FinancialUtils.hasValidFinancialPrecision(100.00)).toBe(true);
      });

      it('should reject amounts with incorrect precision', () => {
        expect(FinancialUtils.hasValidFinancialPrecision(10.501)).toBe(false);
        expect(FinancialUtils.hasValidFinancialPrecision(0.001)).toBe(false);
        expect(FinancialUtils.hasValidFinancialPrecision(100.123)).toBe(false);
      });
    });

    describe('arithmetic operations', () => {
      it('should add amounts with proper precision', () => {
        expect(FinancialUtils.addAmounts(10.50, 20.25)).toBe(30.75);
        expect(FinancialUtils.addAmounts(0.01, 0.02)).toBe(0.03);
        expect(FinancialUtils.addAmounts(999.99, 0.01)).toBe(1000.00);
      });

      it('should subtract amounts with proper precision', () => {
        expect(FinancialUtils.subtractAmounts(30.75, 10.50)).toBe(20.25);
        expect(FinancialUtils.subtractAmounts(100.00, 99.99)).toBe(0.01);
        expect(FinancialUtils.subtractAmounts(50.00, 50.00)).toBe(0.00);
      });

      it('should multiply amounts with proper precision', () => {
        expect(FinancialUtils.multiplyAmount(25.00, 2)).toBe(50.00);
        expect(FinancialUtils.multiplyAmount(33.33, 0.1)).toBe(3.33);
        expect(FinancialUtils.multiplyAmount(99.99, 1.5)).toBe(149.99);
      });

      it('should divide amounts with proper precision', () => {
        expect(FinancialUtils.divideAmount(100.00, 4)).toBe(25.00);
        expect(FinancialUtils.divideAmount(33.33, 3)).toBe(11.11);
        expect(FinancialUtils.divideAmount(50.00, 2)).toBe(25.00);
      });

      it('should handle division by zero', () => {
        expect(() => FinancialUtils.divideAmount(100.00, 0)).toThrow('Cannot divide by zero');
      });
    });

    describe('percentage calculations', () => {
      it('should calculate percentages correctly', () => {
        expect(FinancialUtils.calculatePercentage(100.00, 10)).toBe(10.00);
        expect(FinancialUtils.calculatePercentage(200.00, 50)).toBe(100.00);
        expect(FinancialUtils.calculatePercentage(33.33, 50)).toBe(16.67);
      });

      it('should handle edge case percentages', () => {
        expect(FinancialUtils.calculatePercentage(100.00, 0)).toBe(0.00);
        expect(FinancialUtils.calculatePercentage(100.00, 100)).toBe(100.00);
        expect(FinancialUtils.calculatePercentage(0.00, 50)).toBe(0.00);
      });
    });

    describe('validation', () => {
      it('should validate correct financial amounts', () => {
        expect(FinancialUtils.isValidFinancialAmount(0.00)).toBe(true);
        expect(FinancialUtils.isValidFinancialAmount(0.01)).toBe(true);
        expect(FinancialUtils.isValidFinancialAmount(100.50)).toBe(true);
        expect(FinancialUtils.isValidFinancialAmount(999999.99)).toBe(true);
      });

      it('should reject invalid financial amounts', () => {
        expect(FinancialUtils.isValidFinancialAmount(-0.01)).toBe(false);
        expect(FinancialUtils.isValidFinancialAmount(1000000.00)).toBe(false);
        expect(FinancialUtils.isValidFinancialAmount(100.501)).toBe(false);
        expect(FinancialUtils.isValidFinancialAmount(NaN)).toBe(false);
        expect(FinancialUtils.isValidFinancialAmount(Infinity)).toBe(false);
      });
    });

    describe('array operations', () => {
      it('should sum amounts correctly', () => {
        expect(FinancialUtils.sumAmounts([10.50, 20.25, 30.75])).toBe(61.50);
        expect(FinancialUtils.sumAmounts([0.01, 0.02, 0.03])).toBe(0.06);
        expect(FinancialUtils.sumAmounts([])).toBe(0.00);
      });

      it('should calculate averages correctly', () => {
        expect(FinancialUtils.averageAmounts([10.00, 20.00, 30.00])).toBe(20.00);
        expect(FinancialUtils.averageAmounts([33.33, 66.66])).toBe(50.00);
        expect(FinancialUtils.averageAmounts([])).toBe(0.00);
      });
    });

    describe('generateRandomAmount', () => {
      it('should generate amounts within specified range', () => {
        for (let i = 0; i < 100; i++) {
          const amount = FinancialUtils.generateRandomAmount(10, 100);
          expect(amount).toBeGreaterThanOrEqual(10);
          expect(amount).toBeLessThanOrEqual(100);
          expect(FinancialUtils.hasValidFinancialPrecision(amount)).toBe(true);
        }
      });

      it('should use default range when no parameters provided', () => {
        const amount = FinancialUtils.generateRandomAmount();
        expect(amount).toBeGreaterThanOrEqual(FINANCIAL_CONSTANTS.MIN_SAFE_AMOUNT);
        expect(amount).toBeLessThanOrEqual(1000);
        expect(FinancialUtils.hasValidFinancialPrecision(amount)).toBe(true);
      });
    });
  });

  describe('FinancialAssertions', () => {
    describe('expectValidFinancialAmount', () => {
      it('should pass for valid amounts', () => {
        expect(() => FinancialAssertions.expectValidFinancialAmount(10.50)).not.toThrow();
        expect(() => FinancialAssertions.expectValidFinancialAmount(0.00)).not.toThrow();
        expect(() => FinancialAssertions.expectValidFinancialAmount(999999.99)).not.toThrow();
      });

      it('should fail for invalid amounts', () => {
        expect(() => FinancialAssertions.expectValidFinancialAmount(-10.50)).toThrow();
        expect(() => FinancialAssertions.expectValidFinancialAmount(NaN)).toThrow();
        expect(() => FinancialAssertions.expectValidFinancialAmount(Infinity)).toThrow();
      });
    });

    describe('expectFinancialAmountsEqual', () => {
      it('should pass for equal amounts', () => {
        expect(() => 
          FinancialAssertions.expectFinancialAmountsEqual(10.50, 10.50)
        ).not.toThrow();
      });

      it('should pass for amounts that round to same value', () => {
        expect(() => 
          FinancialAssertions.expectFinancialAmountsEqual(10.501, 10.50)
        ).not.toThrow();
      });

      it('should fail for unequal amounts', () => {
        expect(() => 
          FinancialAssertions.expectFinancialAmountsEqual(10.50, 10.51)
        ).toThrow();
      });
    });

    describe('expectFinancialCalculation', () => {
      it('should validate calculation results', () => {
        expect(() => 
          FinancialAssertions.expectFinancialCalculation(
            () => FinancialUtils.addAmounts(10.50, 20.25),
            30.75,
            'addition test'
          )
        ).not.toThrow();
      });

      it('should fail for incorrect calculations', () => {
        expect(() => 
          FinancialAssertions.expectFinancialCalculation(
            () => FinancialUtils.addAmounts(10.50, 20.25),
            30.76,
            'incorrect addition test'
          )
        ).toThrow();
      });
    });
  });

  describe('FinancialTestScenarios', () => {
    describe('getArithmeticTestCases', () => {
      it('should provide comprehensive arithmetic test cases', () => {
        const testCases = FinancialTestScenarios.getArithmeticTestCases();
        expect(testCases.length).toBeGreaterThan(0);
        
        testCases.forEach(testCase => {
          expect(testCase).toHaveProperty('operation');
          expect(testCase).toHaveProperty('values');
          expect(testCase).toHaveProperty('expected');
          expect(testCase).toHaveProperty('description');
        });
      });

      it('should have valid test cases that pass', () => {
        const testCases = FinancialTestScenarios.getArithmeticTestCases();
        
        testCases.forEach(testCase => {
          let result: number;
          
          switch (testCase.operation) {
            case 'addition':
              result = FinancialUtils.addAmounts(testCase.values[0], testCase.values[1]);
              break;
            case 'subtraction':
              result = FinancialUtils.subtractAmounts(testCase.values[0], testCase.values[1]);
              break;
            case 'multiplication':
              result = FinancialUtils.multiplyAmount(testCase.values[0], testCase.values[1]);
              break;
            case 'division':
              result = FinancialUtils.divideAmount(testCase.values[0], testCase.values[1]);
              break;
            default:
              throw new Error(`Unknown operation: ${testCase.operation}`);
          }
          
          FinancialAssertions.expectFinancialAmountsEqual(
            result,
            testCase.expected,
            `Failed for ${testCase.description}`
          );
        });
      });
    });

    describe('getEdgeCases', () => {
      it('should provide edge case scenarios', () => {
        const edgeCases = FinancialTestScenarios.getEdgeCases();
        expect(edgeCases.length).toBeGreaterThan(0);
        
        edgeCases.forEach(edgeCase => {
          const isValid = FinancialUtils.isValidFinancialAmount(edgeCase.value);
          expect(isValid).toBe(edgeCase.shouldBeValid);
        });
      });
    });

    describe('getPercentageTestCases', () => {
      it('should validate percentage calculations', () => {
        const testCases = FinancialTestScenarios.getPercentageTestCases();
        
        testCases.forEach(testCase => {
          const result = FinancialUtils.calculatePercentage(
            testCase.amount,
            testCase.percentage
          );
          
          FinancialAssertions.expectFinancialAmountsEqual(
            result,
            testCase.expected,
            `Failed for ${testCase.description}`
          );
        });
      });
    });

    describe('getBudgetScenarios', () => {
      it('should validate budget calculations', () => {
        const scenarios = FinancialTestScenarios.getBudgetScenarios();
        
        scenarios.forEach(scenario => {
          const totalSpent = FinancialUtils.sumAmounts(scenario.spentAmounts);
          const remaining = FinancialUtils.subtractAmounts(scenario.budgetAmount, totalSpent);
          const percentage = FinancialUtils.calculatePercentage(totalSpent / scenario.budgetAmount, 100);
          
          FinancialAssertions.expectFinancialAmountsEqual(
            totalSpent,
            scenario.expectedTotal,
            `Total spent failed for ${scenario.description}`
          );
          
          FinancialAssertions.expectFinancialAmountsEqual(
            remaining,
            scenario.expectedRemaining,
            `Remaining amount failed for ${scenario.description}`
          );
        });
      });
    });
  });

  describe('FinancialPerformanceUtils', () => {
    describe('benchmarkOperation', () => {
      it('should benchmark financial operations', () => {
        const benchmark = FinancialPerformanceUtils.benchmarkOperation(
          () => FinancialUtils.addAmounts(100.50, 200.25),
          100,
          'addition benchmark test'
        );
        
        expect(benchmark).toHaveProperty('result');
        expect(benchmark).toHaveProperty('averageTime');
        expect(benchmark).toHaveProperty('totalTime');
        expect(benchmark.result).toBe(300.75);
        expect(benchmark.averageTime).toBeGreaterThan(0);
        expect(benchmark.totalTime).toBeGreaterThan(0);
      });

      it('should handle performance requirements', () => {
        const benchmark = FinancialPerformanceUtils.benchmarkOperation(
          () => FinancialUtils.addAmounts(
            FinancialUtils.generateRandomAmount(),
            FinancialUtils.generateRandomAmount()
          ),
          1000
        );
        
        // Financial operations should be very fast (< 1ms average)
        expect(benchmark.averageTime).toBeLessThan(1);
      });
    });

    describe('stressTestFinancialOperations', () => {
      it('should handle stress testing', () => {
        const stressTest = FinancialPerformanceUtils.stressTestFinancialOperations(1000);
        
        expect(stressTest).toHaveProperty('success');
        expect(stressTest).toHaveProperty('errors');
        expect(stressTest).toHaveProperty('averageTime');
        expect(stressTest.success).toBe(true);
        expect(stressTest.errors).toHaveLength(0);
        expect(stressTest.averageTime).toBeLessThan(1);
      });
    });
  });

  describe('Integration with real-world scenarios', () => {
    it('should handle transaction totaling', () => {
      const transactions = [
        { amount: 10.50, type: 'expense' },
        { amount: 25.75, type: 'expense' },
        { amount: 100.00, type: 'income' },
        { amount: 15.25, type: 'expense' },
      ];
      
      const totalExpenses = FinancialUtils.sumAmounts(
        transactions
          .filter(t => t.type === 'expense')
          .map(t => t.amount)
      );
      
      const totalIncome = FinancialUtils.sumAmounts(
        transactions
          .filter(t => t.type === 'income')
          .map(t => t.amount)
      );
      
      const netAmount = FinancialUtils.subtractAmounts(totalIncome, totalExpenses);
      
      expect(totalExpenses).toBe(51.50);
      expect(totalIncome).toBe(100.00);
      expect(netAmount).toBe(48.50);
    });

    it('should handle budget calculations with alerts', () => {
      const budget = {
        amount: 500.00,
        alertThreshold: 80, // 80%
      };
      
      const spent = 420.75;
      const remaining = FinancialUtils.subtractAmounts(budget.amount, spent);
      const percentageUsed = FinancialUtils.calculatePercentage(spent / budget.amount, 100);
      const alertAmount = FinancialUtils.calculatePercentage(budget.amount, budget.alertThreshold);
      const shouldAlert = spent > alertAmount;
      
      expect(remaining).toBe(79.25);
      expect(percentageUsed).toBe(84.15);
      expect(alertAmount).toBe(400.00);
      expect(shouldAlert).toBe(true);
    });

    it('should handle compound interest calculations', () => {
      const principal = 1000.00;
      const rate = 0.05; // 5%
      const periods = 12; // monthly compounding
      const years = 1;
      
      // Compound interest formula: A = P(1 + r/n)^(nt)
      const amount = principal * Math.pow(1 + rate/periods, periods * years);
      const roundedAmount = FinancialUtils.roundToFinancialPrecision(amount);
      
      FinancialAssertions.expectValidFinancialAmount(roundedAmount);
      expect(roundedAmount).toBe(1051.16);
    });
  });
});