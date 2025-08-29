/**
 * Design System - Button Component
 * Accessible button component with multiple variants and sizes
 * Optimized for financial applications with clear visual hierarchy
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Button variants using CVA (Class Variance Authority)
const buttonVariants = cva(
  // Base styles - applied to all buttons
  [
    'inline-flex items-center justify-center',
    'font-medium text-sm leading-4',
    'border border-transparent',
    'cursor-pointer select-none',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
    'active:transform active:scale-[0.98]',
  ],
  {
    variants: {
      // Visual variants
      variant: {
        // Primary button - main actions
        primary: [
          'bg-primary-600 hover:bg-primary-700 active:bg-primary-800',
          'text-white',
          'border-primary-600 hover:border-primary-700',
          'focus:ring-primary-500 focus:ring-opacity-50',
          'shadow-sm hover:shadow-md',
        ],
        
        // Secondary button - supporting actions
        secondary: [
          'bg-white hover:bg-gray-50 active:bg-gray-100',
          'text-gray-700 hover:text-gray-800',
          'border-gray-300 hover:border-gray-400',
          'focus:ring-primary-500 focus:ring-opacity-50',
          'shadow-sm hover:shadow-md',
        ],
        
        // Outline button - subtle actions
        outline: [
          'bg-transparent hover:bg-gray-50 active:bg-gray-100',
          'text-gray-700 hover:text-gray-800',
          'border-gray-300 hover:border-gray-400',
          'focus:ring-primary-500 focus:ring-opacity-50',
        ],
        
        // Ghost button - minimal actions
        ghost: [
          'bg-transparent hover:bg-gray-100 active:bg-gray-200',
          'text-gray-700 hover:text-gray-800',
          'border-transparent',
          'focus:ring-primary-500 focus:ring-opacity-50',
        ],
        
        // Success button - positive actions
        success: [
          'bg-success-600 hover:bg-success-700 active:bg-success-800',
          'text-white',
          'border-success-600 hover:border-success-700',
          'focus:ring-success-500 focus:ring-opacity-50',
          'shadow-sm hover:shadow-md',
        ],
        
        // Danger button - destructive actions
        danger: [
          'bg-danger-600 hover:bg-danger-700 active:bg-danger-800',
          'text-white',
          'border-danger-600 hover:border-danger-700',
          'focus:ring-danger-500 focus:ring-opacity-50',
          'shadow-sm hover:shadow-md',
        ],
        
        // Warning button - cautionary actions
        warning: [
          'bg-warning-500 hover:bg-warning-600 active:bg-warning-700',
          'text-white',
          'border-warning-500 hover:border-warning-600',
          'focus:ring-warning-400 focus:ring-opacity-50',
          'shadow-sm hover:shadow-md',
        ],
      },
      
      // Size variants
      size: {
        xs: 'px-2.5 py-1.5 text-xs rounded',
        sm: 'px-3 py-2 text-sm rounded-md',
        md: 'px-4 py-2.5 text-sm rounded-md',
        lg: 'px-6 py-3 text-base rounded-lg',
        xl: 'px-8 py-4 text-lg rounded-lg',
      },
      
      // Width variants
      width: {
        auto: 'w-auto',
        full: 'w-full',
        fit: 'w-fit',
      },
    },
    
    // Default variants
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'auto',
    },
  }
);

// Button props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // Custom props
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

// Loading spinner component
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v8H4z"
    />
  </svg>
);

// Button component
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, width }),
          className
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {loading ? (
          <Spinner className="mr-2" />
        ) : (
          leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button text */}
        <span className={loading ? 'opacity-70' : undefined}>
          {children}
        </span>
        
        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };