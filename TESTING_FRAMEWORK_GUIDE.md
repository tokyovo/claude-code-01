# Testing Framework Guide

This guide provides comprehensive information about the testing infrastructure for the Personal Finance Tracker application.

## Overview

The testing framework is designed to ensure reliability, security, and financial accuracy of the application through multiple layers of testing:

- **Unit Tests**: Test individual components, functions, and utilities in isolation
- **Integration Tests**: Test API endpoints, database operations, and component interactions
- **End-to-End Tests**: Test complete user workflows (future Playwright integration)
- **Financial Precision Tests**: Ensure monetary calculations maintain proper precision

## Architecture

### Backend Testing
- **Framework**: Jest with TypeScript support
- **API Testing**: Supertest for HTTP endpoint testing
- **Database Testing**: Separate test database with automated setup/teardown
- **Authentication**: JWT token mocking and validation testing

### Frontend Testing
- **Framework**: Jest with React Testing Library
- **Component Testing**: Render testing with user interaction simulation
- **State Management**: Redux store testing with mock API responses
- **Accessibility**: Built-in accessibility testing helpers

## Getting Started

### Backend Testing

#### Prerequisites
```bash
# Ensure test database is available
npm run db:test:setup

# Install dependencies (already done if you've run npm install)
npm install
```

#### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode for development
npm run test:watch

# Debug mode
npm run test:debug
```

### Frontend Testing

#### Running Tests
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only component tests
npm run test:ui

# Watch mode
npm run test:watch
```

## Test Structure

### Backend Test Organization
```
tests/
├── unit/                    # Unit tests
│   ├── middleware/         # Middleware testing
│   ├── utils/             # Utility function tests
│   └── services/          # Service layer tests
├── integration/           # Integration tests
│   ├── health.test.ts    # Health endpoint tests
│   └── auth.test.ts      # Authentication flow tests
├── fixtures/             # Test data factories
│   ├── userFactory.ts
│   ├── transactionFactory.ts
│   └── budgetFactory.ts
├── helpers/              # Test utilities
│   ├── database.ts       # Database test helpers
│   ├── auth.ts          # Authentication helpers
│   └── request.ts       # API request helpers
└── utils/               # Specialized test utilities
    └── financial.ts     # Financial precision testing
```

### Frontend Test Organization
```
frontend/src/
├── __tests__/
│   └── utils/
│       ├── testUtils.tsx    # React testing utilities
│       └── mockApi.ts       # API mocking utilities
├── components/
│   └── **/__tests__/       # Component-specific tests
└── setupTests.ts           # Global test setup
```

## Writing Tests

### Backend Unit Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserFactory } from '../fixtures';
import { AuthTestHelper } from '../helpers/auth';

describe('User Service', () => {
  it('should create user with valid data', async () => {
    const userData = UserFactory.create();
    const result = await userService.create(userData);
    
    expect(result).toHaveProperty('id');
    expect(result.email).toBe(userData.email);
  });
});
```

### Backend Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { databaseTestHooks } from '../helpers/database';
import { RequestTestHelper } from '../helpers/request';

describe('API Integration Tests', () => {
  beforeAll(databaseTestHooks.beforeAll);
  afterAll(databaseTestHooks.afterAll);

  it('should authenticate user', async () => {
    const helper = new RequestTestHelper(app);
    const response = await helper.authenticatedPost('/api/users', userData);
    
    expect(response.status).toBe(201);
  });
});
```

### Frontend Component Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import { renderWithProviders, screen, userEvent } from '../__tests__/utils/testUtils';
import { TransactionForm } from './TransactionForm';

describe('TransactionForm', () => {
  it('should submit valid transaction', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<TransactionForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/amount/i), '25.99');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25.99 })
    );
  });
});
```

### Financial Precision Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import { FinancialUtils, FinancialAssertions } from '../utils/financial';

describe('Budget Calculations', () => {
  it('should calculate remaining budget correctly', () => {
    const budget = 500.00;
    const spent = 347.85;
    const remaining = FinancialUtils.subtractAmounts(budget, spent);
    
    FinancialAssertions.expectFinancialAmountsEqual(remaining, 152.15);
    FinancialAssertions.expectValidFinancialAmount(remaining);
  });
});
```

## Test Utilities

### Database Testing

```typescript
import { databaseTestHooks, dbHelper } from '../helpers/database';

describe('Database Tests', () => {
  beforeAll(databaseTestHooks.beforeAll);
  afterEach(databaseTestHooks.afterEach);
  afterAll(databaseTestHooks.afterAll);

  it('should insert test data', async () => {
    const users = await dbHelper.insertTestData('users', [UserFactory.create()]);
    expect(users).toHaveLength(1);
  });
});
```

### Authentication Testing

```typescript
import { AuthTestHelper } from '../helpers/auth';

// Generate test tokens
const token = AuthTestHelper.generateTestToken({ id: 1, role: 'admin' });
const expiredToken = AuthTestHelper.generateExpiredToken();

// Mock authenticated requests
const mockReq = AuthTestHelper.createAuthenticatedRequest({ id: 1 });
```

### API Mocking (Frontend)

```typescript
import { ApiMockController, MockApiResponseBuilder } from '../__tests__/utils/mockApi';

const mockApi = new ApiMockController();

mockApi
  .mockEndpoint('/api/transactions', MockApiResponseBuilder.success(transactions))
  .mockEndpoint('/api/budgets', MockApiResponseBuilder.error('Not found', 404));
```

### Financial Testing

```typescript
import { FinancialUtils, FinancialAssertions, FinancialTestScenarios } from '../utils/financial';

// Test financial calculations
const result = FinancialUtils.addAmounts(10.50, 20.25);
FinancialAssertions.expectFinancialAmountsEqual(result, 30.75);

// Use test scenarios
const testCases = FinancialTestScenarios.getArithmeticTestCases();
testCases.forEach(testCase => {
  // Run test case
});
```

## Best Practices

### General Testing Guidelines

1. **Test Naming**: Use descriptive test names that explain the scenario
```typescript
// Good
it('should return validation error when amount is negative', () => {});

// Bad
it('should validate amount', () => {});
```

2. **Test Organization**: Group related tests using `describe` blocks
```typescript
describe('User Authentication', () => {
  describe('when credentials are valid', () => {
    it('should return access token', () => {});
    it('should set refresh token cookie', () => {});
  });
  
  describe('when credentials are invalid', () => {
    it('should return 401 error', () => {});
  });
});
```

3. **Test Isolation**: Each test should be independent
```typescript
// Use beforeEach for setup
beforeEach(() => {
  // Reset mocks, clear database, etc.
});
```

### Financial Testing Guidelines

1. **Always Validate Precision**: Use financial assertion helpers
```typescript
// Good
FinancialAssertions.expectValidFinancialAmount(result);

// Also good
expect(result).toBeValidCurrency();
expect(result).toHavePrecision(2);
```

2. **Test Edge Cases**: Include boundary conditions
```typescript
const edgeCases = FinancialTestScenarios.getEdgeCases();
edgeCases.forEach(testCase => {
  it(`should handle ${testCase.description}`, () => {
    const result = isValidAmount(testCase.value);
    expect(result).toBe(testCase.shouldBeValid);
  });
});
```

3. **Performance Testing**: Ensure financial operations are fast
```typescript
it('should perform calculation within performance threshold', () => {
  const startTime = performance.now();
  const result = calculateComplexBudget(data);
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(10); // 10ms threshold
  FinancialAssertions.expectValidFinancialAmount(result);
});
```

### Security Testing Guidelines

1. **Authentication Tests**: Test all authentication scenarios
```typescript
const authScenarios = AuthTestHelper.getAuthTestCases();
authScenarios.forEach(scenario => {
  it(`should handle ${scenario.description}`, async () => {
    // Test authentication scenario
  });
});
```

2. **Authorization Tests**: Verify role-based access
```typescript
it('should deny access to admin-only endpoint for regular user', async () => {
  const response = await helper.authenticatedGet('/api/admin', { role: 'user' });
  expect(response.status).toBe(403);
});
```

## Coverage Requirements

### Coverage Thresholds
- **Global**: 85% minimum coverage
- **Financial Services**: 90% minimum coverage
- **Controllers**: 85% minimum coverage
- **Middleware**: 80% minimum coverage

### Checking Coverage
```bash
# Backend coverage
npm run test:coverage

# Frontend coverage
cd frontend && npm run test:coverage

# View coverage reports
# Backend: ./coverage/lcov-report/index.html
# Frontend: ./frontend/coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Configuration
```yaml
- name: Run Backend Tests
  run: npm run test:ci

- name: Run Frontend Tests
  run: |
    cd frontend
    npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info,./frontend/coverage/lcov.info
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Reset test database
   npm run db:test:setup
   ```

2. **Port Conflicts**
   ```bash
   # Use different port for tests
   TEST_PORT=3002 npm test
   ```

3. **Memory Issues with Large Test Suites**
   ```bash
   # Run with increased memory
   node --max-old-space-size=4096 node_modules/.bin/jest
   ```

4. **Frontend Test Timeouts**
   ```typescript
   // Increase timeout for slow operations
   jest.setTimeout(30000);
   ```

### Debug Mode

1. **Backend Debug**
   ```bash
   npm run test:debug
   # Open Chrome DevTools at chrome://inspect
   ```

2. **Frontend Debug**
   ```bash
   cd frontend
   npm run test:debug
   ```

## Performance Considerations

### Test Execution Speed
- Unit tests should run in < 5 seconds
- Integration tests should run in < 30 seconds
- Use database transactions for faster cleanup
- Mock external services to avoid network delays

### Resource Usage
- Limit concurrent test execution for memory-intensive tests
- Use test data factories to generate consistent test data
- Clean up resources in `afterEach` hooks

## Future Enhancements

1. **E2E Testing**: Playwright integration for full user journey testing
2. **Visual Regression**: Screenshot testing for UI components  
3. **Load Testing**: API performance under concurrent load
4. **Security Testing**: Automated security vulnerability scanning
5. **Accessibility Testing**: Automated WCAG 2.1 compliance checking

---

For questions or issues with the testing framework, please refer to the project documentation or contact the development team.