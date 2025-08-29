/**
 * Design System - Typography Tokens
 * Professional typography system for financial applications
 * Based on Inter font family for optimal readability
 */

// Font families
export const fontFamily = {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
} as const;

// Font weights
export const fontWeight = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Font sizes with line heights optimized for financial data
export const fontSize = {
  xs: {
    size: '0.75rem',    // 12px
    lineHeight: '1rem', // 16px
    letterSpacing: '0.05em',
  },
  sm: {
    size: '0.875rem',     // 14px
    lineHeight: '1.25rem', // 20px
    letterSpacing: '0.025em',
  },
  base: {
    size: '1rem',       // 16px
    lineHeight: '1.5rem', // 24px
    letterSpacing: '0',
  },
  lg: {
    size: '1.125rem',   // 18px
    lineHeight: '1.75rem', // 28px
    letterSpacing: '-0.025em',
  },
  xl: {
    size: '1.25rem',    // 20px
    lineHeight: '1.75rem', // 28px
    letterSpacing: '-0.025em',
  },
  '2xl': {
    size: '1.5rem',     // 24px
    lineHeight: '2rem',  // 32px
    letterSpacing: '-0.025em',
  },
  '3xl': {
    size: '1.875rem',   // 30px
    lineHeight: '2.25rem', // 36px
    letterSpacing: '-0.025em',
  },
  '4xl': {
    size: '2.25rem',    // 36px
    lineHeight: '2.5rem', // 40px
    letterSpacing: '-0.025em',
  },
  '5xl': {
    size: '3rem',       // 48px
    lineHeight: '1',     // 48px
    letterSpacing: '-0.025em',
  },
  '6xl': {
    size: '3.75rem',    // 60px
    lineHeight: '1',     // 60px
    letterSpacing: '-0.025em',
  },
  
  // Financial data specific sizes
  'financial-xs': {
    size: '0.6875rem',    // 11px
    lineHeight: '1rem',   // 16px
    letterSpacing: '0.05em',
  },
  'financial-sm': {
    size: '0.8125rem',    // 13px
    lineHeight: '1.125rem', // 18px
    letterSpacing: '0.025em',
  },
  'financial-base': {
    size: '0.9375rem',    // 15px
    lineHeight: '1.375rem', // 22px
    letterSpacing: '0',
  },
  'financial-lg': {
    size: '1.0625rem',    // 17px
    lineHeight: '1.5rem',  // 24px
    letterSpacing: '0',
  },
} as const;

// Typography scales for different contexts
export const typographyScale = {
  // Display text (headings, titles)
  display: {
    '5xl': {
      fontSize: fontSize['5xl'].size,
      lineHeight: fontSize['5xl'].lineHeight,
      fontWeight: fontWeight.bold,
      letterSpacing: fontSize['5xl'].letterSpacing,
    },
    '4xl': {
      fontSize: fontSize['4xl'].size,
      lineHeight: fontSize['4xl'].lineHeight,
      fontWeight: fontWeight.bold,
      letterSpacing: fontSize['4xl'].letterSpacing,
    },
    '3xl': {
      fontSize: fontSize['3xl'].size,
      lineHeight: fontSize['3xl'].lineHeight,
      fontWeight: fontWeight.semibold,
      letterSpacing: fontSize['3xl'].letterSpacing,
    },
    '2xl': {
      fontSize: fontSize['2xl'].size,
      lineHeight: fontSize['2xl'].lineHeight,
      fontWeight: fontWeight.semibold,
      letterSpacing: fontSize['2xl'].letterSpacing,
    },
    xl: {
      fontSize: fontSize.xl.size,
      lineHeight: fontSize.xl.lineHeight,
      fontWeight: fontWeight.semibold,
      letterSpacing: fontSize.xl.letterSpacing,
    },
    lg: {
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: fontWeight.medium,
      letterSpacing: fontSize.lg.letterSpacing,
    },
  },
  
  // Body text
  body: {
    lg: {
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: fontWeight.normal,
      letterSpacing: fontSize.lg.letterSpacing,
    },
    base: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: fontWeight.normal,
      letterSpacing: fontSize.base.letterSpacing,
    },
    sm: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: fontWeight.normal,
      letterSpacing: fontSize.sm.letterSpacing,
    },
  },
  
  // Labels and captions
  label: {
    lg: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: fontWeight.medium,
      letterSpacing: fontSize.base.letterSpacing,
    },
    base: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: fontWeight.medium,
      letterSpacing: fontSize.sm.letterSpacing,
    },
    sm: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: fontWeight.medium,
      letterSpacing: fontSize.xs.letterSpacing,
    },
  },
  
  // Financial data (numbers, currency, percentages)
  financial: {
    lg: {
      fontSize: fontSize['financial-lg'].size,
      lineHeight: fontSize['financial-lg'].lineHeight,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.mono,
      letterSpacing: '0.025em',
    },
    base: {
      fontSize: fontSize['financial-base'].size,
      lineHeight: fontSize['financial-base'].lineHeight,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.mono,
      letterSpacing: '0.025em',
    },
    sm: {
      fontSize: fontSize['financial-sm'].size,
      lineHeight: fontSize['financial-sm'].lineHeight,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.mono,
      letterSpacing: '0.025em',
    },
    xs: {
      fontSize: fontSize['financial-xs'].size,
      lineHeight: fontSize['financial-xs'].lineHeight,
      fontWeight: fontWeight.normal,
      fontFamily: fontFamily.mono,
      letterSpacing: '0.025em',
    },
  },
} as const;

// Typography utilities
export const typographyUtilities = {
  // CSS classes for common text styles
  heading: {
    h1: 'text-4xl font-bold tracking-tight text-gray-900',
    h2: 'text-3xl font-semibold tracking-tight text-gray-900',
    h3: 'text-2xl font-semibold tracking-tight text-gray-900',
    h4: 'text-xl font-semibold tracking-tight text-gray-900',
    h5: 'text-lg font-medium tracking-tight text-gray-900',
    h6: 'text-base font-medium tracking-tight text-gray-900',
  },
  
  body: {
    large: 'text-lg text-gray-700 leading-relaxed',
    default: 'text-base text-gray-700 leading-relaxed',
    small: 'text-sm text-gray-600 leading-relaxed',
  },
  
  label: {
    large: 'text-base font-medium text-gray-700',
    default: 'text-sm font-medium text-gray-700',
    small: 'text-xs font-medium text-gray-600',
  },
  
  financial: {
    large: 'font-mono text-financial-lg font-semibold tracking-wide',
    default: 'font-mono text-financial-base font-medium tracking-wide',
    small: 'font-mono text-financial-sm font-medium tracking-wide',
    tiny: 'font-mono text-financial-xs tracking-wide',
  },
  
  caption: 'text-xs text-gray-500',
  overline: 'text-xs font-medium uppercase tracking-wide text-gray-500',
} as const;

// Line heights
export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// Letter spacing
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// All typography tokens combined
export const typography = {
  fontFamily,
  fontWeight,
  fontSize,
  typographyScale,
  typographyUtilities,
  lineHeight,
  letterSpacing,
} as const;

export default typography;