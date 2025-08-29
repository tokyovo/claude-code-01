/**
 * Design System - Design Tokens Index
 * Central export for all design tokens
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './breakpoints';

// Re-export default objects for convenience
export { default as colors } from './colors';
export { default as typography } from './typography';
export { default as spacingTokens } from './spacing';
export { default as shadowTokens } from './shadows';
export { default as breakpointTokens } from './breakpoints';

import colors from './colors';
import typography from './typography';
import spacingTokens from './spacing';
import shadowTokens from './shadows';
import breakpointTokens from './breakpoints';

// Combined tokens object for easy access
export const designTokens = {
  colors,
  typography,
  spacing: spacingTokens,
  shadows: shadowTokens,
  breakpoints: breakpointTokens,
} as const;

export default designTokens;