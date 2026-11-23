/**
 * Theme System V2 - Public API
 *
 * OKLCH-based theme generation with simplified input parameters.
 * Generates 14-stop surface ramps for gradient support.
 */

// Types
export type {
  ThemeInputV2,
  GeneratedThemeV2,
  GeneratedThemeMode,
  OklchColor,
  SemanticToken,
  TokenMappingValue,
  ActionColorSet,
  StateColors,
  RampParams,
  ActionColorParams,
  ActionStatusInput,
} from './types';

// Defaults
export {
  DEFAULT_TOKEN_MAPPING,
  DEFAULT_SURFACE_PARAMS,
  DEFAULT_STATE_PARAMS,
  DEFAULT_ACTION_PARAMS,
  DEFAULT_SPECTRUM_PARAMS,
} from './defaults';

// Generator
export { ThemeGeneratorV2, themeGeneratorV2 } from './generator';

// OKLCH utilities (for advanced usage)
export {
  hexToOklch,
  oklchToHex,
  createOklch,
  getContrastingText,
  generateContrastTextColors,
  calculateLightness,
  calculateChroma,
  generateSurfaceRamp,
  generateActionColor,
  ACTION_TYPES,
  generateSpectrumColor,
  SPECTRUM_TYPES,
  type ActionType,
  applyTokenMapping,
  generateStateOverlays,
} from './oklch';

// Typography
export {
  typographyGeneratorV2,
  TypographyGeneratorV2,
} from './typography/generator';
export type { GeneratedTypographyV2, TypographyInputV2 } from './types';
