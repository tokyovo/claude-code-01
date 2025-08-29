// UI slice for app-wide state management
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
  timestamp: number;
}

// Modal types
export interface ModalState {
  type: string | null;
  isOpen: boolean;
  data?: any;
  config?: {
    closable?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    position?: 'center' | 'top' | 'bottom';
  };
}

// Filter state for various lists
export interface FilterConfig {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
  activeFilters: string[];
  savedFilters: Record<string, any>;
}

// UI preferences
export interface UIPreferences {
  theme: 'light' | 'dark';
  language: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
  sidebarCollapsed: boolean;
  dashboardLayout: 'grid' | 'list';
  transactionGrouping: 'date' | 'category' | 'amount';
}

// Loading states for different operations
export interface LoadingStates {
  global: boolean;
  auth: boolean;
  transactions: boolean;
  categories: boolean;
  budgets: boolean;
  accounts: boolean;
  reports: boolean;
}

// UI state interface
export interface UIState {
  notifications: Notification[];
  modal: ModalState;
  loading: LoadingStates;
  preferences: UIPreferences;
  filters: {
    transactions: FilterConfig;
    categories: FilterConfig;
    budgets: FilterConfig;
    accounts: FilterConfig;
  };
  sidebar: {
    isOpen: boolean;
    activeMenu: string | null;
  };
  layout: {
    headerHeight: number;
    sidebarWidth: number;
    contentPadding: number;
  };
  connectivity: {
    isOnline: boolean;
    lastOnline: number | null;
  };
}

// Load preferences from localStorage
const loadPreferencesFromStorage = (): Partial<UIPreferences> => {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' || 'light';
    return { theme };
  } catch {
    return {};
  }
};

// Initial state
const initialState: UIState = {
  notifications: [],
  modal: {
    type: null,
    isOpen: false,
    data: null,
  } as ModalState,
  loading: {
    global: false,
    auth: false,
    transactions: false,
    categories: false,
    budgets: false,
    accounts: false,
    reports: false,
  },
  preferences: {
    theme: 'light',
    language: 'en',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: 'en-US',
    sidebarCollapsed: false,
    dashboardLayout: 'grid',
    transactionGrouping: 'date',
    ...loadPreferencesFromStorage(),
  },
  filters: {
    transactions: {
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
      filters: {},
      activeFilters: [],
      savedFilters: {},
    },
    categories: {
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      filters: {},
      activeFilters: [],
      savedFilters: {},
    },
    budgets: {
      search: '',
      sortBy: 'amount',
      sortOrder: 'desc',
      filters: {},
      activeFilters: [],
      savedFilters: {},
    },
    accounts: {
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      filters: {},
      activeFilters: [],
      savedFilters: {},
    },
  },
  sidebar: {
    isOpen: true,
    activeMenu: null,
  },
  layout: {
    headerHeight: 64,
    sidebarWidth: 256,
    contentPadding: 24,
  },
  connectivity: {
    isOnline: navigator.onLine,
    lastOnline: Date.now(),
  },
};

// Generate unique notification ID
const generateNotificationId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Notification management
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        id: generateNotificationId(),
        timestamp: Date.now(),
        duration: 5000, // Default 5 seconds
        ...action.payload,
      };
      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    clearAllNotifications: (state) => {
      state.notifications = [];
    },

    // Modal management
    openModal: (state, action: PayloadAction<{
      type: string;
      data?: any;
      config?: ModalState['config'];
    }>) => {
      state.modal.type = action.payload.type;
      state.modal.data = action.payload.data || null;
      if (action.payload.config !== undefined) {
        state.modal.config = action.payload.config;
      }
      state.modal.isOpen = true;
    },

    closeModal: (state) => {
      state.modal = {
        type: null,
        isOpen: false,
        data: null,
      };
    },

    updateModalData: (state, action: PayloadAction<any>) => {
      state.modal.data = action.payload;
    },

    // Loading states
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },

    setModuleLoading: (state, action: PayloadAction<{
      module: keyof LoadingStates;
      loading: boolean;
    }>) => {
      state.loading[action.payload.module] = action.payload.loading;
    },

    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<UIPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      
      // Save theme to localStorage
      if (action.payload.theme) {
        try {
          localStorage.setItem(STORAGE_KEYS.THEME, action.payload.theme);
        } catch (error) {
          console.error('Failed to save theme to localStorage:', error);
        }
      }
    },

    toggleTheme: (state) => {
      const newTheme = state.preferences.theme === 'light' ? 'dark' : 'light';
      state.preferences.theme = newTheme;
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    },

    toggleSidebarCollapse: (state) => {
      state.preferences.sidebarCollapsed = !state.preferences.sidebarCollapsed;
    },

    // Filter management
    updateFilter: (state, action: PayloadAction<{
      module: keyof UIState['filters'];
      updates: Partial<FilterConfig>;
    }>) => {
      const { module, updates } = action.payload;
      state.filters[module] = { ...state.filters[module], ...updates };
    },

    resetFilter: (state, action: PayloadAction<keyof UIState['filters']>) => {
      const module = action.payload;
      state.filters[module] = {
        search: '',
        sortBy: initialState.filters[module].sortBy,
        sortOrder: initialState.filters[module].sortOrder,
        filters: {},
        activeFilters: [],
        savedFilters: state.filters[module].savedFilters, // Keep saved filters
      };
    },

    saveFilter: (state, action: PayloadAction<{
      module: keyof UIState['filters'];
      name: string;
      filter: Record<string, any>;
    }>) => {
      const { module, name, filter } = action.payload;
      state.filters[module].savedFilters[name] = filter;
    },

    deleteSavedFilter: (state, action: PayloadAction<{
      module: keyof UIState['filters'];
      name: string;
    }>) => {
      const { module, name } = action.payload;
      delete state.filters[module].savedFilters[name];
    },

    // Sidebar management
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isOpen = action.payload;
    },

    setActiveMenu: (state, action: PayloadAction<string | null>) => {
      state.sidebar.activeMenu = action.payload;
    },

    // Layout management
    updateLayout: (state, action: PayloadAction<Partial<UIState['layout']>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },

    // Connectivity
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.connectivity.isOnline = action.payload;
      if (action.payload) {
        state.connectivity.lastOnline = Date.now();
      }
    },
  },
});

// Export actions
export const {
  // Notifications
  addNotification,
  removeNotification,
  clearAllNotifications,
  
  // Modal
  openModal,
  closeModal,
  updateModalData,
  
  // Loading
  setGlobalLoading,
  setModuleLoading,
  
  // Preferences
  updatePreferences,
  toggleTheme,
  toggleSidebarCollapse,
  
  // Filters
  updateFilter,
  resetFilter,
  saveFilter,
  deleteSavedFilter,
  
  // Sidebar
  toggleSidebar,
  setSidebarOpen,
  setActiveMenu,
  
  // Layout
  updateLayout,
  
  // Connectivity
  setOnlineStatus,
} = uiSlice.actions;

// Selectors
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectModal = (state: { ui: UIState }) => state.ui.modal;
export const selectLoading = (state: { ui: UIState }) => state.ui.loading;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.loading.global;
export const selectModuleLoading = (module: keyof LoadingStates) => 
  (state: { ui: UIState }) => state.ui.loading[module];

export const selectPreferences = (state: { ui: UIState }) => state.ui.preferences;
export const selectTheme = (state: { ui: UIState }) => state.ui.preferences.theme;
export const selectIsSidebarCollapsed = (state: { ui: UIState }) => state.ui.preferences.sidebarCollapsed;

export const selectFilters = (state: { ui: UIState }) => state.ui.filters;
export const selectModuleFilter = (module: keyof UIState['filters']) => 
  (state: { ui: UIState }) => state.ui.filters[module];

export const selectSidebar = (state: { ui: UIState }) => state.ui.sidebar;
export const selectLayout = (state: { ui: UIState }) => state.ui.layout;
export const selectConnectivity = (state: { ui: UIState }) => state.ui.connectivity;

// Helper selectors
export const selectHasNotifications = (state: { ui: UIState }) => state.ui.notifications.length > 0;
export const selectUnreadNotifications = (state: { ui: UIState }) => 
  state.ui.notifications.filter(n => !n.actions?.some(a => a.label === 'Mark as read'));
export const selectIsModalOpen = (type?: string) => (state: { ui: UIState }) => 
  state.ui.modal.isOpen && (type ? state.ui.modal.type === type : true);

// Export reducer
export default uiSlice.reducer;