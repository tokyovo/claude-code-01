import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/redux';
import { ROUTES } from '@/constants';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AuthRouteProps {
  children: React.ReactNode;
  redirectPath?: string;
}

/**
 * AuthRoute component that handles routes for unauthenticated users
 * 
 * Features:
 * - Redirects authenticated users away from auth pages
 * - Supports custom redirect paths
 * - Handles loading states
 * - Preserves intended destination from state
 */
const AuthRoute: React.FC<AuthRouteProps> = ({
  children,
  redirectPath = ROUTES.DASHBOARD,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard or intended destination
  if (isAuthenticated) {
    // Check if there was an intended destination
    const from = location.state?.from;
    const destination = from && from !== ROUTES.LOGIN && from !== ROUTES.REGISTER 
      ? from 
      : redirectPath;
    
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

export default AuthRoute;