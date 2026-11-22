// @levain/tokens
// OKLCH-based theme system with build-time and runtime generation

// Generator exports (for runtime theme generation in browser)
export { themeGeneratorV2, ThemeGeneratorV2 } from './src/generator';
export type {
  ThemeInputV2,
  GeneratedThemeV2,
  GeneratedThemeMode,
} from './src/generator/types';

// Theme manager (singleton for DOM injection)
export { themeManager, ThemeManager } from './src/core/themeManager';
export type { ActiveThemeState } from './src/core/themeManager';

// Theme mode utilities
export {
  initTheme,
  setTheme,
  getTheme,
  isDarkMode,
} from './src/core/themeMode';

// Theme data
export { baseThemesV2 } from './src/data/baseThemesV2';
export { baseTypography } from './src/data/baseTypography';

// Types
export type {
  ThemesV2Collection,
  ThemeV2Entry,
  ThemeMode,
} from './src/core/themeTypes';
export type {
  GeneratedTypographyV2,
  TypographyInputV2,
  SemanticToken,
  TokenMappingValue,
  UnifiedRampParams,
  BrandRampParams,
  ResolvedBrandRampParams,
  ElevationColors,
  ElevationStyles,
  TypographySemanticStyles,
  TypographySemanticStyle,
  TypographySize,
  TypographyWeight,
  TypographyLeading,
  TypographyTracking,
  GoogleFont,
} from './src/generator/types';

// Defaults (for ok-themes wizard)
export {
  DEFAULT_SURFACE_PARAMS,
  DEFAULT_BRAND_RAMP_PARAMS,
  DEFAULT_STATE_PARAMS,
  DEFAULT_ACTION_PARAMS,
  DEFAULT_SPECTRUM_PARAMS,
  DEFAULT_TOKEN_MAPPING,
  DEFAULT_ELEVATION_COLORS,
  DEFAULT_ELEVATION_STYLES,
  TYPE_PRIMITIVES,
  DEFAULT_TYPOGRAPHY_SEMANTICS,
} from './src/generator/defaults';

// OKLCH ramp generation (for ok-themes wizard)
export {
  generateUnifiedRamp,
  generateBrandRamp,
} from './src/generator/oklch/ramp';
export { generateStateOverlays } from './src/generator/oklch/tokens';
export {
  generateActionColor,
  ACTION_TYPES,
} from './src/generator/oklch/actions';
export {
  generateSpectrumColor,
  SPECTRUM_TYPES,
} from './src/generator/oklch/spectrum';

// Typography generator
export {
  typographyGeneratorV2,
  generateTypography,
} from './src/generator/typography/generator';

// OKLCH utilities (for advanced usage)
export {
  hexToOklch,
  oklchToHex,
  createOklch,
  getContrastingText,
  generateContrastTextColors,
} from './src/generator/oklch';

// Motion: durations, easings, springs and the reduced-motion helper (src/motion.ts; the same values as shared.css's)
export { duration, ease, spring, tween, drag, instant, motion, css as motionCss } from './src/motion';
export type { DurationName, EaseName, SpringName } from './src/motion';
