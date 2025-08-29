/**
 * Design System - Breakpoint Tokens
 * Responsive design breakpoints for financial application
 * Mobile-first approach with progressive enhancement
 */

// Breakpoint values in pixels
export const breakpointValues = {
  xs: 475,    // Small phones
  sm: 640,    // Large phones
  md: 768,    // Tablets
  lg: 1024,   // Small laptops
  xl: 1280,   // Laptops and desktops
  '2xl': 1536, // Large desktops
  '3xl': 1920, // Ultra-wide displays
} as const;

// Breakpoints as CSS media query strings
export const breakpoints = {
  xs: `${breakpointValues.xs}px`,
  sm: `${breakpointValues.sm}px`,
  md: `${breakpointValues.md}px`,
  lg: `${breakpointValues.lg}px`,
  xl: `${breakpointValues.xl}px`,
  '2xl': `${breakpointValues['2xl']}px`,
  '3xl': `${breakpointValues['3xl']}px`,
} as const;

// Media query helpers
export const mediaQueries = {
  // Min-width queries (mobile-first)
  up: {
    xs: `@media (min-width: ${breakpoints.xs})`,
    sm: `@media (min-width: ${breakpoints.sm})`,
    md: `@media (min-width: ${breakpoints.md})`,
    lg: `@media (min-width: ${breakpoints.lg})`,
    xl: `@media (min-width: ${breakpoints.xl})`,
    '2xl': `@media (min-width: ${breakpoints['2xl']})`,
    '3xl': `@media (min-width: ${breakpoints['3xl']})`,
  },
  
  // Max-width queries
  down: {
    xs: `@media (max-width: ${breakpointValues.xs - 1}px)`,
    sm: `@media (max-width: ${breakpointValues.sm - 1}px)`,
    md: `@media (max-width: ${breakpointValues.md - 1}px)`,
    lg: `@media (max-width: ${breakpointValues.lg - 1}px)`,
    xl: `@media (max-width: ${breakpointValues.xl - 1}px)`,
    '2xl': `@media (max-width: ${breakpointValues['2xl'] - 1}px)`,
    '3xl': `@media (max-width: ${breakpointValues['3xl'] - 1}px)`,
  },
  
  // Between queries
  between: {
    'xs-sm': `@media (min-width: ${breakpoints.xs}) and (max-width: ${breakpointValues.sm - 1}px)`,
    'sm-md': `@media (min-width: ${breakpoints.sm}) and (max-width: ${breakpointValues.md - 1}px)`,
    'md-lg': `@media (min-width: ${breakpoints.md}) and (max-width: ${breakpointValues.lg - 1}px)`,
    'lg-xl': `@media (min-width: ${breakpoints.lg}) and (max-width: ${breakpointValues.xl - 1}px)`,
    'xl-2xl': `@media (min-width: ${breakpoints.xl}) and (max-width: ${breakpointValues['2xl'] - 1}px)`,
  },
} as const;

// Only queries (exact breakpoint) - defined after mediaQueries
export const mediaQueriesOnly = {
  mobile: mediaQueries.down.sm,
  tablet: `@media (min-width: ${breakpoints.sm}) and (max-width: ${breakpointValues.lg - 1}px)`,
  desktop: mediaQueries.up.lg,
} as const;

// Container max widths for each breakpoint
export const containerSizes = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// Grid system configuration
export const gridSystem = {
  // Number of columns at each breakpoint
  columns: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 12,
    '2xl': 12,
    '3xl': 12,
  },
  
  // Gutter sizes at each breakpoint
  gutters: {
    xs: '16px',   // 1rem
    sm: '20px',   // 1.25rem
    md: '24px',   // 1.5rem
    lg: '32px',   // 2rem
    xl: '40px',   // 2.5rem
    '2xl': '48px', // 3rem
    '3xl': '56px', // 3.5rem
  },
  
  // Margins at each breakpoint
  margins: {
    xs: '16px',   // 1rem
    sm: '24px',   // 1.5rem
    md: '32px',   // 2rem
    lg: '48px',   // 3rem
    xl: '64px',   // 4rem
    '2xl': '80px', // 5rem
    '3xl': '96px', // 6rem
  },
} as const;

// Responsive typography scaling
export const responsiveTypography = {
  // Scale factors for different screen sizes
  scaleFactors: {
    xs: 0.875,  // 87.5% of base size
    sm: 0.9375, // 93.75% of base size
    md: 1,      // Base size
    lg: 1.0625, // 106.25% of base size
    xl: 1.125,  // 112.5% of base size
    '2xl': 1.1875, // 118.75% of base size
    '3xl': 1.25,   // 125% of base size
  },
  
  // Heading sizes at different breakpoints
  headingSizes: {
    h1: {
      xs: '1.75rem',  // 28px
      sm: '2rem',     // 32px
      md: '2.25rem',  // 36px
      lg: '2.5rem',   // 40px
      xl: '3rem',     // 48px
      '2xl': '3.5rem', // 56px
    },
    h2: {
      xs: '1.5rem',   // 24px
      sm: '1.75rem',  // 28px
      md: '2rem',     // 32px
      lg: '2.25rem',  // 36px
      xl: '2.5rem',   // 40px
      '2xl': '3rem',  // 48px
    },
    h3: {
      xs: '1.25rem',  // 20px
      sm: '1.375rem', // 22px
      md: '1.5rem',   // 24px
      lg: '1.75rem',  // 28px
      xl: '2rem',     // 32px
      '2xl': '2.25rem', // 36px
    },
  },
} as const;

// Device-specific patterns
export const devicePatterns = {
  // Navigation patterns
  navigation: {
    mobile: {
      type: 'bottom-tabs',
      breakpoint: mediaQueries.down.md,
    },
    tablet: {
      type: 'side-drawer',
      breakpoint: mediaQueries.between['sm-md'],
    },
    desktop: {
      type: 'sidebar',
      breakpoint: mediaQueries.up.lg,
    },
  },
  
  // Layout patterns
  layout: {
    mobile: {
      columns: 1,
      sidebar: false,
      breakpoint: mediaQueries.down.md,
    },
    tablet: {
      columns: 2,
      sidebar: true,
      breakpoint: mediaQueries.between['md-lg'],
    },
    desktop: {
      columns: 3,
      sidebar: true,
      breakpoint: mediaQueries.up.lg,
    },
  },
  
  // Financial data display patterns
  financialData: {
    mobile: {
      chartHeight: '240px',
      tableColumns: 3,
      cardLayout: 'stacked',
      breakpoint: mediaQueries.down.md,
    },
    tablet: {
      chartHeight: '320px',
      tableColumns: 5,
      cardLayout: 'grid-2',
      breakpoint: mediaQueries.between['md-lg'],
    },
    desktop: {
      chartHeight: '400px',
      tableColumns: 'all',
      cardLayout: 'grid-3',
      breakpoint: mediaQueries.up.lg,
    },
  },
} as const;

// Utility functions for responsive design
export const breakpointUtilities = {
  // Check if current breakpoint matches
  isBreakpoint: (breakpoint: keyof typeof breakpoints): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${breakpoints[breakpoint]})`).matches;
  },
  
  // Get current breakpoint
  getCurrentBreakpoint: (): keyof typeof breakpoints => {
    if (typeof window === 'undefined') return 'lg';
    
    const width = window.innerWidth;
    if (width >= breakpointValues['3xl']) return '3xl';
    if (width >= breakpointValues['2xl']) return '2xl';
    if (width >= breakpointValues.xl) return 'xl';
    if (width >= breakpointValues.lg) return 'lg';
    if (width >= breakpointValues.md) return 'md';
    if (width >= breakpointValues.sm) return 'sm';
    return 'xs';
  },
  
  // CSS classes for responsive utilities
  responsiveClasses: {
    hide: {
      mobile: 'hidden md:block',
      tablet: 'hidden lg:block md:hidden',
      desktop: 'lg:hidden',
    },
    show: {
      mobile: 'block md:hidden',
      tablet: 'hidden md:block lg:hidden',
      desktop: 'hidden lg:block',
    },
  },
} as const;

// All breakpoint tokens combined
export const breakpointTokens = {
  breakpointValues,
  breakpoints,
  mediaQueries,
  containerSizes,
  gridSystem,
  responsiveTypography,
  devicePatterns,
  breakpointUtilities,
} as const;

export default breakpointTokens;