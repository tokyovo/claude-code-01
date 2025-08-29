import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRequireGuest } from '../../hooks/auth';
import { ROUTES } from '../../constants';
import LoadingSpinner from '../ui/LoadingSpinner';

interface GuestRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * GuestRoute component that restricts access for authenticated users
 * 
 * Features:
 * - Redirects authenticated users away from guest-only pages
 * - Loading states during authentication checks
 * - Preserves intended destination after auth
 * - Used for login, register, forgot password pages
 */
const GuestRoute: React.FC<GuestRouteProps> = ({
  children,
  redirectTo = ROUTES.DASHBOARD,
}) => {
  const { isAllowed, isLoading } = useRequireGuest(redirectTo);
  const location = useLocation();

  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard or intended location
  if (!isAllowed) {
    // Check if there's an intended destination from previous navigation
    const intendedDestination = location.state?.from?.pathname || redirectTo;
    
    return (
      <Navigate
        to={intendedDestination}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default GuestRoute;