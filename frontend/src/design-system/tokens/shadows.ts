/**
 * Design System - Shadow Tokens
 * Consistent elevation system for depth and hierarchy
 * Optimized for financial application interfaces
 */

// Base shadow system for elevation
export const shadows = {
  // No shadow
  none: 'none',
  
  // Subtle shadows
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  
  // Default shadows
  default: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  
  // Dramatic shadows
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Semantic shadows for specific UI components
export const semanticShadows = {
  // Card shadows
  card: {
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    hover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
    elevated: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
  },
  
  // Button shadows
  button: {
    default: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    hover: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
    active: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
    focus: '0 0 0 3px rgb(59 130 246 / 0.15)', // Primary color with opacity
  },
  
  // Input shadows
  input: {
    default: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    focus: '0 0 0 3px rgb(59 130 246 / 0.15), inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    error: '0 0 0 3px rgb(239 68 68 / 0.15), inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
  },
  
  // Modal shadows
  modal: {
    backdrop: 'none', // Usually handled by backdrop overlay
    content: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  },
  
  // Dropdown shadows
  dropdown: {
    default: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    large: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  },
  
  // Tooltip shadows
  tooltip: {
    default: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
  },
  
  // Navigation shadows
  navigation: {
    header: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    sidebar: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  
  // Table shadows
  table: {
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    header: 'inset 0 -1px 0 0 rgb(0 0 0 / 0.1)',
  },
  
  // Financial specific shadows
  financial: {
    // For important financial data cards
    summary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    chart: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    transaction: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  },
} as const;

// Focus ring utilities for accessibility
export const focusRings = {
  // Primary focus ring (blue)
  primary: {
    default: '0 0 0 3px rgb(59 130 246 / 0.15)',
    thick: '0 0 0 4px rgb(59 130 246 / 0.15)',
  },
  
  // Success focus ring (green)
  success: {
    default: '0 0 0 3px rgb(34 197 94 / 0.15)',
    thick: '0 0 0 4px rgb(34 197 94 / 0.15)',
  },
  
  // Danger focus ring (red)
  danger: {
    default: '0 0 0 3px rgb(239 68 68 / 0.15)',
    thick: '0 0 0 4px rgb(239 68 68 / 0.15)',
  },
  
  // Warning focus ring (yellow)
  warning: {
    default: '0 0 0 3px rgb(245 158 11 / 0.15)',
    thick: '0 0 0 4px rgb(245 158 11 / 0.15)',
  },
  
  // White focus ring for dark backgrounds
  white: {
    default: '0 0 0 3px rgb(255 255 255 / 0.25)',
    thick: '0 0 0 4px rgb(255 255 255 / 0.25)',
  },
} as const;

// Shadow utilities for common patterns
export const shadowUtilities = {
  // CSS classes for common shadow patterns
  elevation: {
    0: 'shadow-none',
    1: 'shadow-xs',
    2: 'shadow-sm',
    3: 'shadow',
    4: 'shadow-md',
    5: 'shadow-lg',
    6: 'shadow-xl',
    7: 'shadow-2xl',
  },
  
  // Interactive state shadows
  interactive: {
    default: 'shadow-sm',
    hover: 'shadow-md transition-shadow duration-200',
    active: 'shadow-inner',
    focus: 'shadow-sm focus:ring-2 focus:ring-primary-500 focus:ring-opacity-15',
  },
  
  // Component-specific shadow classes
  component: {
    card: 'shadow-card',
    'card-hover': 'shadow-card hover:shadow-card-hover transition-shadow duration-200',
    modal: 'shadow-modal',
    dropdown: 'shadow-dropdown',
    tooltip: 'shadow-tooltip',
  },
} as const;

// All shadow tokens combined
export const shadowTokens = {
  shadows,
  semanticShadows,
  focusRings,
  shadowUtilities,
} as const;

export default shadowTokens;