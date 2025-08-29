/**
 * Design System - Badge Component
 * Small status and labeling component for categorizing and highlighting information
 * Optimized for financial applications with semantic color coding
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Badge variants using CVA
const badgeVariants = cva(
  // Base styles
  [
    'inline-flex items-center',
    'font-medium',
    'border',
    'transition-colors duration-200',
  ],
  {
    variants: {
      // Visual variants
      variant: {
        // Default badge
        default: [
          'bg-gray-100 text-gray-800',
          'border-gray-200',
        ],
        
        // Primary badge
        primary: [
          'bg-primary-100 text-primary-800',
          'border-primary-200',
        ],
        
        // Success badge (for positive financial indicators)
        success: [
          'bg-success-100 text-success-800',
          'border-success-200',
        ],
        
        // Danger badge (for negative financial indicators)
        danger: [
          'bg-danger-100 text-danger-800',
          'border-danger-200',
        ],
        
        // Warning badge (for alerts and cautions)
        warning: [
          'bg-warning-100 text-warning-800',
          'border-warning-200',
        ],
        
        // Info badge
        info: [
          'bg-blue-100 text-blue-800',
          'border-blue-200',
        ],
        
        // Outline variants
        'outline-default': [
          'bg-transparent text-gray-700',
          'border-gray-300',
          'hover:bg-gray-50',
        ],
        
        'outline-primary': [
          'bg-transparent text-primary-700',
          'border-primary-300',
          'hover:bg-primary-50',
        ],
        
        'outline-success': [
          'bg-transparent text-success-700',
          'border-success-300',
          'hover:bg-success-50',
        ],
        
        'outline-danger': [
          'bg-transparent text-danger-700',
          'border-danger-300',
          'hover:bg-danger-50',
        ],
        
        'outline-warning': [
          'bg-transparent text-warning-700',
          'border-warning-300',
          'hover:bg-warning-50',
        ],
      },
      
      // Size variants
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-full',
        md: 'px-2.5 py-1 text-xs rounded-full',
        lg: 'px-3 py-1.5 text-sm rounded-full',
      },
      
      // Shape variants
      shape: {
        rounded: 'rounded-full',
        square: 'rounded-md',
      },
    },
    
    // Default variants
    defaultVariants: {
      variant: 'default',
      size: 'md',
      shape: 'rounded',
    },
  }
);

// Badge props interface
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  // Custom props
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

// Main Badge component
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      icon,
      removable = false,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, shape }), className)}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <span className="mr-1 flex-shrink-0">
            {icon}
          </span>
        )}
        
        {/* Content */}
        <span>{children}</span>
        
        {/* Remove button */}
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:bg-black focus:bg-opacity-10 transition-colors"
          >
            <span className="sr-only">Remove badge</span>
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Financial Status Badge for transaction types, account statuses, etc.
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'cancelled';
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const getVariant = (status: StatusBadgeProps['status']) => {
      switch (status) {
        case 'active':
        case 'completed':
          return 'success';
        case 'pending':
          return 'warning';
        case 'failed':
        case 'cancelled':
          return 'danger';
        case 'inactive':
        default:
          return 'default';
      }
    };

    return (
      <Badge
        ref={ref}
        variant={getVariant(status)}
        {...props}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Transaction Type Badge
interface TransactionTypeBadgeProps extends Omit<BadgeProps, 'variant'> {
  type: 'income' | 'expense' | 'transfer' | 'investment';
}

const TransactionTypeBadge = React.forwardRef<HTMLSpanElement, TransactionTypeBadgeProps>(
  ({ type, ...props }, ref) => {
    const getVariant = (type: TransactionTypeBadgeProps['type']) => {
      switch (type) {
        case 'income':
          return 'success';
        case 'expense':
          return 'danger';
        case 'transfer':
          return 'primary';
        case 'investment':
          return 'info';
        default:
          return 'default';
      }
    };

    const getIcon = (type: TransactionTypeBadgeProps['type']) => {
      switch (type) {
        case 'income':
          return (
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
          );
        case 'expense':
          return (
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
          );
        case 'transfer':
          return (
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          );
        default:
          return null;
      }
    };

    return (
      <Badge
        ref={ref}
        variant={getVariant(type)}
        icon={getIcon(type)}
        {...props}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  }
);

TransactionTypeBadge.displayName = 'TransactionTypeBadge';

export {
  Badge,
  StatusBadge,
  TransactionTypeBadge,
  badgeVariants,
};

