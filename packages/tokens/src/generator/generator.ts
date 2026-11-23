/**
 * Theme Generator V2
 * OKLCH-based theme generation with simplified input parameters
 */

import type {
  ThemeInputV2,
  GeneratedThemeV2,
  GeneratedThemeMode,
  ResolvedBrandRampParams,
  UnifiedRampParams,
  ActionColorParams,
  SemanticToken,
  TokenMappingValue,
  ElevationColors,
  ElevationStyle,
  GeneratedElevationColors,
  GeneratedElevationStyles,
} from './types';
import {
  DEFAULT_TOKEN_MAPPING,
  DEFAULT_SURFACE_PARAMS,
  DEFAULT_BRAND_RAMP_PARAMS,
  DEFAULT_STATE_PARAMS,
  DEFAULT_ACTION_PARAMS,
  DEFAULT_SPECTRUM_PARAMS,
  DEFAULT_ELEVATION_COLORS,
  DEFAULT_ELEVATION_STYLES,
} from './defaults';
import {
  hexToOklch,
  oklchToHex,
  generateBrandRamp,
  generateUnifiedRamp,
  generateActionColor,
  generateSpectrumColor,
  generateContrastTextColors,
  ACTION_TYPES,
  SPECTRUM_TYPES,
  applyTokenMapping,
  generateStateOverlays,
} from './oklch';

/**
 * Fully resolved theme config with all defaults applied
 */
interface ResolvedThemeConfig {
  name: string;
  primary: string;
  accent: string;
  primaryRamp: ResolvedBrandRampParams;
  accentRamp: ResolvedBrandRampParams;
  surfaces: {
    tint: number;
    tintColor?: string;
    chromaFalloff: number;
    floor: number;
    ceiling: number;
    darkCurve: number;
    lightCurve: number;
  };
  states: {
    light: { intensity: number };
    dark: { intensity: number };
  };
  spectrumColors: {
    cool: { hue: number; hueAdjust: number };
    warm: { hue: number; hueAdjust: number };
    vivid: { hue: number; hueAdjust: number };
    chroma: number;
    baseLightness: number;
    darkLightnessShift: number;
    themeAffinity: number;
  };
  actionColors: {
    success: { hue: number; hueAdjust: number };
    error: { hue: number; hueAdjust: number };
    caution: { hue: number; hueAdjust: number };
    info: { hue: number; hueAdjust: number };
    chroma: number;
    baseLightness: number;
    fgLightnessOffset: number;
    darkFgLightnessOffset?: number;
    bgLightnessOffset: number;
  };
  tokenMapping: {
    light: Record<SemanticToken, TokenMappingValue>;
    dark: Record<SemanticToken, TokenMappingValue>;
  };
  elevation: ElevationColors;
  textOn: NonNullable<ThemeInputV2['textOn']>;
}

/**
 * Merge user input with defaults, supporting nested partial objects
 */
function resolveBrandRamp(
  input: ThemeInputV2['primaryRamp']
): ResolvedBrandRampParams {
  return {
    chromaFalloff:
      input?.chromaFalloff ?? DEFAULT_BRAND_RAMP_PARAMS.chromaFalloff,
    floor: input?.floor ?? DEFAULT_BRAND_RAMP_PARAMS.floor,
    ceiling: input?.ceiling ?? DEFAULT_BRAND_RAMP_PARAMS.ceiling,
    darkCurve: input?.darkCurve ?? DEFAULT_BRAND_RAMP_PARAMS.darkCurve,
    lightCurve: input?.lightCurve ?? DEFAULT_BRAND_RAMP_PARAMS.lightCurve,
  };
}

function mergeWithDefaults(input: ThemeInputV2): ResolvedThemeConfig {
  return {
    name: input.name,
    primary: input.primary,
    accent: input.accent,
    primaryRamp: resolveBrandRamp(input.primaryRamp),
    accentRamp: resolveBrandRamp(input.accentRamp),
    surfaces: {
      tint: input.surfaces?.tint ?? DEFAULT_SURFACE_PARAMS.tint,
      tintColor: input.surfaces?.tintColor,
      chromaFalloff:
        input.surfaces?.chromaFalloff ?? DEFAULT_SURFACE_PARAMS.chromaFalloff,
      floor: input.surfaces?.floor ?? DEFAULT_SURFACE_PARAMS.floor,
      ceiling: input.surfaces?.ceiling ?? DEFAULT_SURFACE_PARAMS.ceiling,
      darkCurve: input.surfaces?.darkCurve ?? DEFAULT_SURFACE_PARAMS.darkCurve,
      lightCurve:
        input.surfaces?.lightCurve ?? DEFAULT_SURFACE_PARAMS.lightCurve,
    },
    states: {
      light: {
        intensity:
          input.states?.light?.intensity ??
          DEFAULT_STATE_PARAMS.light.intensity,
      },
      dark: {
        intensity:
          input.states?.dark?.intensity ?? DEFAULT_STATE_PARAMS.dark.intensity,
      },
    },
    spectrumColors: {
      cool: {
        hue:
          input.spectrumColors?.cool?.hue ?? DEFAULT_SPECTRUM_PARAMS.cool.hue,
        hueAdjust:
          input.spectrumColors?.cool?.hueAdjust ??
          DEFAULT_SPECTRUM_PARAMS.cool.hueAdjust,
      },
      warm: {
        hue:
          input.spectrumColors?.warm?.hue ?? DEFAULT_SPECTRUM_PARAMS.warm.hue,
        hueAdjust:
          input.spectrumColors?.warm?.hueAdjust ??
          DEFAULT_SPECTRUM_PARAMS.warm.hueAdjust,
      },
      vivid: {
        hue:
          input.spectrumColors?.vivid?.hue ?? DEFAULT_SPECTRUM_PARAMS.vivid.hue,
        hueAdjust:
          input.spectrumColors?.vivid?.hueAdjust ??
          DEFAULT_SPECTRUM_PARAMS.vivid.hueAdjust,
      },
      chroma: input.spectrumColors?.chroma ?? DEFAULT_SPECTRUM_PARAMS.chroma,
      baseLightness:
        input.spectrumColors?.baseLightness ??
        DEFAULT_SPECTRUM_PARAMS.baseLightness,
      darkLightnessShift:
        input.spectrumColors?.darkLightnessShift ??
        DEFAULT_SPECTRUM_PARAMS.darkLightnessShift,
      themeAffinity:
        input.spectrumColors?.themeAffinity ??
        DEFAULT_SPECTRUM_PARAMS.themeAffinity,
    },
    actionColors: {
      success: {
        hue:
          input.actionColors?.success?.hue ?? DEFAULT_ACTION_PARAMS.success.hue,
        hueAdjust:
          input.actionColors?.success?.hueAdjust ??
          DEFAULT_ACTION_PARAMS.success.hueAdjust,
      },
      error: {
        hue: input.actionColors?.error?.hue ?? DEFAULT_ACTION_PARAMS.error.hue,
        hueAdjust:
          input.actionColors?.error?.hueAdjust ??
          DEFAULT_ACTION_PARAMS.error.hueAdjust,
      },
      caution: {
        hue:
          input.actionColors?.caution?.hue ?? DEFAULT_ACTION_PARAMS.caution.hue,
        hueAdjust:
          input.actionColors?.caution?.hueAdjust ??
          DEFAULT_ACTION_PARAMS.caution.hueAdjust,
      },
      info: {
        hue: input.actionColors?.info?.hue ?? DEFAULT_ACTION_PARAMS.info.hue,
        hueAdjust:
          input.actionColors?.info?.hueAdjust ??
          DEFAULT_ACTION_PARAMS.info.hueAdjust,
      },
      chroma: input.actionColors?.chroma ?? DEFAULT_ACTION_PARAMS.chroma,
      baseLightness:
        input.actionColors?.baseLightness ??
        DEFAULT_ACTION_PARAMS.baseLightness,
      fgLightnessOffset:
        input.actionColors?.fgLightnessOffset ??
        DEFAULT_ACTION_PARAMS.fgLightnessOffset,
      darkFgLightnessOffset: input.actionColors?.darkFgLightnessOffset,
      bgLightnessOffset:
        input.actionColors?.bgLightnessOffset ??
        DEFAULT_ACTION_PARAMS.bgLightnessOffset,
    },
    tokenMapping: {
      light: {
        ...DEFAULT_TOKEN_MAPPING.light,
        ...input.tokenMapping?.light,
      },
      dark: {
        ...DEFAULT_TOKEN_MAPPING.dark,
        ...input.tokenMapping?.dark,
      },
    },
    elevation: {
      source: input.elevation?.source ?? DEFAULT_ELEVATION_COLORS.source,
      chroma: input.elevation?.chroma ?? DEFAULT_ELEVATION_COLORS.chroma,
      lightOpacity:
        input.elevation?.lightOpacity ?? DEFAULT_ELEVATION_COLORS.lightOpacity,
      darkOpacity:
        input.elevation?.darkOpacity ?? DEFAULT_ELEVATION_COLORS.darkOpacity,
    },
    textOn: input.textOn ?? {},
  };
}

/**
 * ThemeGeneratorV2 - Generates complete themes from simplified input
 */
export class ThemeGeneratorV2 {
  /**
   * Generate a complete theme from simplified input
   */
  generate(input: ThemeInputV2): GeneratedThemeV2 {
    const config = mergeWithDefaults(input);
    const surfaceTintColor = config.surfaces.tintColor ?? config.primary;
    const surfaceTintOklch = hexToOklch(surfaceTintColor);

    // Generate single unified ramp for both modes
    const rampParams: UnifiedRampParams = {
      tint: config.surfaces.tint,
      chromaFalloff: config.surfaces.chromaFalloff,
      primaryHue: surfaceTintOklch.h,
      floor: config.surfaces.floor,
      ceiling: config.surfaces.ceiling,
      darkCurve: config.surfaces.darkCurve,
      lightCurve: config.surfaces.lightCurve,
    };

    const unifiedRamp = generateUnifiedRamp(rampParams);

    // Generate brand ramps (shared across modes — both modes pick the same
    // step 500 = picked color)
    const primaryRamp = generateBrandRamp(config.primary, config.primaryRamp);
    const accentRamp = generateBrandRamp(config.accent, config.accentRamp);

    // Generate contrast text colors
    const contrastColors = generateContrastTextColors(
      config.primary,
      config.accent
    );

    return {
      name: config.name,
      light: this.generateMode(
        config,
        unifiedRamp,
        primaryRamp,
        accentRamp,
        'light',
        contrastColors.textOnPrimary,
        contrastColors.textOnAccent
      ),
      dark: this.generateMode(
        config,
        unifiedRamp,
        primaryRamp,
        accentRamp,
        'dark',
        contrastColors.textOnPrimary,
        contrastColors.textOnAccent
      ),
    };
  }

  /**
   * Generate a single mode (light or dark)
   */
  private generateMode(
    config: ResolvedThemeConfig,
    ramp: string[],
    primaryRamp: string[],
    accentRamp: string[],
    mode: 'light' | 'dark',
    textOnPrimary: string,
    textOnAccent: string
  ): GeneratedThemeMode {
    const mapping = config.tokenMapping[mode];
    const stateIntensity = config.states[mode].intensity;

    // Get source color for elevation
    const sourceColor =
      config.elevation.source === 'primary' ? config.primary : config.accent;

    // Generate elevation colors and styles
    const elevationColors = this.generateElevationColors(
      mode,
      config.elevation,
      sourceColor,
      ramp
    );
    const elevationStyles = this.generateElevationStyles(mode, elevationColors);

    return {
      primary: config.primary,
      accent: config.accent,
      surfaces: ramp,
      primaryRamp,
      accentRamp,
      tokens: applyTokenMapping(
        ramp,
        mapping,
        config.primary,
        config.accent,
        primaryRamp,
        accentRamp
      ),
      actions: this.generateActions(config, mode),
      spectrum: this.generateSpectrum(config, mode),
      states: generateStateOverlays(stateIntensity, mode),
      // the theme's own text on its fills, for this mode, where it names one
      ...this.resolveTextOn(config.textOn[mode], ramp, config, primaryRamp, accentRamp, textOnPrimary, textOnAccent),
      elevationColors,
      elevationStyles,
    };
  }

  private resolveTextOn(
    textOn: { primary?: TokenMappingValue; accent?: TokenMappingValue } | undefined,
    ramp: string[],
    config: ResolvedThemeConfig,
    primaryRamp: string[],
    accentRamp: string[],
    textOnPrimary: string,
    textOnAccent: string
  ): { textOnPrimary: string; textOnAccent: string } {
    const named = applyTokenMapping(ramp, (textOn ?? {}) as Record<string, TokenMappingValue>, config.primary, config.accent, primaryRamp, accentRamp);
    return { textOnPrimary: named.primary ?? textOnPrimary, textOnAccent: named.accent ?? textOnAccent };
  }

  /**
   * Generate action colors (success, error, caution, info)
   */
  private generateActions(
    config: ResolvedThemeConfig,
    mode: 'light' | 'dark'
  ): Record<string, string> {
    const actions: Record<string, string> = {};
    const actionConfig = config.actionColors;

    for (const type of ACTION_TYPES) {
      const params: ActionColorParams = {
        hue: actionConfig[type].hue,
        hueAdjust: actionConfig[type].hueAdjust,
        chroma: actionConfig.chroma,
        baseLightness: actionConfig.baseLightness,
        fgLightnessOffset: actionConfig.fgLightnessOffset,
        darkFgLightnessOffset: actionConfig.darkFgLightnessOffset,
        bgLightnessOffset: actionConfig.bgLightnessOffset,
      };

      const colors = generateActionColor(params, mode);

      actions[type] = colors.base;
      actions[`${type}-fg`] = colors.fg;
      actions[`${type}-bg`] = colors.bg;
    }

    return actions;
  }

  /**
   * Generate the decorative spectrum stops
   */
  private generateSpectrum(
    config: ResolvedThemeConfig,
    mode: 'light' | 'dark'
  ): Record<string, string> {
    const spectrum: Record<string, string> = {};
    const spectrumConfig = config.spectrumColors;

    for (const type of SPECTRUM_TYPES) {
      spectrum[type] = generateSpectrumColor(
        {
          hue: spectrumConfig[type].hue,
          hueAdjust: spectrumConfig[type].hueAdjust,
          chroma: spectrumConfig.chroma,
          baseLightness: spectrumConfig.baseLightness,
          darkLightnessShift: spectrumConfig.darkLightnessShift,
          primaryHue: hexToOklch(config.primary).h,
          themeAffinity: spectrumConfig.themeAffinity,
        },
        mode
      );
    }

    return spectrum;
  }

  /**
   * Generate elevation shadow colors
   *
   * Formula:
   * 1. Start with brand color (source) directly
   * 2. Scale chroma by saturation (100% = full color, 0% = neutral gray)
   * 3. Apply opacity x intensity ratio for each level
   *
   * Intensity ratios:
   * - Low = 0.5
   * - Default = 1.0
   * - High = 1.5
   */
  private generateElevationColors(
    _mode: 'light' | 'dark',
    elevation: ElevationColors,
    sourceColor: string,
    _ramp: string[]
  ): GeneratedElevationColors {
    // Convert source to OKLCH
    const sourceOklch = hexToOklch(sourceColor);

    // Scale chroma by saturation (0% = gray, 100% = full brand color)
    const saturationFactor = elevation.chroma / 100;

    const shadowColor = {
      l: sourceOklch.l, // Keep source lightness
      c: sourceOklch.c * saturationFactor, // Scale chroma down for more neutral
      h: sourceOklch.h, // Keep source hue
    };

    const shadowHex = oklchToHex(shadowColor);

    // Get base opacity for this mode
    const baseOpacity =
      _mode === 'light' ? elevation.lightOpacity : elevation.darkOpacity;

    // Calculate opacity for each intensity level
    const intensityRatios = { low: 0.5, default: 1.0, high: 1.5 };

    // Generate rgba colors with appropriate opacity
    const generateRgba = (intensity: 'low' | 'default' | 'high'): string => {
      const opacity = (baseOpacity * intensityRatios[intensity]) / 100;
      // Convert shadow hex to rgb for rgba output
      const hex = shadowHex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
    };

    return {
      low: generateRgba('low'),
      default: generateRgba('default'),
      high: generateRgba('high'),
    };
  }

  /**
   * Generate CSS box-shadow strings from elevation colors
   * Uses static DEFAULT_ELEVATION_STYLES for shadow geometry
   */
  private generateElevationStyles(
    mode: 'light' | 'dark',
    elevationColors: GeneratedElevationColors
  ): GeneratedElevationStyles {
    const formatBoxShadow = (
      offsetX: number,
      offsetY: number,
      blur: number,
      color: string
    ): string => {
      return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    };

    // Dark surfaces don't take drop shadows — a cast shadow on a near-black
    // canvas is invisible. Dark mode renders elevation as a centred glow
    // instead: offset drops to 0 and the blur widens to compensate.
    const resolve = (style: ElevationStyle): string => {
      const geometry =
        mode === 'dark'
          ? { ...style, offsetY: 0, blur: style.blur + 6 }
          : style;

      return formatBoxShadow(
        geometry.offsetX,
        geometry.offsetY,
        geometry.blur,
        elevationColors[geometry.intensity]
      );
    };

    return {
      level1: resolve(DEFAULT_ELEVATION_STYLES.level1),
      level2: resolve(DEFAULT_ELEVATION_STYLES.level2),
      level3: resolve(DEFAULT_ELEVATION_STYLES.level3),
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const themeGeneratorV2 = new ThemeGeneratorV2();
