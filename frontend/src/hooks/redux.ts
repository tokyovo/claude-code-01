// Typed hooks for Redux state access
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { useCallback, useEffect } from 'react';
import type { RootState, AppDispatch } from '../store';
import { 
  addNotification, 
  removeNotification,
  openModal,
  closeModal,
  setGlobalLoading,
  setModuleLoading,
  updateFilter,
  resetFilter,
  toggleTheme,
  toggleSidebar,
} from '../store/slices/uiSlice';
import type { NotificationType, LoadingStates } from '../store/slices/uiSlice';
import { 
  selectIsAuthenticated, 
  selectCurrentUser, 
  selectAuthLoading,
  selectIsSessionExpired,
  selectTimeUntilExpiry,
  updateLastActivity,
  forceLogout
} from '../store/slices/authSlice';

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Authentication hooks
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectAuthLoading);
  const isSessionExpired = useAppSelector(selectIsSessionExpired);
  const timeUntilExpiry = useAppSelector(selectTimeUntilExpiry);

  const updateActivity = useCallback(() => {
    if (isAuthenticated) {
      dispatch(updateLastActivity());
    }
  }, [dispatch, isAuthenticated]);

  const logout = useCallback(() => {
    dispatch(forceLogout());
  }, [dispatch]);

  // Auto-logout on session expiry
  useEffect(() => {
    if (isSessionExpired && isAuthenticated) {
      dispatch(forceLogout());
    }
  }, [isSessionExpired, isAuthenticated, dispatch]);

  return {
    isAuthenticated,
    user,
    isLoading,
    isSessionExpired,
    timeUntilExpiry,
    updateActivity,
    logout,
  };
};

// Notification hooks
export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      actions?: Array<{
        label: string;
        action: () => void;
      }>;
    }
  ) => {
    dispatch(addNotification({
      type,
      title,
      message,
      ...(options?.duration !== undefined && { duration: options.duration }),
      ...(options?.actions && { actions: options.actions }),
    }));
  }, [dispatch]);

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    showNotification('success', title, message, duration !== undefined ? { duration } : undefined);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    showNotification('error', title, message, duration !== undefined ? { duration } : undefined);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    showNotification('warning', title, message, duration !== undefined ? { duration } : undefined);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    showNotification('info', title, message, duration !== undefined ? { duration } : undefined);
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    dispatch(removeNotification(id));
  }, [dispatch]);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
  };
};

// Modal hooks
export const useModal = () => {
  const dispatch = useAppDispatch();
  const modal = useAppSelector((state) => state.ui.modal);

  const openModalWithData = useCallback((
    type: string,
    data?: any,
    config?: {
      closable?: boolean;
      size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
      position?: 'center' | 'top' | 'bottom';
    }
  ) => {
    dispatch(openModal({ type, data, config }));
  }, [dispatch]);

  const closeCurrentModal = useCallback(() => {
    dispatch(closeModal());
  }, [dispatch]);

  const isModalOpen = useCallback((type?: string) => {
    return modal.isOpen && (type ? modal.type === type : true);
  }, [modal.isOpen, modal.type]);

  return {
    modal,
    openModal: openModalWithData,
    closeModal: closeCurrentModal,
    isModalOpen,
  };
};

// Loading state hooks
export const useLoading = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.ui.loading);

  const setLoading = useCallback((module: keyof LoadingStates, isLoading: boolean) => {
    dispatch(setModuleLoading({ module, loading: isLoading }));
  }, [dispatch]);

  const setGlobal = useCallback((isLoading: boolean) => {
    dispatch(setGlobalLoading(isLoading));
  }, [dispatch]);

  return {
    loading,
    setLoading,
    setGlobal,
    isGlobalLoading: loading.global,
    isAuthLoading: loading.auth,
    isTransactionsLoading: loading.transactions,
    isCategoriesLoading: loading.categories,
    isBudgetsLoading: loading.budgets,
    isAccountsLoading: loading.accounts,
    isReportsLoading: loading.reports,
  };
};

// Filter hooks
export const useFilters = (module: 'transactions' | 'categories' | 'budgets' | 'accounts') => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.ui.filters[module]);

  const updateFilters = useCallback((updates: Partial<typeof filters>) => {
    dispatch(updateFilter({ module, updates }));
  }, [dispatch, module]);

  const resetFilters = useCallback(() => {
    dispatch(resetFilter(module));
  }, [dispatch, module]);

  const setSearch = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  const setSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  const addFilter = useCallback((key: string, value: any) => {
    updateFilters({
      filters: { ...filters.filters, [key]: value },
      activeFilters: [...filters.activeFilters.filter(f => f !== key), key],
    });
  }, [updateFilters, filters.filters, filters.activeFilters]);

  const removeFilter = useCallback((key: string) => {
    const newFilters = { ...filters.filters };
    delete newFilters[key];
    updateFilters({
      filters: newFilters,
      activeFilters: filters.activeFilters.filter(f => f !== key),
    });
  }, [updateFilters, filters.filters, filters.activeFilters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    setSearch,
    setSorting,
    addFilter,
    removeFilter,
    hasActiveFilters: filters.activeFilters.length > 0,
    searchQuery: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
};

// UI preferences hooks
export const useUIPreferences = () => {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.ui.preferences);
  const theme = useAppSelector((state) => state.ui.preferences.theme);

  const toggleThemeMode = useCallback(() => {
    dispatch(toggleTheme());
  }, [dispatch]);

  const toggleSidebarState = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  return {
    preferences,
    theme,
    toggleTheme: toggleThemeMode,
    toggleSidebar: toggleSidebarState,
    isDarkMode: theme === 'dark',
    isLightMode: theme === 'light',
  };
};

// Sidebar hooks
export const useSidebar = () => {
  const dispatch = useAppDispatch();
  const sidebar = useAppSelector((state) => state.ui.sidebar);

  const toggle = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  return {
    sidebar,
    isOpen: sidebar.isOpen,
    activeMenu: sidebar.activeMenu,
    toggle,
  };
};

// Connectivity hooks
export const useConnectivity = () => {
  const connectivity = useAppSelector((state) => state.ui.connectivity);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'ui/setOnlineStatus', payload: true });
    const handleOffline = () => dispatch({ type: 'ui/setOnlineStatus', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return {
    isOnline: connectivity.isOnline,
    lastOnline: connectivity.lastOnline,
    isOffline: !connectivity.isOnline,
  };
};

// Custom hook for API error handling
export const useApiErrorHandler = () => {
  const { showError } = useNotifications();

  const handleApiError = useCallback((error: any, defaultMessage = 'An unexpected error occurred') => {
    let title = 'Error';
    let message = defaultMessage;

    if (error?.data) {
      title = error.data.error || title;
      message = error.data.message || message;
    } else if (error?.message) {
      message = error.message;
    }

    showError(title, message);
  }, [showError]);

  return { handleApiError };
};

// Custom hook for optimistic updates
export const useOptimisticUpdate = <T>(
  data: T[],
  idKey: keyof T = 'id' as keyof T
) => {
  const addOptimistic = useCallback((item: T) => {
    return [...data, item];
  }, [data]);

  const updateOptimistic = useCallback((id: any, updates: Partial<T>) => {
    return data.map(item => 
      item[idKey] === id ? { ...item, ...updates } : item
    );
  }, [data, idKey]);

  const removeOptimistic = useCallback((id: any) => {
    return data.filter(item => item[idKey] !== id);
  }, [data, idKey]);

  return {
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
  };
};

// Session management hook
export const useSessionManagement = () => {
  const { isAuthenticated, timeUntilExpiry } = useAuth();
  const { showWarning } = useNotifications();

  const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      if (timeUntilExpiry <= SESSION_WARNING_TIME && timeUntilExpiry > 0) {
        showWarning(
          'Session Expiring',
          'Your session will expire soon. Please save your work.',
          10000 // 10 seconds
        );
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, timeUntilExpiry, showWarning]);

  const extendSession = useCallback(() => {
    // This would typically trigger a token refresh
    // Implementation depends on your authentication strategy
    console.log('Extending session...');
  }, []);

  return {
    timeUntilExpiry,
    extendSession,
    isNearExpiry: timeUntilExpiry <= SESSION_WARNING_TIME,
  };
};