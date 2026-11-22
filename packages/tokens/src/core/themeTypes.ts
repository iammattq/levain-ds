/**
 * Core type definitions for the V2 theme system
 */

// Theme mode (light, dark, or system)
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * V2 theme mode data (generated from OKLCH-based system)
 * Re-exported from generator/types.ts for convenience
 */
export type { GeneratedThemeMode } from '../generator/types';

/**
 * V2 theme entry with native V2 data
 */
export interface ThemeV2Entry {
  /** Theme name */
  name: string;
  /** Light mode V2 data */
  light: import('../generator/types').GeneratedThemeMode;
  /** Dark mode V2 data */
  dark: import('../generator/types').GeneratedThemeMode;
}

/**
 * V2 theme collection (indexed by theme ID)
 */
export interface ThemesV2Collection {
  [key: string]: ThemeV2Entry;
}
