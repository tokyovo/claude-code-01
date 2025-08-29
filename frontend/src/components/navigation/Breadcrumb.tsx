import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES, ROUTE_META, createRouteWithId } from '@/constants';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
}

/**
 * Dynamic Breadcrumb component that generates navigation based on current route
 * 
 * Features:
 * - Automatic breadcrumb generation from route metadata
 * - Support for dynamic routes with parameters
 * - Customizable separator and styling
 * - Truncation for long breadcrumb chains
 * - Accessible navigation
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className = '',
  separator,
  maxItems = 5,
}) => {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home/dashboard as root
    breadcrumbs.push({
      label: 'Dashboard',
      href: ROUTES.DASHBOARD,
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    
    for (let i = 0; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;
      
      // Check if this is a known route
      const routeKey = Object.keys(ROUTES).find(key => {
        const route = ROUTES[key as keyof typeof ROUTES];
        // Handle dynamic routes by replacing :id with actual values
        if (route.includes(':id')) {
          const routePattern = route.replace(':id', '[^/]+');
          const regex = new RegExp(`^${routePattern}$`);
          return regex.test(currentPath);
        }
        return route === currentPath;
      });

      if (routeKey) {
        const route = ROUTES[routeKey as keyof typeof ROUTES];
        const meta = ROUTE_META[route as keyof typeof ROUTE_META];
        
        if (meta) {
          // Skip dashboard if it's already added as root
          if (route === ROUTES.DASHBOARD) continue;
          
          breadcrumbs.push({
            label: meta.breadcrumb || meta.title,
            href: i === pathSegments.length - 1 ? undefined : currentPath,
            current: i === pathSegments.length - 1,
          });
        }
      } else {
        // Handle unknown routes or dynamic content
        const segment = pathSegments[i];
        
        // Try to infer meaning from context
        let label = segment;
        if (segment.match(/^\d+$/)) {
          // Numeric ID - try to get a meaningful label
          const parentPath = pathSegments.slice(0, i).join('/');
          if (parentPath.includes('transactions')) {
            label = `Transaction #${segment}`;
          } else if (parentPath.includes('budgets')) {
            label = `Budget #${segment}`;
          } else if (parentPath.includes('categories')) {
            label = `Category #${segment}`;
          }
        } else {
          // Convert kebab-case to Title Case
          label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        breadcrumbs.push({
          label,
          href: i === pathSegments.length - 1 ? undefined : currentPath,
          current: i === pathSegments.length - 1,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Truncate breadcrumbs if too many
  const displayBreadcrumbs = breadcrumbs.length > maxItems
    ? [
        breadcrumbs[0],
        { label: '...', current: false },
        ...breadcrumbs.slice(-(maxItems - 2))
      ]
    : breadcrumbs;

  // Don't show breadcrumbs on dashboard or if only one item
  if (location.pathname === ROUTES.DASHBOARD || breadcrumbs.length <= 1) {
    return null;
  }

  const defaultSeparator = (
    <svg
      className="h-5 w-5 flex-shrink-0 text-gray-300"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="m5.555 17.776 4-16 .894.448-4 16-.894-.448z" />
    </svg>
  );

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        {displayBreadcrumbs.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <div className="flex items-center">
              {index > 0 && (
                <div className="mr-4">
                  {separator || defaultSeparator}
                </div>
              )}
              {item.href ? (
                <Link
                  to={item.href}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : item.label === '...' ? (
                <span className="text-sm font-medium text-gray-400">
                  {item.label}
                </span>
              ) : (
                <span
                  className="text-sm font-medium text-gray-900"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;