import React, { Suspense } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RouteErrorBoundary from './RouteErrorBoundary';

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  enableErrorBoundary?: boolean;
}

/**
 * Default loading fallback for lazy-loaded routes
 */
const DefaultLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-gray-600">Loading page...</p>
    </div>
  </div>
);

/**
 * LazyRoute component that wraps lazy-loaded components with Suspense and error boundaries
 * 
 * Features:
 * - Suspense wrapper for lazy loading
 * - Customizable loading fallback
 * - Optional error boundary integration
 * - Optimized for code splitting
 */
const LazyRoute: React.FC<LazyRouteProps> = ({
  children,
  fallback = <DefaultLoadingFallback />,
  enableErrorBoundary = true,
}) => {
  const content = (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );

  if (enableErrorBoundary) {
    return (
      <RouteErrorBoundary>
        {content}
      </RouteErrorBoundary>
    );
  }

  return content;
};

/**
 * Higher-order component for creating lazy routes with consistent loading behavior
 */
export const createLazyRoute = <T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  options?: {
    fallback?: React.ReactNode;
    enableErrorBoundary?: boolean;
  }
) => {
  const LazyComponent: React.FC<T> = (props) => (
    <LazyRoute
      fallback={options?.fallback}
      enableErrorBoundary={options?.enableErrorBoundary}
    >
      <Component {...props} />
    </LazyRoute>
  );

  LazyComponent.displayName = `LazyRoute(${Component.displayName || Component.name})`;
  
  return LazyComponent;
};

export default LazyRoute;