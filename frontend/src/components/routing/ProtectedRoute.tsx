import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useActivityTracking } from '../../hooks/auth';
import { ROUTES } from '../../constants';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  fallbackPath?: string;
  requireEmailVerification?: boolean;
}

/**
 * ProtectedRoute component that guards routes requiring authentication
 * 
 * Features:
 * - Authentication verification
 * - Role-based access control
 * - Email verification requirements
 * - Loading states during auth checks
 * - Automatic redirect with return path
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = [],
  fallbackPath = ROUTES.LOGIN,
  requireEmailVerification = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  // Enable activity tracking for authenticated users
  useActivityTracking();

  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // Check email verification requirement
  if (requireEmailVerification && !user.emailVerified) {
    return (
      <Navigate
        to={ROUTES.VERIFY_EMAIL}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // Check role-based access
  if (requiredRole.length > 0 && user.role && !requiredRole.includes(user.role)) {
    return (
      <Navigate
        to={ROUTES.FORBIDDEN}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;