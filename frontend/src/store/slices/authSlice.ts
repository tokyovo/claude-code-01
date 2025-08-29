// Authentication slice for user state management
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/common';
import { api } from '../api/apiSlice';
import { STORAGE_KEYS } from '../../constants';

// Auth state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivity: number | null;
  sessionExpiry: number | null;
}

// Load initial state from localStorage
const loadTokenFromStorage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
};

const loadUserFromStorage = (): User | null => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  user: loadUserFromStorage(),
  token: loadTokenFromStorage(),
  refreshToken: null,
  isAuthenticated: !!loadTokenFromStorage(),
  isLoading: false,
  lastActivity: Date.now(),
  sessionExpiry: null,
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authentication data
    setCredentials: (
      state, 
      action: PayloadAction<{ 
        user: User; 
        token: string; 
        refreshToken: string;
        expiresIn: number;
      }>
    ) => {
      const { user, token, refreshToken, expiresIn } = action.payload;
      
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.lastActivity = Date.now();
      state.sessionExpiry = Date.now() + (expiresIn * 1000);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } catch (error) {
        console.error('Failed to save auth data to localStorage:', error);
      }
    },

    // Clear authentication data
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.lastActivity = null;
      state.sessionExpiry = null;

      // Clear from localStorage
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } catch (error) {
        console.error('Failed to clear auth data from localStorage:', error);
      }
    },

    // Update user profile
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        
        // Update localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
        } catch (error) {
          console.error('Failed to update user in localStorage:', error);
        }
      }
    },

    // Set loading state
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Update last activity timestamp
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },

    // Force logout (for session expiry, etc.)
    forceLogout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.lastActivity = null;
      state.sessionExpiry = null;

      // Clear from localStorage
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } catch (error) {
        console.error('Failed to clear auth data from localStorage:', error);
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addMatcher(
      api.endpoints.login.matchPending,
      (state) => {
        state.isLoading = true;
      }
    );
    builder.addMatcher(
      api.endpoints.login.matchFulfilled,
      (state, action) => {
        const { user, token, refreshToken, expiresIn } = action.payload;
        
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.lastActivity = Date.now();
        state.sessionExpiry = Date.now() + (expiresIn * 1000);

        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
          console.error('Failed to save auth data to localStorage:', error);
        }
      }
    );
    builder.addMatcher(
      api.endpoints.login.matchRejected,
      (state) => {
        state.isLoading = false;
      }
    );

    // Register
    builder.addMatcher(
      api.endpoints.register.matchPending,
      (state) => {
        state.isLoading = true;
      }
    );
    builder.addMatcher(
      api.endpoints.register.matchFulfilled,
      (state, action) => {
        const { user, token, refreshToken, expiresIn } = action.payload;
        
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.lastActivity = Date.now();
        state.sessionExpiry = Date.now() + (expiresIn * 1000);

        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
          console.error('Failed to save auth data to localStorage:', error);
        }
      }
    );
    builder.addMatcher(
      api.endpoints.register.matchRejected,
      (state) => {
        state.isLoading = false;
      }
    );

    // Refresh token
    builder.addMatcher(
      api.endpoints.refreshToken.matchFulfilled,
      (state, action) => {
        const { user, token, refreshToken, expiresIn } = action.payload;
        
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
        state.sessionExpiry = Date.now() + (expiresIn * 1000);

        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
          console.error('Failed to save auth data to localStorage:', error);
        }
      }
    );
    builder.addMatcher(
      api.endpoints.refreshToken.matchRejected,
      (state) => {
        // Refresh failed, clear auth state
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;

        // Clear from localStorage
        try {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        } catch (error) {
          console.error('Failed to clear auth data from localStorage:', error);
        }
      }
    );

    // Logout
    builder.addMatcher(
      api.endpoints.logout.matchFulfilled,
      (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.lastActivity = null;
        state.sessionExpiry = null;

        // Clear from localStorage
        try {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        } catch (error) {
          console.error('Failed to clear auth data from localStorage:', error);
        }
      }
    );

    // Update profile
    builder.addMatcher(
      api.endpoints.updateProfile.matchFulfilled,
      (state, action) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          
          // Update localStorage
          try {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
          } catch (error) {
            console.error('Failed to update user in localStorage:', error);
          }
        }
      }
    );
  },
});

// Export actions
export const {
  setCredentials,
  clearCredentials,
  updateUser,
  setAuthLoading,
  updateLastActivity,
  forceLogout,
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectLastActivity = (state: { auth: AuthState }) => state.auth.lastActivity;
export const selectSessionExpiry = (state: { auth: AuthState }) => state.auth.sessionExpiry;

// Helper selectors
export const selectIsSessionExpired = (state: { auth: AuthState }) => {
  const { sessionExpiry } = state.auth;
  return sessionExpiry ? Date.now() > sessionExpiry : false;
};

export const selectTimeUntilExpiry = (state: { auth: AuthState }) => {
  const { sessionExpiry } = state.auth;
  return sessionExpiry ? Math.max(0, sessionExpiry - Date.now()) : 0;
};

// Export reducer
export default authSlice.reducer;