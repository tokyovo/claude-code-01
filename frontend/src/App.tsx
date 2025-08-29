import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import Layout from '@/components/layout/Layout';
import { ROUTES } from '@/constants';
import store from '@/store';
import { useAuth } from '@/hooks/redux';
import NotificationManager from '@/components/common/NotificationManager';
import SessionManager from '@/components/common/SessionManager';
import { ProtectedRoute, AuthRoute, RouteGuard } from '@/components/routing';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import {
  // Auth Routes
  LoginRoute,
  RegisterRoute,
  ForgotPasswordRoute,
  ResetPasswordRoute,
  VerifyEmailRoute,
  
  // Main App Routes
  DashboardRoute,
  TransactionsRoute,
  AddTransactionRoute,
  
  // Budget Routes
  BudgetsRoute,
  AddBudgetRoute,
  BudgetDetailRoute,
  EditBudgetRoute,
  
  // Category Routes
  CategoriesRoute,
  
  // Reports Routes
  ReportsRoute,
  
  // Settings Routes
  SettingsRoute,
  
  // Error Routes
  NotFoundRoute,
  ForbiddenRoute,
} from '@/routes/lazyRoutes';
import './App.css';

// Layout wrapper for protected routes
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Layout>
    <div className="space-y-6">
      <Breadcrumb />
      <RouteGuard>
        {children}
      </RouteGuard>
    </div>
  </Layout>
);

// App Router component that uses Redux state
const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <SessionManager />
      <NotificationManager />
      <Routes>
        {/* Public/Auth Routes */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <AuthRoute>
              <LoginRoute />
            </AuthRoute>
          }
        />
        <Route
          path={ROUTES.REGISTER}
          element={
            <AuthRoute>
              <RegisterRoute />
            </AuthRoute>
          }
        />
        <Route
          path={ROUTES.FORGOT_PASSWORD}
          element={
            <AuthRoute>
              <ForgotPasswordRoute />
            </AuthRoute>
          }
        />
        <Route
          path={ROUTES.RESET_PASSWORD}
          element={
            <AuthRoute>
              <ResetPasswordRoute />
            </AuthRoute>
          }
        />
        <Route
          path={ROUTES.VERIFY_EMAIL}
          element={
            <VerifyEmailRoute />
          }
        />

        {/* Protected Main Routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <DashboardRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        {/* Transaction Routes */}
        <Route
          path={ROUTES.TRANSACTIONS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <TransactionsRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.TRANSACTION_NEW}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <AddTransactionRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        {/* TODO: Add TransactionDetailRoute and EditTransactionRoute */}

        {/* Budget Routes */}
        <Route
          path={ROUTES.BUDGETS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <BudgetsRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BUDGET_NEW}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <AddBudgetRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BUDGET_DETAIL}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <BudgetDetailRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.BUDGET_EDIT}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <EditBudgetRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        {/* Category Routes */}
        <Route
          path={ROUTES.CATEGORIES}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <CategoriesRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        {/* TODO: Add CategoryDetailRoute and AddCategoryRoute */}

        {/* Reports Routes */}
        <Route
          path={ROUTES.REPORTS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <ReportsRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        {/* TODO: Add specific report routes */}

        {/* Settings Routes */}
        <Route
          path={ROUTES.SETTINGS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <SettingsRoute />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        {/* TODO: Add nested settings routes */}

        {/* Error Routes */}
        <Route
          path={ROUTES.NOT_FOUND}
          element={<NotFoundRoute />}
        />
        <Route
          path={ROUTES.FORBIDDEN}
          element={<ForbiddenRoute />}
        />

        {/* Default redirect */}
        <Route
          path={ROUTES.HOME}
          element={
            <Navigate 
              to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} 
              replace 
            />
          }
        />

        {/* Catch all route - redirect to 404 */}
        <Route 
          path="*" 
          element={<Navigate to={ROUTES.NOT_FOUND} replace />} 
        />
      </Routes>
    </Router>
  );
};

// Main App component with Redux Provider
function App() {
  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

export default App;
