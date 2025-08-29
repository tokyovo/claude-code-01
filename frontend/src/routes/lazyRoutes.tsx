import { lazy } from 'react';
import { createLazyRoute } from '../components/routing/LazyRoute';

/**
 * Lazy-loaded route components for code splitting optimization
 * 
 * Benefits:
 * - Reduces initial bundle size
 * - Improves first page load performance
 * - Loads components only when needed
 * - Automatic code splitting by route
 */

// Auth Pages
export const LazyLogin = lazy(() => import('../pages/auth/Login'));
export const LazyRegister = lazy(() => import('../pages/auth/Register'));
export const LazyForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
export const LazyResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
export const LazyVerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'));

// Main Application Pages
export const LazyDashboard = lazy(() => import('../pages/dashboard/Dashboard'));
export const LazyTransactions = lazy(() => import('../pages/transactions/Transactions'));
export const LazyTransactionDetail = lazy(() => import('../pages/transactions/TransactionDetail'));
export const LazyAddTransaction = lazy(() => import('../pages/transactions/AddTransaction'));
export const LazyEditTransaction = lazy(() => import('../pages/transactions/EditTransaction'));

// Budget Management
export const LazyBudgets = lazy(() => import('../pages/budgets/Budgets'));
export const LazyBudgetDetail = lazy(() => import('../pages/budgets/BudgetDetail'));
export const LazyAddBudget = lazy(() => import('../pages/budgets/AddBudget'));
export const LazyEditBudget = lazy(() => import('../pages/budgets/EditBudget'));

// Categories
export const LazyCategories = lazy(() => import('../pages/categories/Categories'));

// Reports & Analytics
export const LazyReports = lazy(() => import('../pages/reports/Reports'));

// Settings & Profile
export const LazySettings = lazy(() => import('../pages/settings/Settings'));

// Error Pages
export const LazyNotFound = lazy(() => import('../pages/common/NotFound'));
export const LazyForbidden = lazy(() => import('../pages/common/Forbidden'));

/**
 * Pre-configured lazy route components with consistent loading behavior
 */

// Auth routes with minimal loading state
const authLoadingFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse">
      <div className="w-96 h-8 bg-gray-200 rounded mb-4"></div>
      <div className="w-96 h-64 bg-gray-100 rounded"></div>
    </div>
  </div>
);

export const LoginRoute = createLazyRoute(LazyLogin, { fallback: authLoadingFallback });
export const RegisterRoute = createLazyRoute(LazyRegister, { fallback: authLoadingFallback });
export const ForgotPasswordRoute = createLazyRoute(LazyForgotPassword, { fallback: authLoadingFallback });
export const ResetPasswordRoute = createLazyRoute(LazyResetPassword, { fallback: authLoadingFallback });
export const VerifyEmailRoute = createLazyRoute(LazyVerifyEmail, { fallback: authLoadingFallback });

// Main app routes with standard loading
export const DashboardRoute = createLazyRoute(LazyDashboard);
export const TransactionsRoute = createLazyRoute(LazyTransactions);
export const TransactionDetailRoute = createLazyRoute(LazyTransactionDetail);
export const AddTransactionRoute = createLazyRoute(LazyAddTransaction);
export const EditTransactionRoute = createLazyRoute(LazyEditTransaction);

export const BudgetsRoute = createLazyRoute(LazyBudgets);
export const BudgetDetailRoute = createLazyRoute(LazyBudgetDetail);
export const AddBudgetRoute = createLazyRoute(LazyAddBudget);
export const EditBudgetRoute = createLazyRoute(LazyEditBudget);

export const CategoriesRoute = createLazyRoute(LazyCategories);

export const ReportsRoute = createLazyRoute(LazyReports);

export const SettingsRoute = createLazyRoute(LazySettings);

export const NotFoundRoute = createLazyRoute(LazyNotFound);
export const ForbiddenRoute = createLazyRoute(LazyForbidden);