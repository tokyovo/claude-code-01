// Application constants for the Personal Finance Tracker

// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// Routes
export const ROUTES = {
  // Public Routes
  HOME: '/',
  LANDING: '/landing',
  
  // Auth Routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  
  // Protected Main Routes
  DASHBOARD: '/dashboard',
  
  // Transaction Routes
  TRANSACTIONS: '/transactions',
  TRANSACTION_NEW: '/transactions/new',
  TRANSACTION_DETAIL: '/transactions/:id',
  TRANSACTION_EDIT: '/transactions/:id/edit',
  
  // Budget Routes
  BUDGETS: '/budgets',
  BUDGET_NEW: '/budgets/new',
  BUDGET_DETAIL: '/budgets/:id',
  BUDGET_EDIT: '/budgets/:id/edit',
  
  // Category Routes
  CATEGORIES: '/categories',
  CATEGORY_NEW: '/categories/new',
  CATEGORY_DETAIL: '/categories/:id',
  
  // Reports Routes
  REPORTS: '/reports',
  REPORTS_SPENDING: '/reports/spending',
  REPORTS_INCOME: '/reports/income',
  REPORTS_BUDGET: '/reports/budget',
  REPORTS_CASHFLOW: '/reports/cashflow',
  
  // Settings Routes
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_SECURITY: '/settings/security',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_PREFERENCES: '/settings/preferences',
  
  // Error Routes
  NOT_FOUND: '/404',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',
  
  // Legal Pages
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms-of-service',
} as const;

// Route helper functions
export const createRouteWithId = (route: string, id: string | number): string => {
  return route.replace(':id', String(id));
};

export const isNestedRoute = (currentPath: string, parentPath: string): boolean => {
  return currentPath.startsWith(parentPath) && currentPath !== parentPath;
};

// Route metadata for breadcrumbs and navigation
export const ROUTE_META = {
  [ROUTES.DASHBOARD]: { title: 'Dashboard', breadcrumb: 'Dashboard' },
  [ROUTES.TRANSACTIONS]: { title: 'Transactions', breadcrumb: 'Transactions' },
  [ROUTES.TRANSACTION_NEW]: { title: 'Add Transaction', breadcrumb: 'New Transaction', parent: ROUTES.TRANSACTIONS },
  [ROUTES.TRANSACTION_DETAIL]: { title: 'Transaction Details', breadcrumb: 'Details', parent: ROUTES.TRANSACTIONS },
  [ROUTES.TRANSACTION_EDIT]: { title: 'Edit Transaction', breadcrumb: 'Edit', parent: ROUTES.TRANSACTIONS },
  [ROUTES.BUDGETS]: { title: 'Budgets', breadcrumb: 'Budgets' },
  [ROUTES.BUDGET_NEW]: { title: 'Create Budget', breadcrumb: 'New Budget', parent: ROUTES.BUDGETS },
  [ROUTES.BUDGET_DETAIL]: { title: 'Budget Details', breadcrumb: 'Details', parent: ROUTES.BUDGETS },
  [ROUTES.BUDGET_EDIT]: { title: 'Edit Budget', breadcrumb: 'Edit', parent: ROUTES.BUDGETS },
  [ROUTES.CATEGORIES]: { title: 'Categories', breadcrumb: 'Categories' },
  [ROUTES.CATEGORY_NEW]: { title: 'Add Category', breadcrumb: 'New Category', parent: ROUTES.CATEGORIES },
  [ROUTES.CATEGORY_DETAIL]: { title: 'Category Details', breadcrumb: 'Details', parent: ROUTES.CATEGORIES },
  [ROUTES.REPORTS]: { title: 'Reports', breadcrumb: 'Reports' },
  [ROUTES.REPORTS_SPENDING]: { title: 'Spending Report', breadcrumb: 'Spending', parent: ROUTES.REPORTS },
  [ROUTES.REPORTS_INCOME]: { title: 'Income Report', breadcrumb: 'Income', parent: ROUTES.REPORTS },
  [ROUTES.REPORTS_BUDGET]: { title: 'Budget Report', breadcrumb: 'Budget Analysis', parent: ROUTES.REPORTS },
  [ROUTES.REPORTS_CASHFLOW]: { title: 'Cash Flow Report', breadcrumb: 'Cash Flow', parent: ROUTES.REPORTS },
  [ROUTES.SETTINGS]: { title: 'Settings', breadcrumb: 'Settings' },
  [ROUTES.SETTINGS_PROFILE]: { title: 'Profile Settings', breadcrumb: 'Profile', parent: ROUTES.SETTINGS },
  [ROUTES.SETTINGS_ACCOUNT]: { title: 'Account Settings', breadcrumb: 'Account', parent: ROUTES.SETTINGS },
  [ROUTES.SETTINGS_SECURITY]: { title: 'Security Settings', breadcrumb: 'Security', parent: ROUTES.SETTINGS },
  [ROUTES.SETTINGS_NOTIFICATIONS]: { title: 'Notification Settings', breadcrumb: 'Notifications', parent: ROUTES.SETTINGS },
  [ROUTES.SETTINGS_PREFERENCES]: { title: 'Preferences', breadcrumb: 'Preferences', parent: ROUTES.SETTINGS },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'finance_tracker_auth_token',
  USER: 'finance_tracker_user',
  THEME: 'finance_tracker_theme',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  API: 'yyyy-MM-dd',
} as const;

// Transaction Categories (Default)
export const DEFAULT_CATEGORIES = {
  INCOME: [
    { name: 'Salary', color: '#10B981' },
    { name: 'Freelance', color: '#059669' },
    { name: 'Investment', color: '#047857' },
    { name: 'Other Income', color: '#065F46' },
  ],
  EXPENSE: [
    { name: 'Food & Dining', color: '#EF4444' },
    { name: 'Transportation', color: '#F97316' },
    { name: 'Shopping', color: '#8B5CF6' },
    { name: 'Entertainment', color: '#EC4899' },
    { name: 'Bills & Utilities', color: '#6B7280' },
    { name: 'Healthcare', color: '#14B8A6' },
    { name: 'Education', color: '#3B82F6' },
    { name: 'Other Expense', color: '#64748B' },
  ],
} as const;

// Form Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 255,
  AMOUNT_MAX_DIGITS: 10,
} as const;

// Chart Colors
export const CHART_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#F43F5E',
  '#06B6D4',
] as const;

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;
