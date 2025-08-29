/**
 * Design System - Spacing Tokens
 * 8px base unit spacing system for consistent layouts
 * Optimized for financial application interfaces
 */

// Base spacing scale (8px base unit)
export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px  - Base unit
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px - 2x base unit
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px - 3x base unit
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px - 4x base unit
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px - 5x base unit
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px - 6x base unit
  14: '3.5rem',     // 56px - 7x base unit
  16: '4rem',       // 64px - 8x base unit
  18: '4.5rem',     // 72px - 9x base unit
  20: '5rem',       // 80px - 10x base unit
  24: '6rem',       // 96px - 12x base unit
  28: '7rem',       // 112px - 14x base unit
  32: '8rem',       // 128px - 16x base unit
  36: '9rem',       // 144px - 18x base unit
  40: '10rem',      // 160px - 20x base unit
  44: '11rem',      // 176px - 22x base unit
  48: '12rem',      // 192px - 24x base unit
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// Semantic spacing for common UI patterns
export const semanticSpacing = {
  // Component internal spacing
  componentPadding: {
    xs: spacing[1],     // 4px
    sm: spacing[2],     // 8px
    md: spacing[4],     // 16px
    lg: spacing[6],     // 24px
    xl: spacing[8],     // 32px
  },
  
  // Margins between components
  componentMargin: {
    xs: spacing[2],     // 8px
    sm: spacing[4],     // 16px
    md: spacing[6],     // 24px
    lg: spacing[8],     // 32px
    xl: spacing[12],    // 48px
  },
  
  // Section spacing
  sectionSpacing: {
    xs: spacing[8],     // 32px
    sm: spacing[12],    // 48px
    md: spacing[16],    // 64px
    lg: spacing[24],    // 96px
    xl: spacing[32],    // 128px
  },
  
  // Container padding
  containerPadding: {
    mobile: spacing[4],  // 16px
    tablet: spacing[6],  // 24px
    desktop: spacing[8], // 32px
    wide: spacing[12],   // 48px
  },
  
  // Form spacing
  formSpacing: {
    fieldGap: spacing[4],      // 16px between form fields
    labelMargin: spacing[1],   // 4px between label and input
    buttonMargin: spacing[6],  // 24px above form buttons
    groupMargin: spacing[8],   // 32px between form groups
  },
  
  // Card spacing
  cardSpacing: {
    padding: spacing[6],       // 24px card internal padding
    headerPadding: spacing[4], // 16px card header padding
    footerPadding: spacing[4], // 16px card footer padding
    gap: spacing[4],           // 16px between cards
  },
  
  // Table spacing
  tableSpacing: {
    cellPadding: spacing[3],   // 12px table cell padding
    rowGap: spacing[1],        // 4px between table rows
    headerPadding: spacing[4], // 16px table header padding
  },
  
  // Button spacing
  buttonSpacing: {
    paddingX: {
      sm: spacing[3],     // 12px
      md: spacing[4],     // 16px
      lg: spacing[6],     // 24px
    },
    paddingY: {
      sm: spacing[1.5],   // 6px
      md: spacing[2.5],   // 10px
      lg: spacing[3],     // 12px
    },
    gap: spacing[2],      // 8px between button elements
  },
  
  // Navigation spacing
  navigationSpacing: {
    itemPadding: spacing[3],   // 12px nav item padding
    groupMargin: spacing[6],   // 24px between nav groups
    subItemIndent: spacing[4], // 16px sub-item indentation
  },
} as const;

// Layout grid system
export const grid = {
  // Column gaps
  columnGap: {
    xs: spacing[2],     // 8px
    sm: spacing[4],     // 16px
    md: spacing[6],     // 24px
    lg: spacing[8],     // 32px
    xl: spacing[12],    // 48px
  },
  
  // Row gaps
  rowGap: {
    xs: spacing[2],     // 8px
    sm: spacing[4],     // 16px
    md: spacing[6],     // 24px
    lg: spacing[8],     // 32px
    xl: spacing[12],    // 48px
  },
  
  // Container max widths
  containerMaxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Border radius system
export const borderRadius = {
  none: '0',
  xs: '0.125rem',     // 2px
  sm: '0.25rem',      // 4px
  default: '0.375rem', // 6px
  md: '0.5rem',       // 8px
  lg: '0.75rem',      // 12px
  xl: '1rem',         // 16px
  '2xl': '1.5rem',    // 24px
  '3xl': '2rem',      // 32px
  full: '9999px',
} as const;

// Border width system
export const borderWidth = {
  0: '0px',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

// Z-index system
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  
  // Semantic z-index values
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  notification: '1080',
} as const;

// All spacing tokens combined
export const spacingTokens = {
  spacing,
  semanticSpacing,
  grid,
  borderRadius,
  borderWidth,
  zIndex,
} as const;

export default spacingTokens;