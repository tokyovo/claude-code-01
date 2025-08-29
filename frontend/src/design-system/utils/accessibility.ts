/**
 * Design System - Accessibility Utilities
 * WCAG 2.1 AA compliance utilities and helpers
 */

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const sRGBToLinear = (val: number) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    };

    const rLinear = sRGBToLinear(r);
    const gLinear = sRGBToLinear(g);
    const bLinear = sRGBToLinear(b);

    // Calculate relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function checkContrastCompliance(
  foregroundColor: string,
  backgroundColor: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): {
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA';
} {
  const ratio = getContrastRatio(foregroundColor, backgroundColor);
  
  let minimumRatio: number;
  
  if (level === 'AAA') {
    minimumRatio = size === 'large' ? 4.5 : 7;
  } else {
    minimumRatio = size === 'large' ? 3 : 4.5;
  }
  
  return {
    ratio,
    passes: ratio >= minimumRatio,
    level,
  };
}

/**
 * Generate accessible focus ring styles
 */
export function getFocusRingStyles(color: string = '#3b82f6'): string {
  return `focus:outline-none focus:ring-2 focus:ring-${color} focus:ring-offset-2`;
}

/**
 * Screen reader utilities
 */
export const srOnly = 'sr-only';
export const srOnlyFocusable = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-white focus:text-black';

/**
 * ARIA label generators
 */
export const ariaLabels = {
  // Button labels
  close: 'Close',
  menu: 'Menu',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  
  // Navigation labels
  mainNavigation: 'Main navigation',
  breadcrumb: 'Breadcrumb',
  pagination: 'Pagination',
  
  // Form labels
  required: 'Required field',
  optional: 'Optional field',
  invalid: 'Invalid input',
  
  // Financial specific labels
  balance: 'Account balance',
  transaction: 'Transaction',
  amount: 'Amount',
  date: 'Date',
  category: 'Category',
  
  // Status labels
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
};

/**
 * Keyboard navigation utilities
 */
export const keyboardUtils = {
  // Common key codes
  keys: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    TAB: 'Tab',
    HOME: 'Home',
    END: 'End',
  },
  
  // Check if key is activation key (Enter or Space)
  isActivationKey: (key: string): boolean => {
    return key === 'Enter' || key === ' ';
  },
  
  // Check if key is arrow key
  isArrowKey: (key: string): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
  },
};

/**
 * Focus management utilities
 */
export const focusUtils = {
  // Trap focus within an element
  trapFocus: (element: HTMLElement): (() => void) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },
  
  // Get focusable elements within a container
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  },
  
  // Save and restore focus
  saveFocus: (): (() => void) => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      activeElement?.focus();
    };
  },
};

/**
 * Reduced motion utilities
 */
export const motionUtils = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  // Get appropriate animation duration based on user preference
  getAnimationDuration: (normalDuration: number, reducedDuration: number = 0): number => {
    return motionUtils.prefersReducedMotion() ? reducedDuration : normalDuration;
  },
};

/**
 * High contrast mode utilities
 */
export const contrastUtils = {
  // Check if user prefers high contrast
  prefersHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
  
  // Get appropriate color based on contrast preference
  getContrastAwareColor: (normalColor: string, highContrastColor: string): string => {
    return contrastUtils.prefersHighContrast() ? highContrastColor : normalColor;
  },
};

/**
 * Form accessibility utilities
 */
export const formUtils = {
  // Generate unique IDs for form elements
  generateId: (prefix: string = 'field'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Associate label with input using aria-describedby
  associateWithLabel: (labelId: string): { 'aria-describedby': string } => {
    return { 'aria-describedby': labelId };
  },
  
  // Mark field as invalid
  markAsInvalid: (errorId?: string): { 'aria-invalid': boolean; 'aria-describedby'?: string } => {
    const result: { 'aria-invalid': boolean; 'aria-describedby'?: string } = {
      'aria-invalid': true,
    };
    
    if (errorId) {
      result['aria-describedby'] = errorId;
    }
    
    return result;
  },
};

/**
 * Live region utilities for dynamic content announcements
 */
export const liveRegionUtils = {
  // Create a live region element
  createLiveRegion: (politeness: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
    return liveRegion;
  },
  
  // Announce message to screen readers
  announce: (message: string, politeness: 'polite' | 'assertive' = 'polite'): void => {
    const liveRegion = liveRegionUtils.createLiveRegion(politeness);
    liveRegion.textContent = message;
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  },
};

/**
 * Color blind friendly utilities
 */
export const colorBlindUtils = {
  // Color combinations that work well for color blind users
  safeCombinations: {
    success: { color: '#16a34a', background: '#f0fdf4' },
    danger: { color: '#dc2626', background: '#fef2f2' },
    warning: { color: '#d97706', background: '#fffbeb' },
    info: { color: '#2563eb', background: '#eff6ff' },
  },
  
  // Check if colors are distinguishable for color blind users
  areColorsDistinguishable: (color1: string, color2: string): boolean => {
    // Simplified check - in production, use a proper color blind simulation library
    const ratio = getContrastRatio(color1, color2);
    return ratio > 3; // Minimum for color blind accessibility
  },
};

export default {
  getContrastRatio,
  checkContrastCompliance,
  getFocusRingStyles,
  srOnly,
  srOnlyFocusable,
  ariaLabels,
  keyboardUtils,
  focusUtils,
  motionUtils,
  contrastUtils,
  formUtils,
  liveRegionUtils,
  colorBlindUtils,
};