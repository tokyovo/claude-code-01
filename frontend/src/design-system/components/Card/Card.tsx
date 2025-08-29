/**
 * Design System - Card Component
 * Flexible card component for displaying content with consistent styling
 * Optimized for financial data presentation with proper visual hierarchy
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Card variants using CVA
const cardVariants = cva(
  // Base styles
  [
    'bg-white',
    'border border-gray-200',
    'transition-all duration-200 ease-in-out',
  ],
  {
    variants: {
      // Visual variants
      variant: {
        // Default card
        default: 'shadow-sm',
        
        // Elevated card with more prominent shadow
        elevated: 'shadow-md hover:shadow-lg',
        
        // Interactive card for clickable items
        interactive: [
          'shadow-sm hover:shadow-md',
          'cursor-pointer',
          'hover:border-gray-300',
          'active:scale-[0.99]',
        ],
        
        // Outlined card with border emphasis
        outlined: [
          'border-2',
          'shadow-none',
          'hover:border-primary-200',
        ],
        
        // Flat card without shadow
        flat: 'shadow-none border-gray-200',
        
        // Success card for positive financial data
        success: [
          'border-success-200',
          'bg-success-50',
          'shadow-sm',
        ],
        
        // Warning card for alerts
        warning: [
          'border-warning-200',
          'bg-warning-50',
          'shadow-sm',
        ],
        
        // Danger card for negative data or errors
        danger: [
          'border-danger-200',
          'bg-danger-50',
          'shadow-sm',
        ],
      },
      
      // Size variants
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      
      // Border radius variants
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
      },
    },
    
    // Default variants
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'lg',
    },
  }
);

// Card props interface
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  // Custom props
  asChild?: boolean;
}

// Main Card component
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, rounded, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, rounded }), className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header component
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'border-b border-gray-200 pb-4 mb-4',
        'last:border-b-0 last:pb-0 last:mb-0',
        className
      )}
      {...props}
    />
  );
});

CardHeader.displayName = 'CardHeader';

// Card Title component
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-6 text-gray-900',
        'tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

// Card Description component
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        'mt-1 text-sm text-gray-600 leading-5',
        className
      )}
      {...props}
    />
  );
});

CardDescription.displayName = 'CardDescription';

// Card Content component
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-4', className)}
      {...props}
    />
  );
});

CardContent.displayName = 'CardContent';

// Card Footer component
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'border-t border-gray-200 pt-4 mt-4',
        'flex items-center justify-between',
        'first:border-t-0 first:pt-0 first:mt-0',
        className
      )}
      {...props}
    />
  );
});

CardFooter.displayName = 'CardFooter';

// Financial Card specific components
const FinancialCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn('font-mono', className)}
        {...props}
      />
    );
  }
);

FinancialCard.displayName = 'FinancialCard';

// Metric Card for displaying financial metrics
interface MetricCardProps extends CardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, icon, className, ...props }, ref) => {
    const getChangeColor = (type: 'positive' | 'negative' | 'neutral') => {
      switch (type) {
        case 'positive':
          return 'text-success-600';
        case 'negative':
          return 'text-danger-600';
        case 'neutral':
        default:
          return 'text-gray-600';
      }
    };

    return (
      <Card
        ref={ref}
        variant="elevated"
        className={cn('', className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {value}
            </p>
            {change && (
              <p className={cn('text-sm mt-1', getChangeColor(change.type))}>
                {change.value}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 text-gray-400">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FinancialCard,
  MetricCard,
  cardVariants,
};

