import authSlice, {
  setCredentials,
  clearCredentials,
  updateUser,
  setAuthLoading,
  updateLastActivity,
  forceLogout,
  selectCurrentUser,
  selectAuthToken,
  selectRefreshToken,
  selectIsAuthenticated,
  selectAuthLoading,
  selectLastActivity,
  selectSessionExpiry,
  selectIsSessionExpired,
  selectTimeUntilExpiry,
  AuthState
} from '../../../store/slices/authSlice';
import { api } from '../../../store/api/apiSlice';
import { STORAGE_KEYS } from '../../../constants';

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

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('authSlice', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    email_verified: false,
    status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    phone: '+1234567890',
    avatar_url: null,
    preferences: {},
    last_login: '2024-01-01T00:00:00Z',
  };

  const mockTokens = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    expiresIn: 900, // 15 minutes
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state when localStorage is empty', () => {
      const state = authSlice(undefined, { type: 'unknown' });

      expect(state).toEqual({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: expect.any(Number),
        sessionExpiry: null,
      });
    });

    it('should load initial state from localStorage', () => {
      const storedToken = 'stored-token-123';
      const storedUser = JSON.stringify(mockUser);

      localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, storedToken);
      localStorageMock.setItem(STORAGE_KEYS.USER, storedUser);

      // Re-evaluate initial state
      const initialState = {
        user: JSON.parse(localStorageMock.getItem(STORAGE_KEYS.USER) || 'null'),
        token: localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN),
        refreshToken: null,
        isAuthenticated: !!localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN),
        isLoading: false,
        lastActivity: expect.any(Number),
        sessionExpiry: null,
      };

      expect(initialState.user).toEqual(mockUser);
      expect(initialState.token).toBe(storedToken);
      expect(initialState.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.USER, 'invalid-json');
      localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, 'valid-token');

      // Should not crash and should return safe defaults
      const state = authSlice(undefined, { type: 'unknown' });
      
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setCredentials', () => {
    it('should set user credentials and update localStorage', () => {
      const initialState: AuthState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: null,
        sessionExpiry: null,
      };

      const action = setCredentials({
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: mockTokens.expiresIn,
      });

      const newState = authSlice(initialState, action);

      expect(newState.user).toEqual(mockUser);
      expect(newState.token).toBe(mockTokens.accessToken);
      expect(newState.refreshToken).toBe(mockTokens.refreshToken);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.isLoading).toBe(false);
      expect(newState.lastActivity).toBeGreaterThan(0);
      expect(newState.sessionExpiry).toBeGreaterThan(Date.now());

      // Check localStorage
      expect(localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBe(mockTokens.accessToken);
      expect(JSON.parse(localStorageMock.getItem(STORAGE_KEYS.USER) || '{}')).toEqual(mockUser);
    });

    it('should handle localStorage errors gracefully', () => {
      const mockSetItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      localStorageMock.setItem = mockSetItem;

      const initialState: AuthState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: null,
        sessionExpiry: null,
      };

      const action = setCredentials({
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: mockTokens.expiresIn,
      });

      // Should not throw error
      expect(() => authSlice(initialState, action)).not.toThrow();

      // State should still be updated
      const newState = authSlice(initialState, action);
      expect(newState.isAuthenticated).toBe(true);
    });
  });

  describe('clearCredentials', () => {
    it('should clear all credentials and localStorage', () => {
      const initialState: AuthState = {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
        sessionExpiry: Date.now() + 900000,
      };

      localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, mockTokens.accessToken);
      localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

      const action = clearCredentials();
      const newState = authSlice(initialState, action);

      expect(newState.user).toBeNull();
      expect(newState.token).toBeNull();
      expect(newState.refreshToken).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.isLoading).toBe(false);
      expect(newState.lastActivity).toBeNull();
      expect(newState.sessionExpiry).toBeNull();

      // Check localStorage is cleared
      expect(localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile and localStorage', () => {
      const initialState: AuthState = {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
        sessionExpiry: Date.now() + 900000,
      };

      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      const action = updateUser(updateData);
      const newState = authSlice(initialState, action);

      expect(newState.user?.first_name).toBe('Updated');
      expect(newState.user?.last_name).toBe('Name');
      expect(newState.user?.email).toBe(mockUser.email); // Should preserve other fields

      // Check localStorage is updated
      const storedUser = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.USER) || '{}');
      expect(storedUser.first_name).toBe('Updated');
      expect(storedUser.last_name).toBe('Name');
    });

    it('should handle update when user is null', () => {
      const initialState: AuthState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: null,
        sessionExpiry: null,
      };

      const updateData = { first_name: 'Test' };
      const action = updateUser(updateData);
      const newState = authSlice(initialState, action);

      expect(newState.user).toBeNull(); // Should remain null
    });
  });

  describe('setAuthLoading', () => {
    it('should set loading state', () => {
      const initialState: AuthState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        lastActivity: null,
        sessionExpiry: null,
      };

      const action = setAuthLoading(true);
      const newState = authSlice(initialState, action);

      expect(newState.isLoading).toBe(true);

      const action2 = setAuthLoading(false);
      const newState2 = authSlice(newState, action2);

      expect(newState2.isLoading).toBe(false);
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity timestamp', () => {
      const initialState: AuthState = {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now() - 10000, // 10 seconds ago
        sessionExpiry: Date.now() + 900000,
      };

      const oldLastActivity = initialState.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        const action = updateLastActivity();
        const newState = authSlice(initialState, action);

        expect(newState.lastActivity).toBeGreaterThan(oldLastActivity || 0);
      }, 10);
    });
  });

  describe('forceLogout', () => {
    it('should force logout and clear all data', () => {
      const initialState: AuthState = {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
        sessionExpiry: Date.now() + 900000,
      };

      localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, mockTokens.accessToken);
      localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

      const action = forceLogout();
      const newState = authSlice(initialState, action);

      expect(newState.user).toBeNull();
      expect(newState.token).toBeNull();
      expect(newState.refreshToken).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.isLoading).toBe(false);
      expect(newState.lastActivity).toBeNull();
      expect(newState.sessionExpiry).toBeNull();

      // Check localStorage is cleared
      expect(localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeNull();
    });
  });

  describe('selectors', () => {
    const mockState = {
      auth: {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
        sessionExpiry: Date.now() + 900000,
      }
    };

    const mockExpiredState = {
      auth: {
        ...mockState.auth,
        sessionExpiry: Date.now() - 1000, // Expired
      }
    };

    it('should select current user', () => {
      expect(selectCurrentUser(mockState)).toEqual(mockUser);
    });

    it('should select auth token', () => {
      expect(selectAuthToken(mockState)).toBe(mockTokens.accessToken);
    });

    it('should select refresh token', () => {
      expect(selectRefreshToken(mockState)).toBe(mockTokens.refreshToken);
    });

    it('should select authentication status', () => {
      expect(selectIsAuthenticated(mockState)).toBe(true);
    });

    it('should select loading status', () => {
      expect(selectAuthLoading(mockState)).toBe(false);
    });

    it('should select last activity', () => {
      expect(selectLastActivity(mockState)).toBe(mockState.auth.lastActivity);
    });

    it('should select session expiry', () => {
      expect(selectSessionExpiry(mockState)).toBe(mockState.auth.sessionExpiry);
    });

    it('should detect session expiry', () => {
      expect(selectIsSessionExpired(mockState)).toBe(false);
      expect(selectIsSessionExpired(mockExpiredState)).toBe(true);
    });

    it('should calculate time until expiry', () => {
      const timeUntilExpiry = selectTimeUntilExpiry(mockState);
      expect(timeUntilExpiry).toBeGreaterThan(0);

      const expiredTimeUntilExpiry = selectTimeUntilExpiry(mockExpiredState);
      expect(expiredTimeUntilExpiry).toBe(0);
    });

    it('should handle null session expiry in selectors', () => {
      const nullExpiryState = {
        auth: {
          ...mockState.auth,
          sessionExpiry: null,
        }
      };

      expect(selectIsSessionExpired(nullExpiryState)).toBe(false);
      expect(selectTimeUntilExpiry(nullExpiryState)).toBe(0);
    });
  });

  describe('extraReducers - API integration', () => {
    describe('login endpoints', () => {
      it('should handle login pending', () => {
        const initialState: AuthState = {
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
          sessionExpiry: null,
        };

        const action = {
          type: 'api/executeQuery/pending',
          meta: {
            arg: {
              endpointName: 'login',
            }
          }
        };

        const newState = authSlice(initialState, action);
        expect(newState.isLoading).toBe(true);
      });

      it('should handle login fulfilled', () => {
        const initialState: AuthState = {
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: true,
          lastActivity: null,
          sessionExpiry: null,
        };

        const loginResponse = {
          user: mockUser,
          token: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          expiresIn: mockTokens.expiresIn,
        };

        const action = {
          type: 'api/executeQuery/fulfilled',
          payload: loginResponse,
          meta: {
            arg: {
              endpointName: 'login',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.user).toEqual(mockUser);
        expect(newState.token).toBe(mockTokens.accessToken);
        expect(newState.refreshToken).toBe(mockTokens.refreshToken);
        expect(newState.isAuthenticated).toBe(true);
        expect(newState.isLoading).toBe(false);
        expect(newState.lastActivity).toBeGreaterThan(0);
        expect(newState.sessionExpiry).toBeGreaterThan(Date.now());
      });

      it('should handle login rejected', () => {
        const initialState: AuthState = {
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: true,
          lastActivity: null,
          sessionExpiry: null,
        };

        const action = {
          type: 'api/executeQuery/rejected',
          meta: {
            arg: {
              endpointName: 'login',
            }
          }
        };

        const newState = authSlice(initialState, action);
        expect(newState.isLoading).toBe(false);
        expect(newState.isAuthenticated).toBe(false);
      });
    });

    describe('register endpoints', () => {
      it('should handle register fulfilled same as login', () => {
        const initialState: AuthState = {
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
          sessionExpiry: null,
        };

        const registerResponse = {
          user: mockUser,
          token: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          expiresIn: mockTokens.expiresIn,
        };

        const action = {
          type: 'api/executeQuery/fulfilled',
          payload: registerResponse,
          meta: {
            arg: {
              endpointName: 'register',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.isAuthenticated).toBe(true);
        expect(newState.user).toEqual(mockUser);
      });
    });

    describe('refresh token endpoints', () => {
      it('should handle refresh token fulfilled', () => {
        const initialState: AuthState = {
          user: mockUser,
          token: 'old-token',
          refreshToken: 'old-refresh-token',
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now() - 10000,
          sessionExpiry: Date.now() + 300000,
        };

        const refreshResponse = {
          user: mockUser,
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900,
        };

        const action = {
          type: 'api/executeQuery/fulfilled',
          payload: refreshResponse,
          meta: {
            arg: {
              endpointName: 'refreshToken',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.token).toBe('new-access-token');
        expect(newState.refreshToken).toBe('new-refresh-token');
        expect(newState.isAuthenticated).toBe(true);
        expect(newState.sessionExpiry).toBeGreaterThan(initialState.sessionExpiry || 0);
      });

      it('should handle refresh token rejected', () => {
        const initialState: AuthState = {
          user: mockUser,
          token: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now(),
          sessionExpiry: Date.now() + 900000,
        };

        localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, mockTokens.accessToken);
        localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

        const action = {
          type: 'api/executeQuery/rejected',
          meta: {
            arg: {
              endpointName: 'refreshToken',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.user).toBeNull();
        expect(newState.token).toBeNull();
        expect(newState.refreshToken).toBeNull();
        expect(newState.isAuthenticated).toBe(false);
        expect(newState.sessionExpiry).toBeNull();

        // Check localStorage is cleared
        expect(localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
        expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeNull();
      });
    });

    describe('logout endpoints', () => {
      it('should handle logout fulfilled', () => {
        const initialState: AuthState = {
          user: mockUser,
          token: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now(),
          sessionExpiry: Date.now() + 900000,
        };

        localStorageMock.setItem(STORAGE_KEYS.AUTH_TOKEN, mockTokens.accessToken);
        localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

        const action = {
          type: 'api/executeMutation/fulfilled',
          meta: {
            arg: {
              endpointName: 'logout',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.user).toBeNull();
        expect(newState.token).toBeNull();
        expect(newState.refreshToken).toBeNull();
        expect(newState.isAuthenticated).toBe(false);
        expect(newState.isLoading).toBe(false);
        expect(newState.lastActivity).toBeNull();
        expect(newState.sessionExpiry).toBeNull();

        // Check localStorage is cleared
        expect(localStorageMock.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
        expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeNull();
      });
    });

    describe('update profile endpoints', () => {
      it('should handle update profile fulfilled', () => {
        const initialState: AuthState = {
          user: mockUser,
          token: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now(),
          sessionExpiry: Date.now() + 900000,
        };

        const updatedProfile = {
          first_name: 'Updated',
          last_name: 'Profile',
        };

        const action = {
          type: 'api/executeMutation/fulfilled',
          payload: updatedProfile,
          meta: {
            arg: {
              endpointName: 'updateProfile',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.user?.first_name).toBe('Updated');
        expect(newState.user?.last_name).toBe('Profile');
        expect(newState.user?.email).toBe(mockUser.email); // Preserve other fields

        // Check localStorage is updated
        const storedUser = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.USER) || '{}');
        expect(storedUser.first_name).toBe('Updated');
        expect(storedUser.last_name).toBe('Profile');
      });

      it('should handle update profile when user is null', () => {
        const initialState: AuthState = {
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
          sessionExpiry: null,
        };

        const updatedProfile = {
          first_name: 'Updated',
          last_name: 'Profile',
        };

        const action = {
          type: 'api/executeMutation/fulfilled',
          payload: updatedProfile,
          meta: {
            arg: {
              endpointName: 'updateProfile',
            }
          }
        };

        const newState = authSlice(initialState, action);

        expect(newState.user).toBeNull(); // Should remain null
      });
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage errors during state updates', () => {
      const mockRemoveItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      localStorageMock.removeItem = mockRemoveItem;

      const initialState: AuthState = {
        user: mockUser,
        token: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        lastActivity: Date.now(),
        sessionExpiry: Date.now() + 900000,
      };

      // Should not throw error even if localStorage fails
      expect(() => {
        const action = clearCredentials();
        authSlice(initialState, action);
      }).not.toThrow();
    });
  });

  describe('session expiry calculations', () => {
    it('should handle edge cases in time calculations', () => {
      const futureTime = Date.now() + 1000000;
      const pastTime = Date.now() - 1000000;

      const futureState = { auth: { sessionExpiry: futureTime } };
      const pastState = { auth: { sessionExpiry: pastTime } };
      const nullState = { auth: { sessionExpiry: null } };

      expect(selectTimeUntilExpiry(futureState)).toBeGreaterThan(0);
      expect(selectTimeUntilExpiry(pastState)).toBe(0);
      expect(selectTimeUntilExpiry(nullState)).toBe(0);

      expect(selectIsSessionExpired(futureState)).toBe(false);
      expect(selectIsSessionExpired(pastState)).toBe(true);
      expect(selectIsSessionExpired(nullState)).toBe(false);
    });
  });
});