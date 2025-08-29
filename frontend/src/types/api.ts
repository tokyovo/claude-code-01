// API types and interfaces for Redux Toolkit Query
import type { 
  User, 
  Transaction, 
  TransactionType, 
  BudgetPeriod,
  FilterState,
  PaginationState 
} from './common';

// Authentication API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

// Backend API response structure
export interface BackendAuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      expiresAt: string;
    };
  };
  timestamp: string;
  meta: {
    apiVersion: string;
    requestId: string;
    processingTime: string;
    serverTime: string;
  };
}

// Frontend auth response (normalized)
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  remainingAttempts?: number;
  retryAfter?: number;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface SecurityMetricsResponse {
  failedLoginAttempts: number;
  remainingAttempts: number;
  isAccountLocked: boolean;
  lockoutExpiresAt?: string;
  lastLoginAt?: string;
  lastFailedLoginAt?: string;
}

// User API Types
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Transaction API Types
export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  accountId?: string;
}

export interface UpdateTransactionRequest {
  id: string;
  type?: TransactionType;
  amount?: number;
  description?: string;
  categoryId?: string;
  date?: string;
  accountId?: string;
}

export interface GetTransactionsRequest extends Partial<FilterState> {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: PaginationState;
}

// Category API Types
export interface CreateCategoryRequest {
  name: string;
  type: TransactionType;
  color?: string;
}

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  color?: string;
}

// Budget API Types
export interface CreateBudgetRequest {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
}

export interface UpdateBudgetRequest {
  id: string;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
}

// Account API Types
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AccountType = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  CREDIT_CARD: 'CREDIT_CARD',
  INVESTMENT: 'INVESTMENT',
  CASH: 'CASH',
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

export interface UpdateAccountRequest {
  id: string;
  name?: string;
  balance?: number;
  isActive?: boolean;
}

// Reports API Types
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportsRequest extends DateRange {
  categoryIds?: string[];
  accountIds?: string[];
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface BudgetProgress {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
}

export interface ReportsResponse {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  };
  categoryBreakdown: {
    income: CategorySummary[];
    expense: CategorySummary[];
  };
  monthlyTrends: MonthlyTrend[];
  budgetProgress: BudgetProgress[];
}

// Generic API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationState;
}

// RTK Query Tag Types
export type ApiTags = 
  | 'User' 
  | 'Transaction' 
  | 'Category' 
  | 'Budget' 
  | 'Account' 
  | 'Reports';

// Cache invalidation strategies
export interface InvalidationStrategy {
  tags: ApiTags[];
  optimistic?: boolean;
}