/**
 * Mock API utilities for testing
 */

// Mock fetch implementation
export function createMockFetch() {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      headers: new Headers(),
    })
  ) as jest.MockedFunction<typeof fetch>;
}

// Mock API endpoints
export const mockApiEndpoints = {
  // Authentication endpoints
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
    verifyEmail: '/api/v1/auth/verify-email',
  },

  // User endpoints
  users: {
    profile: '/api/v1/users/profile',
    updateProfile: '/api/v1/users/profile',
    changePassword: '/api/v1/users/change-password',
    deleteAccount: '/api/v1/users/account',
  },

  // Transaction endpoints
  transactions: {
    list: '/api/v1/transactions',
    create: '/api/v1/transactions',
    get: (id: number) => `/api/v1/transactions/${id}`,
    update: (id: number) => `/api/v1/transactions/${id}`,
    delete: (id: number) => `/api/v1/transactions/${id}`,
    upload: '/api/v1/transactions/upload',
    export: '/api/v1/transactions/export',
  },

  // Budget endpoints
  budgets: {
    list: '/api/v1/budgets',
    create: '/api/v1/budgets',
    get: (id: number) => `/api/v1/budgets/${id}`,
    update: (id: number) => `/api/v1/budgets/${id}`,
    delete: (id: number) => `/api/v1/budgets/${id}`,
  },

  // Category endpoints
  categories: {
    list: '/api/v1/categories',
    create: '/api/v1/categories',
    get: (id: number) => `/api/v1/categories/${id}`,
    update: (id: number) => `/api/v1/categories/${id}`,
    delete: (id: number) => `/api/v1/categories/${id}`,
  },

  // Account endpoints
  accounts: {
    list: '/api/v1/accounts',
    create: '/api/v1/accounts',
    get: (id: number) => `/api/v1/accounts/${id}`,
    update: (id: number) => `/api/v1/accounts/${id}`,
    delete: (id: number) => `/api/v1/accounts/${id}`,
  },

  // Report endpoints
  reports: {
    spending: '/api/v1/reports/spending',
    income: '/api/v1/reports/income',
    budgets: '/api/v1/reports/budgets',
    trends: '/api/v1/reports/trends',
  },
};

/**
 * Create mock API responses
 */
export class MockApiResponseBuilder {
  /**
   * Create success response
   */
  static success<T>(data: T, status = 200) {
    return {
      ok: true,
      status,
      statusText: 'OK',
      json: () => Promise.resolve({
        success: true,
        data,
        message: 'Operation successful',
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    };
  }

  /**
   * Create error response
   */
  static error(message: string, status = 400, type = 'Error') {
    return {
      ok: false,
      status,
      statusText: status === 400 ? 'Bad Request' : 'Error',
      json: () => Promise.resolve({
        success: false,
        error: {
          type,
          message,
          details: {},
        },
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    };
  }

  /**
   * Create validation error response
   */
  static validationError(details: Record<string, string[]>, status = 400) {
    return {
      ok: false,
      status,
      statusText: 'Bad Request',
      json: () => Promise.resolve({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Validation failed',
          details,
        },
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    };
  }

  /**
   * Create unauthorized response
   */
  static unauthorized() {
    return this.error('Unauthorized access', 401, 'AuthenticationError');
  }

  /**
   * Create forbidden response
   */
  static forbidden() {
    return this.error('Access forbidden', 403, 'AuthorizationError');
  }

  /**
   * Create not found response
   */
  static notFound(resource = 'Resource') {
    return this.error(`${resource} not found`, 404, 'NotFoundError');
  }

  /**
   * Create network error response
   */
  static networkError() {
    return Promise.reject(new Error('Network error'));
  }

  /**
   * Create timeout error response
   */
  static timeoutError() {
    return Promise.reject(new Error('Request timeout'));
  }
}

/**
 * API mock controller for testing
 */
export class ApiMockController {
  private mockFetch: jest.MockedFunction<typeof fetch>;
  private responses: Map<string, any> = new Map();

  constructor() {
    this.mockFetch = createMockFetch();
    global.fetch = this.mockFetch;
  }

  /**
   * Setup mock response for specific endpoint
   */
  mockEndpoint(url: string, response: any) {
    this.responses.set(url, response);
    this.updateMockImplementation();
    return this;
  }

  /**
   * Setup multiple mock responses
   */
  mockEndpoints(endpoints: Record<string, any>) {
    Object.entries(endpoints).forEach(([url, response]) => {
      this.responses.set(url, response);
    });
    this.updateMockImplementation();
    return this;
  }

  /**
   * Mock endpoint with delay
   */
  mockEndpointWithDelay(url: string, response: any, delay: number) {
    const delayedResponse = new Promise(resolve => {
      setTimeout(() => resolve(response), delay);
    });
    this.responses.set(url, delayedResponse);
    this.updateMockImplementation();
    return this;
  }

  /**
   * Clear all mocks
   */
  clearMocks() {
    this.responses.clear();
    this.mockFetch.mockClear();
    return this;
  }

  /**
   * Restore original fetch
   */
  restore() {
    this.mockFetch.mockRestore();
  }

  /**
   * Update mock implementation based on responses
   */
  private updateMockImplementation() {
    this.mockFetch.mockImplementation((url: string | Request) => {
      const urlString = typeof url === 'string' ? url : url.url;
      
      // Find matching response
      for (const [endpoint, response] of this.responses.entries()) {
        if (urlString.includes(endpoint)) {
          return Promise.resolve(response);
        }
      }
      
      // Default response if no match found
      return Promise.resolve(MockApiResponseBuilder.notFound());
    });
  }

  /**
   * Get call history
   */
  getCallHistory() {
    return this.mockFetch.mock.calls;
  }

  /**
   * Verify endpoint was called
   */
  expectEndpointCalled(endpoint: string, times = 1) {
    const calls = this.mockFetch.mock.calls;
    const matchingCalls = calls.filter(call => {
      const url = typeof call[0] === 'string' ? call[0] : call[0].url;
      return url.includes(endpoint);
    });
    
    expect(matchingCalls).toHaveLength(times);
  }

  /**
   * Verify endpoint was called with specific data
   */
  expectEndpointCalledWith(endpoint: string, options: RequestInit) {
    const calls = this.mockFetch.mock.calls;
    const matchingCall = calls.find(call => {
      const url = typeof call[0] === 'string' ? call[0] : call[0].url;
      return url.includes(endpoint);
    });
    
    expect(matchingCall).toBeDefined();
    expect(matchingCall![1]).toMatchObject(options);
  }
}

/**
 * Common mock scenarios
 */
export const mockScenarios = {
  /**
   * Setup successful authentication flow
   */
  successfulAuth: (controller: ApiMockController) => {
    return controller
      .mockEndpoint('/api/v1/auth/login', MockApiResponseBuilder.success({
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      }))
      .mockEndpoint('/api/v1/auth/refresh', MockApiResponseBuilder.success({
        token: 'new-mock-token',
      }));
  },

  /**
   * Setup failed authentication
   */
  failedAuth: (controller: ApiMockController) => {
    return controller
      .mockEndpoint('/api/v1/auth/login', MockApiResponseBuilder.error('Invalid credentials', 401))
      .mockEndpoint('/api/v1/auth/refresh', MockApiResponseBuilder.unauthorized());
  },

  /**
   * Setup network errors
   */
  networkErrors: (controller: ApiMockController) => {
    return controller
      .mockEndpoint('/api/v1/transactions', MockApiResponseBuilder.networkError())
      .mockEndpoint('/api/v1/budgets', MockApiResponseBuilder.timeoutError());
  },
};