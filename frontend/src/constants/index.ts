// Application constants for the Personal Finance Tracker

// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  CATEGORIES: '/categories',
  REPORTS: '/reports',
  PROFILE: '/profile',
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
