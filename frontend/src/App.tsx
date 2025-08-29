import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/dashboard/Dashboard';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Transactions from '@/pages/transactions/Transactions';
import Categories from '@/pages/categories/Categories';
import Reports from '@/pages/reports/Reports';
import { ROUTES } from '@/constants';
import store from '@/store';
import { useAuth } from '@/hooks/redux';
import NotificationManager from '@/components/common/NotificationManager';
import SessionManager from '@/components/common/SessionManager';
import './App.css';

// App Router component that uses Redux state
const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} />;
  };

  const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return !isAuthenticated ? (
      <>{children}</>
    ) : (
      <Navigate to={ROUTES.DASHBOARD} />
    );
  };

  return (
    <Router>
      <SessionManager />
      <NotificationManager />
      <Routes>
        {/* Public Routes */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path={ROUTES.REGISTER}
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.TRANSACTIONS}
          element={
            <ProtectedRoute>
              <Layout>
                <Transactions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CATEGORIES}
          element={
            <ProtectedRoute>
              <Layout>
                <Categories />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.REPORTS}
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path={ROUTES.HOME}
          element={
            <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} />
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} />} />
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
