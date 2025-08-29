// Enhanced authentication hooks for comprehensive auth management
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './redux';
import { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useRefreshTokenMutation,
} from '../store/api/apiSlice';
import { 
  setCredentials, 
  clearCredentials, 
  forceLogout,
  updateLastActivity,
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthToken,
  selectAuthLoading,
  selectIsSessionExpired,
  selectTimeUntilExpiry,
  selectSessionExpiry,
} from '../store/slices/authSlice';
import { ROUTES } from '../constants';
import { useNotifications } from './redux';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/api';

// Enhanced useAuth hook with comprehensive authentication management
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showWarning } = useNotifications();

  // Auth state selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectAuthToken);
  const isLoading = useAppSelector(selectAuthLoading);
  const isSessionExpired = useAppSelector(selectIsSessionExpired);
  const timeUntilExpiry = useAppSelector(selectTimeUntilExpiry);
  const sessionExpiry = useAppSelector(selectSessionExpiry);

  // Update activity tracker
  const updateActivity = useCallback(() => {
    if (isAuthenticated) {
      dispatch(updateLastActivity());
    }
  }, [dispatch, isAuthenticated]);

  // Force logout with optional redirect
  const logout = useCallback((redirectTo?: string, showMessage = true) => {
    dispatch(forceLogout());
    if (showMessage) {
      showSuccess('Logged out', 'You have been successfully logged out.');
    }
    navigate(redirectTo || ROUTES.LOGIN);
  }, [dispatch, navigate, showSuccess]);

  // Auto-logout on session expiry
  useEffect(() => {
    if (isSessionExpired && isAuthenticated) {
      showWarning(
        'Session Expired', 
        'Your session has expired. Please log in again.',
        5000
      );
      logout(ROUTES.LOGIN, false);
    }
  }, [isSessionExpired, isAuthenticated, logout, showWarning]);

  // Session warning (5 minutes before expiry)
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) return;

    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes
    const timeUntilWarning = timeUntilExpiry - WARNING_TIME;

    if (timeUntilWarning > 0) {
      const warningTimeout = setTimeout(() => {
        showWarning(
          'Session Expiring Soon',
          'Your session will expire in 5 minutes. Please save your work.',
          10000
        );
      }, timeUntilWarning);

      return () => clearTimeout(warningTimeout);
    }
  }, [isAuthenticated, sessionExpiry, timeUntilExpiry, showWarning]);

  return {
    // State
    isAuthenticated,
    user,
    token,
    isLoading,
    isSessionExpired,
    timeUntilExpiry,
    sessionExpiry,
    
    // Actions
    updateActivity,
    logout,
    
    // Computed values
    isNearExpiry: timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0,
    minutesUntilExpiry: Math.floor(timeUntilExpiry / (60 * 1000)),
  };
};

// Authentication actions hook
export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotifications();

  // API mutations
  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();

  // Login action
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const result = await loginMutation(credentials).unwrap();
      
      // Store credentials in Redux
      dispatch(setCredentials({
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }));

      showSuccess('Welcome back!', `Hello ${result.user.name}`);
      
      // Navigate to intended route or dashboard
      const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
      navigate(from, { replace: true });
      
      return { success: true, data: result };
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Login failed. Please check your credentials.';
      showError('Login Failed', errorMessage);
      return { success: false, error };
    }
  }, [loginMutation, dispatch, showSuccess, showError, navigate, location]);

  // Register action
  const register = useCallback(async (userData: RegisterRequest) => {
    try {
      const result = await registerMutation(userData).unwrap();
      
      // Store credentials in Redux
      dispatch(setCredentials({
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }));

      showSuccess(
        'Registration Successful!', 
        `Welcome to Personal Finance Tracker, ${result.user.name}!`
      );
      
      // Navigate to dashboard
      navigate(ROUTES.DASHBOARD, { replace: true });
      
      return { success: true, data: result };
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Registration failed. Please try again.';
      showError('Registration Failed', errorMessage);
      return { success: false, error };
    }
  }, [registerMutation, dispatch, showSuccess, showError, navigate]);

  // Logout action
  const logout = useCallback(async (showMessage = true) => {
    try {
      // Call logout API to invalidate server-side session
      await logoutMutation().unwrap();
    } catch (error) {
      // Ignore logout API errors, still clear local state
      console.error('Logout API error:', error);
    } finally {
      // Always clear local auth state
      dispatch(clearCredentials());
      
      if (showMessage) {
        showSuccess('Logged out', 'You have been successfully logged out.');
      }
      
      navigate(ROUTES.LOGIN);
    }
  }, [logoutMutation, dispatch, showSuccess, navigate]);

  // Refresh token action
  const refreshToken = useCallback(async (refreshTokenValue: string) => {
    try {
      const result = await refreshTokenMutation({ refreshToken: refreshTokenValue }).unwrap();
      
      // Update credentials in Redux
      dispatch(setCredentials({
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }));
      
      return { success: true, data: result };
    } catch (error: any) {
      // Refresh failed, force logout
      dispatch(forceLogout());
      showError('Session Expired', 'Please log in again.');
      navigate(ROUTES.LOGIN);
      return { success: false, error };
    }
  }, [refreshTokenMutation, dispatch, showError, navigate]);

  return {
    // Actions
    login,
    register,
    logout,
    refreshToken,
    
    // Loading states
    isLoginLoading,
    isRegisterLoading,
    isLogoutLoading,
    isAnyLoading: isLoginLoading || isRegisterLoading || isLogoutLoading,
  };
};

// Protected route hook
export const useRequireAuth = (redirectTo: string = ROUTES.LOGIN) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save intended location for redirect after login
      navigate(redirectTo, { 
        state: { from: location },
        replace: true 
      });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo, location]);

  return {
    isAuthenticated,
    isLoading,
    isAllowed: isAuthenticated,
  };
};

// Guest route hook (redirect authenticated users away from auth pages)
export const useRequireGuest = (redirectTo: string = ROUTES.DASHBOARD) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return {
    isAuthenticated,
    isLoading,
    isAllowed: !isAuthenticated,
  };
};

// Token refresh hook with automatic retry logic
export const useTokenRefresh = () => {
  const { refreshToken } = useAuthActions();
  const { token, sessionExpiry } = useAuth();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!token || !sessionExpiry) return;

    // Refresh 2 minutes before expiry
    const REFRESH_BEFORE_EXPIRY = 2 * 60 * 1000; // 2 minutes
    const timeUntilRefresh = sessionExpiry - Date.now() - REFRESH_BEFORE_EXPIRY;

    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const refreshTokenValue = localStorage.getItem('finance_tracker_refresh_token');
          if (refreshTokenValue) {
            await refreshToken(refreshTokenValue);
          }
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, timeUntilRefresh);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, sessionExpiry, refreshToken]);

  return { refreshToken };
};

// Activity tracking hook
export const useActivityTracking = () => {
  const { updateActivity, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to every 30 seconds
    let lastUpdate = 0;
    const throttledHandleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 30000) { // 30 seconds
        handleActivity();
        lastUpdate = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledHandleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandleActivity, true);
      });
    };
  }, [isAuthenticated, updateActivity]);
};

// Email verification hook (for future use)
export const useEmailVerification = () => {
  // This would integrate with email verification endpoints
  const verifyEmail = useCallback(async (token: string) => {
    // Implementation would go here
    console.log('Email verification:', token);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    // Implementation would go here
    console.log('Resend verification:', email);
  }, []);

  return {
    verifyEmail,
    resendVerification,
  };
};

// Password reset hook (for future use)
export const usePasswordReset = () => {
  // This would integrate with password reset endpoints
  const requestReset = useCallback(async (email: string) => {
    // Implementation would go here
    console.log('Password reset request:', email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    // Implementation would go here
    console.log('Reset password:', token, newPassword);
  }, []);

  return {
    requestReset,
    resetPassword,
  };
};