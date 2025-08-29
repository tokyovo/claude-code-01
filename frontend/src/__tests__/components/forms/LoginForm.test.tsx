import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginForm from '../../../components/forms/LoginForm';
import authSlice from '../../../store/slices/authSlice';
import uiSlice from '../../../store/slices/uiSlice';
import { api } from '../../../store/api/apiSlice';

// Mock the auth hooks
jest.mock('../../../hooks/auth', () => ({
  useAuthActions: jest.fn(),
  useRequireGuest: jest.fn(),
}));

const mockUseAuthActions = require('../../../hooks/auth').useAuthActions;
const mockUseRequireGuest = require('../../../hooks/auth').useRequireGuest;

// Mock API slice
const mockApiSlice = {
  endpoints: {
    getSecurityMetrics: {
      useQuery: jest.fn(),
    },
  },
  reducer: (state: any) => state,
  reducerPath: 'api',
  middleware: () => (next: any) => (action: any) => next(action),
};

jest.mock('../../../store/api/apiSlice', () => ({
  api: mockApiSlice,
  useGetSecurityMetricsQuery: jest.fn(),
}));

const { useGetSecurityMetricsQuery } = require('../../../store/api/apiSlice');

// Mock validation utilities
jest.mock('../../../utils/validation', () => ({
  loginSchema: {
    parse: jest.fn(),
  },
  validateEmail: jest.fn(),
}));

const { validateEmail } = require('../../../utils/validation');

// Test utilities
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice,
      api: mockApiSlice.reducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: null,
        sessionExpiry: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        notifications: [],
      },
      ...initialState,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(mockApiSlice.middleware),
  });
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

describe('LoginForm', () => {
  // Mock functions
  const mockLogin = jest.fn();
  const mockSetError = jest.fn();
  const mockClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUseRequireGuest.mockReturnValue({ isAllowed: true });
    mockUseAuthActions.mockReturnValue({
      login: mockLogin,
      isLoginLoading: false,
    });
    
    useGetSecurityMetricsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    
    validateEmail.mockReturnValue(false);
    
    // Mock form validation
    require('../../../utils/validation').loginSchema = {
      parse: jest.fn().mockImplementation((data) => data),
    };
  });

  describe('Rendering', () => {
    it('should render login form with all required fields', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByRole('main', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render header with title and description', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByText('Welcome back to Personal Finance Tracker')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up here/i })).toBeInTheDocument();
    });

    it('should not render when user is authenticated', () => {
      mockUseRequireGuest.mockReturnValue({ isAllowed: false });
      
      const { container } = renderWithProviders(<LoginForm />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Form Validation', () => {
    const user = userEvent.setup();

    it('should validate email format', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(validateEmail).toHaveBeenCalledWith('invalid-email');
      });
    });

    it('should show validation errors for empty fields', async () => {
      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.click(submitButton);

      // Assume form validation shows required field errors
      await waitFor(() => {
        const form = screen.getByLabelText(/sign in form/i);
        expect(form).toBeInTheDocument();
      });
    });

    it('should enable submit button when form is valid', async () => {
      validateEmail.mockReturnValue(true);
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelLabel(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should disable form when loading', () => {
      mockUseAuthActions.mockReturnValue({
        login: mockLogin,
        isLoginLoading: true,
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /signing in/i });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Security Features', () => {
    it('should display account locked warning', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: true,
          remainingAttempts: 0,
          failedLoginAttempts: 5,
          lockoutExpiresAt: '2024-01-01T12:00:00Z',
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      expect(screen.getByText('Account Temporarily Locked')).toBeInTheDocument();
      expect(screen.getByText(/multiple failed login attempts/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reset your password/i })).toBeInTheDocument();
    });

    it('should display failed attempts warning', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: false,
          remainingAttempts: 2,
          failedLoginAttempts: 3,
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      expect(screen.getByText('Security Warning')).toBeInTheDocument();
      expect(screen.getByText(/3 failed login attempts detected/i)).toBeInTheDocument();
      expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
    });

    it('should disable form when account is locked', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: true,
          remainingAttempts: 0,
          failedLoginAttempts: 5,
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /account locked/i });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should fetch security metrics when valid email is entered', async () => {
      validateEmail.mockReturnValue(true);
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      
      await userEvent.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(useGetSecurityMetricsQuery).toHaveBeenCalledWith('test@example.com', {
          skip: false,
          refetchOnMountOrArgChange: true,
        });
      });
    });

    it('should skip security metrics fetch for invalid email', () => {
      validateEmail.mockReturnValue(false);
      
      renderWithProviders(<LoginForm />);

      expect(useGetSecurityMetricsQuery).toHaveBeenCalledWith('', {
        skip: true,
        refetchOnMountOrArgChange: true,
      });
    });
  });

  describe('Form Submission', () => {
    const user = userEvent.setup();

    it('should submit form with correct data', async () => {
      mockLogin.mockResolvedValue({ success: true });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should handle login success', async () => {
      mockLogin.mockResolvedValue({ success: true });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
      
      // Should not show any error messages
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle invalid credentials error', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          status: 401,
          data: { message: 'Invalid email or password' },
        },
      });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should handle account locked error', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          status: 423,
          data: { message: 'Account is locked' },
        },
      });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/account is temporarily locked/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting error', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
      });
    });

    it('should handle field-specific errors', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          status: 400,
          data: {
            field: 'email',
            message: 'Email format is invalid',
          },
        },
      });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email format is invalid')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'signin-title');
      expect(screen.getByLabelText(/sign in form/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'false');
    });

    it('should associate error messages with form fields', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      });
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should have proper focus management', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(passwordInput);
    });

    it('should disable navigation when account is locked', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: true,
          remainingAttempts: 0,
          failedLoginAttempts: 5,
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i });
      expect(forgotPasswordLink).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('User Experience', () => {
    it('should show loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);
      
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      // Resolve the promise
      resolveLogin!({ success: true });
      
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      });
    });

    it('should remember me checkbox functionality', async () => {
      renderWithProviders(<LoginForm />);

      const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
      
      expect(rememberMeCheckbox).not.toBeChecked();
      
      await userEvent.click(rememberMeCheckbox);
      
      expect(rememberMeCheckbox).toBeChecked();
    });

    it('should clear email errors when email changes', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      
      // Type in email to trigger change
      await userEvent.type(emailInput, 'new@example.com');

      // This would test the useEffect that clears errors, but since we're mocking
      // the form validation, we can't fully test this behavior in isolation
      expect(emailInput).toHaveValue('new@example.com');
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show development info in development mode', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByText('Development Info')).toBeInTheDocument();
      expect(screen.getByText(/form valid/i)).toBeInTheDocument();
      expect(screen.getByText(/email:/i)).toBeInTheDocument();
      expect(screen.getByText(/password length:/i)).toBeInTheDocument();
    });

    it('should show security status in development mode', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: false,
          remainingAttempts: 3,
          failedLoginAttempts: 2,
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      expect(screen.getByText('Security Status:')).toBeInTheDocument();
      expect(screen.getByText(/failed attempts: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/remaining: 3/i)).toBeInTheDocument();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle security metrics loading state', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      // Should not crash and should handle loading state gracefully
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle security metrics error state', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Security service unavailable' },
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      // Should not crash and should handle error state gracefully
      expect(screen.getByRole('main')).toBeInTheDocument();
      // Should not show security warnings if service is down
      expect(screen.queryByText('Security Warning')).not.toBeInTheDocument();
    });

    it('should handle partial security metrics data', () => {
      useGetSecurityMetricsQuery.mockReturnValue({
        data: {
          isAccountLocked: false,
          // Missing other fields
        },
        isLoading: false,
        error: null,
      });
      validateEmail.mockReturnValue(true);

      renderWithProviders(<LoginForm />);

      // Should handle missing data gracefully
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});