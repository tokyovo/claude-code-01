/**
 * Design System - Color Tokens
 * Professional color palette optimized for financial applications
 * with accessibility compliance (WCAG 2.1 AA)
 */

// Primary brand colors - professional blues
export const primary = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // Main primary
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
} as const;

// Success colors - financial green (positive values, profit)
export const success = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e', // Main success
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
} as const;

// Danger colors - financial red (negative values, loss)
export const danger = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444', // Main danger
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
  950: '#450a0a',
} as const;

// Warning colors
export const warning = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b', // Main warning
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
} as const;

// Gray scale for UI elements
export const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
  950: '#030712',
} as const;

// Neutral colors for backgrounds and surfaces
export const neutral = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
} as const;

// Semantic colors for financial contexts
export const semantic = {
  profit: '#22c55e',
  loss: '#ef4444',
  neutral: '#6b7280',
  info: '#3b82f6',
} as const;

// Chart colors for data visualization
export const chart = {
  1: '#3b82f6',
  2: '#10b981',
  3: '#f59e0b',
  4: '#ef4444',
  5: '#8b5cf6',
  6: '#06b6d4',
  7: '#f97316',
  8: '#84cc16',
} as const;

// Background colors
export const background = {
  primary: '#ffffff',
  secondary: '#f9fafb',
  tertiary: '#f3f4f6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  dimmed: 'rgba(0, 0, 0, 0.1)',
} as const;

// Text colors with accessibility compliance
export const text = {
  primary: '#111827',    // AA compliant on white
  secondary: '#374151',  // AA compliant on light backgrounds
  tertiary: '#6b7280',   // AA compliant on white
  inverse: '#ffffff',    // For dark backgrounds
  muted: '#9ca3af',     // For less important text
  disabled: '#d1d5db',  // For disabled states
} as const;

// Border colors
export const border = {
  primary: '#e5e7eb',
  secondary: '#d1d5db',
  accent: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
} as const;

// All colors combined for easy export
export const colors = {
  primary,
  success,
  danger,
  warning,
  gray,
  neutral,
  semantic,
  chart,
  background,
  text,
  border,
} as const;

// Color utilities for accessibility
export const colorUtilities = {
  // Get appropriate text color based on background
  getTextColor: (bgColor: string): string => {
    // Simple contrast calculation - in production, use a proper contrast library
    const isDark = bgColor.startsWith('#') && 
      parseInt(bgColor.slice(1), 16) < 0x808080;
    return isDark ? text.inverse : text.primary;
  },
  
  // Get hover state for colors
  getHoverColor: (color: string): string => {
    // This would need proper color manipulation in production
    return color; // Placeholder implementation
  },
} as const;

export default colors;