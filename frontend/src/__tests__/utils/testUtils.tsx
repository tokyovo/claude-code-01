import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { configureStore, Store } from '@reduxjs/toolkit';
import { authSlice } from '../../store/slices/authSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import { apiSlice } from '../../store/api/apiSlice';

// Mock data for testing
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user' as const,
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockTransaction = {
  id: 1,
  userId: 1,
  categoryId: 1,
  accountId: 1,
  type: 'expense' as const,
  amount: 50.99,
  description: 'Test transaction',
  date: new Date().toISOString(),
  tags: ['test'],
  receiptUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockBudget = {
  id: 1,
  userId: 1,
  categoryId: 1,
  name: 'Test Budget',
  amount: 500.00,
  period: 'monthly' as const,
  startDate: new Date().toISOString(),
  endDate: null,
  alertThreshold: 80,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Store setup for testing
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: Store;
  routerProps?: MemoryRouterProps;
}

/**
 * Create a test store with preloaded state
 */
export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      ui: uiSlice.reducer,
      api: apiSlice.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }).concat(apiSlice.middleware),
  });
}

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    routerProps = {},
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: Store } {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter {...routerProps}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store };
}

/**
 * Render component with authenticated user
 */
export function renderWithAuthenticatedUser(
  ui: ReactElement,
  user = mockUser,
  options: ExtendedRenderOptions = {}
) {
  const preloadedState = {
    auth: {
      user,
      token: 'mock-token',
      isAuthenticated: true,
      loading: false,
      error: null,
    },
    ...options.preloadedState,
  };

  return renderWithProviders(ui, { ...options, preloadedState });
}

/**
 * Render component with unauthenticated state
 */
export function renderWithUnauthenticatedUser(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const preloadedState = {
    auth: {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    },
    ...options.preloadedState,
  };

  return renderWithProviders(ui, { ...options, preloadedState });
}

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  auth: {
    login: {
      success: true,
      data: {
        user: mockUser,
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      },
    },
    register: {
      success: true,
      data: {
        user: mockUser,
        message: 'Registration successful',
      },
    },
    logout: {
      success: true,
      message: 'Logged out successfully',
    },
  },
  transactions: {
    list: {
      success: true,
      data: {
        items: [mockTransaction],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      },
    },
    create: {
      success: true,
      data: mockTransaction,
    },
    update: {
      success: true,
      data: { ...mockTransaction, description: 'Updated transaction' },
    },
    delete: {
      success: true,
      message: 'Transaction deleted successfully',
    },
  },
  budgets: {
    list: {
      success: true,
      data: {
        items: [mockBudget],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      },
    },
    create: {
      success: true,
      data: mockBudget,
    },
  },
};

/**
 * Wait for component to finish loading
 */
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Create mock form data for file uploads
 */
export function createMockFormData(fields: Record<string, string | File>) {
  const formData = new FormData();
  
  Object.entries(fields).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, value);
    }
  });
  
  return formData;
}

/**
 * Create mock file for testing file uploads
 */
export function createMockFile(
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
): File {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/**
 * Simulate user interactions with proper timing
 */
export const userInteractions = {
  async clickAndWait(element: HTMLElement) {
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(element);
    await waitForLoadingToFinish();
  },

  async typeAndWait(element: HTMLElement, text: string) {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.type(element, text);
    await waitForLoadingToFinish();
  },

  async selectAndWait(element: HTMLElement, value: string) {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.selectOptions(element, value);
    await waitForLoadingToFinish();
  },
};

/**
 * Financial testing utilities
 */
export const financialTestUtils = {
  /**
   * Generate mock financial data with proper precision
   */
  createMockAmount(value: number): number {
    return Math.round(value * 100) / 100; // Ensure 2 decimal places
  },

  /**
   * Validate financial precision in tests
   */
  expectValidFinancialAmount(amount: number): void {
    expect(amount).toBeValidCurrency();
    expect(amount).toHavePrecision(2);
  },

  /**
   * Create mock transaction with valid financial data
   */
  createMockTransaction(overrides: Partial<typeof mockTransaction> = {}) {
    return {
      ...mockTransaction,
      amount: this.createMockAmount(overrides.amount || 50.99),
      ...overrides,
    };
  },

  /**
   * Create mock budget with valid financial data
   */
  createMockBudget(overrides: Partial<typeof mockBudget> = {}) {
    return {
      ...mockBudget,
      amount: this.createMockAmount(overrides.amount || 500.00),
      ...overrides,
    };
  },
};

// Re-export testing library utilities for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';