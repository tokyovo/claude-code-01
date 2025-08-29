import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables for testing
process.env.VITE_API_URL = 'http://localhost:3001/api';
process.env.VITE_APP_NAME = 'Personal Finance Tracker - Test';

// Global test helpers
beforeEach(() => {
  // Reset localStorage and sessionStorage before each test
  localStorageMock.clear();
  sessionStorageMock.clear();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
});

// Custom matchers for financial testing
expect.extend({
  toBeValidCurrency(received: any) {
    const isValid = typeof received === 'number' && 
                    Number.isFinite(received) && 
                    received >= 0 && 
                    Number(received.toFixed(2)) === received;
    
    return {
      message: () => 
        `expected ${received} to be a valid currency amount (positive number with at most 2 decimal places)`,
      pass: isValid,
    };
  },

  toHavePrecision(received: number, precision: number) {
    const decimals = (received.toString().split('.')[1] || '').length;
    const isValid = decimals <= precision;
    
    return {
      message: () => 
        `expected ${received} to have at most ${precision} decimal places, but had ${decimals}`,
      pass: isValid,
    };
  },
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCurrency(): R;
      toHavePrecision(precision: number): R;
    }
  }
}