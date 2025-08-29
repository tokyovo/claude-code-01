import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/design-system';
import { ROUTES } from '@/constants';

interface RouteErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Error fallback component for route-level errors
 */
const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetErrorBoundary();
    navigate(ROUTES.DASHBOARD);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              We encountered an error while loading this page. Please try again.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-700 font-medium">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {error.message}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetErrorBoundary}
              className="w-full"
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleGoHome}
              className="w-full"
            >
              Go Home
            </Button>
          </div>
          
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReload}
              className="w-full text-sm"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<RouteErrorFallbackProps>;
}

/**
 * Route-level error boundary wrapper
 * 
 * Features:
 * - Catches JavaScript errors in route components
 * - Provides user-friendly error UI
 * - Development-mode error details
 * - Recovery options (retry, go home, reload)
 */
const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = RouteErrorFallback,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Route Error:', error, errorInfo);
      // TODO: Send to error monitoring service (e.g., Sentry)
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleError}
      onReset={() => {
        // Clear any error state if needed
        window.scrollTo(0, 0);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;