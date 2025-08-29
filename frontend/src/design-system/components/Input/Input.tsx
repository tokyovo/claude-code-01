/**
 * Design System - Input Component
 * Accessible input component with multiple variants and validation states
 * Optimized for financial applications with proper formatting support
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Input variants using CVA
const inputVariants = cva(
  // Base styles
  [
    'flex w-full rounded-md border bg-white px-3 py-2',
    'text-sm text-gray-900 placeholder:text-gray-500',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ],
  {
    variants: {
      // Visual variants based on state
      variant: {
        // Default state
        default: [
          'border-gray-300',
          'focus:border-primary-500 focus:ring-primary-500 focus:ring-opacity-20',
          'hover:border-gray-400',
        ],
        
        // Success state
        success: [
          'border-success-300',
          'focus:border-success-500 focus:ring-success-500 focus:ring-opacity-20',
          'hover:border-success-400',
        ],
        
        // Error state
        error: [
          'border-danger-300',
          'focus:border-danger-500 focus:ring-danger-500 focus:ring-opacity-20',
          'hover:border-danger-400',
        ],
        
        // Warning state
        warning: [
          'border-warning-300',
          'focus:border-warning-500 focus:ring-warning-500 focus:ring-opacity-20',
          'hover:border-warning-400',
        ],
      },
      
      // Size variants
      size: {
        sm: 'h-8 px-2.5 py-1.5 text-xs',
        md: 'h-10 px-3 py-2 text-sm',
        lg: 'h-12 px-4 py-3 text-base',
      },
      
      // Border radius variants
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
      },
    },
    
    // Default variants
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'md',
    },
  }
);

// Input props interface
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  // Custom props
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

// Main Input component
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      variant,
      size,
      rounded,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || React.useId();
    
    // Determine variant based on error state
    const inputVariant = error ? 'error' : variant;
    
    // Input wrapper classes
    const wrapperClasses = cn(
      'relative flex items-center',
      leftAddon && 'rounded-l-none',
      rightAddon && 'rounded-r-none'
    );
    
    // Icon classes
    const iconClasses = 'absolute inset-y-0 flex items-center pointer-events-none text-gray-400';
    const leftIconClasses = cn(iconClasses, 'left-3');
    const rightIconClasses = cn(iconClasses, 'right-3');
    
    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        {/* Input group with addons */}
        <div className="flex">
          {/* Left addon */}
          {leftAddon && (
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              {leftAddon}
            </span>
          )}
          
          {/* Input wrapper */}
          <div className={wrapperClasses}>
            {/* Left icon */}
            {leftIcon && (
              <div className={leftIconClasses}>
                {leftIcon}
              </div>
            )}
            
            {/* Input element */}
            <input
              type={type}
              className={cn(
                inputVariants({ variant: inputVariant, size, rounded }),
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                leftAddon && 'rounded-l-none',
                rightAddon && 'rounded-r-none',
                className
              )}
              ref={ref}
              id={inputId}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : helperText
                  ? `${inputId}-helper`
                  : undefined
              }
              {...props}
            />
            
            {/* Right icon */}
            {rightIcon && (
              <div className={rightIconClasses}>
                {rightIcon}
              </div>
            )}
          </div>
          
          {/* Right addon */}
          {rightAddon && (
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              {rightAddon}
            </span>
          )}
        </div>
        
        {/* Helper text or error message */}
        {(helperText || error) && (
          <div
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={cn(
              'text-xs',
              error ? 'text-danger-600' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Currency Input component for financial values
interface CurrencyInputProps extends Omit<InputProps, 'type' | 'leftAddon'> {
  currency?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency = '$', className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        leftAddon={currency}
        className={cn('font-mono text-right', className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

// Percentage Input component
interface PercentageInputProps extends Omit<InputProps, 'type' | 'rightAddon'> {}

const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        rightAddon="%"
        className={cn('font-mono text-right', className)}
        {...props}
      />
    );
  }
);

PercentageInput.displayName = 'PercentageInput';

// Search Input component
interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, ...props }, ref) => {
    const SearchIcon = () => (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    );
    
    const ClearIcon = () => (
      <button
        type="button"
        onClick={onClear}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    );

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<SearchIcon />}
        rightIcon={value && onClear ? <ClearIcon /> : undefined}
        value={value}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export {
  Input,
  CurrencyInput,
  PercentageInput,
  SearchInput,
  inputVariants,
};

