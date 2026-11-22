import type {
  ElevationColors,
  ElevationStyles,
  SemanticToken,
  TokenMappingValue,
  TypographySemanticStyles,
} from './types';

/**
 * Default token mappings for light and dark modes
 * Maps semantic tokens to unified ramp indices (0-25) or brand colors
 *
 * Unified ramp structure:
 * - Indices 0-12: Dark half (floor L4 → midpoint L50)
 * - Indices 13-25: Light half (midpoint L50 → ceiling L96)
 *
 * Light mode: surfaces from light end (high indices), text from dark end (low indices)
 * Dark mode: surfaces from dark end (low indices), text from light end (high indices)
 */
export const DEFAULT_TOKEN_MAPPING: {
  light: Record<SemanticToken, TokenMappingValue>;
  dark: Record<SemanticToken, TokenMappingValue>;
} = {
  light: {
    // Surfaces (light end of ramp, darker canvas -> lighter UI layers)
    // One rung per level: each layer that sits on top of another must be one
    // ramp step lighter, so tonal separation alone carries the boundary.
    'surface-canvas': 21, // L0/L1 base page
    'surface-section': 22, // L2 grouped sections
    'surface-card': 23, // L3 cards layer above sections
    'surface-component': 24, // L3 controls and component surfaces
    'surface-subtle': 22, // section-equivalent subtle fills
    'surface-interactive': 24, // interactive controls (same rung as component)
    'surface-elevated': 25, // floating layer: modals, dropdowns, popovers
    'surface-inverted': 9, // dark end for contrast

    // Text (dark end of ramp)
    'text-emphasis': 1, // L4
    'text-default': 5, // L20
    'text-muted': 9, // L36
    'text-faint': 12, // L48
    'text-disabled': 13, // L52
    'text-inverted': 24, // L96
    'text-link': 'primary',

    // Borders (mid-range)
    'border-subtle': 20, // L80
    'border-default': 17, // L68
    'border-emphasis': 14, // L56
    'border-focus': 'primary',
    'border-decorative': 'primary',

    // Brand semantics (resolved through brand ramps)
    primary: 'primary-500',
    accent: 'accent-500',
    'gradient-start': 'primary-500',
    'gradient-end': 'primary-600',
  },
  dark: {
    // Surfaces (dark end of ramp — higher index is lighter, so elevation
    // still climbs the ramp exactly as it does in light mode)
    'surface-canvas': 1, // L4  — L0/L1 base page
    'surface-section': 2, // L8  — L2 grouped sections
    'surface-card': 3, // L12 — L3 cards layer above sections
    'surface-component': 4, // L16 — L3 controls and component surfaces
    'surface-subtle': 2, // L8  — section-equivalent subtle fills
    'surface-interactive': 4, // L16 — interactive controls (same rung as component)
    'surface-elevated': 5, // L20 — floating layer: modals, dropdowns, popovers
    'surface-inverted': 22, // light end of ramp (for contrast)

    // Text (light end of ramp)
    'text-emphasis': 25, // L100
    'text-default': 23, // L92
    'text-muted': 18, // L72
    'text-faint': 15, // L60
    'text-disabled': 13, // L52
    'text-inverted': 1, // L4
    'text-link': 'primary',

    // Borders (mid-range). Borders sit outside the surface ladder — one rung
    // past its lightest rung here, mirroring light mode where they sit one
    // rung below its darkest. A border that lands *on* a ladder rung is
    // invisible against that surface.
    'border-subtle': 6, // L24 — one rung above surface-elevated (5)
    'border-default': 8, // L32
    'border-emphasis': 11, // L44
    'border-focus': 'primary',
    'border-decorative': 'primary',

    // Brand semantics (resolved through brand ramps)
    primary: 'primary-500',
    accent: 'accent-500',
    'gradient-start': 'primary-500',
    'gradient-end': 'primary-600',
  },
};

/**
 * Default surface generation parameters (unified ramp)
 */
export const DEFAULT_SURFACE_PARAMS = {
  tint: 3,
  chromaFalloff: 1.25,
  floor: 4, // L value at index 0
  ceiling: 96, // L value at index 25
  darkCurve: 0.49, // curve for indices 0-12
  lightCurve: 0.47, // curve for indices 13-25
} as const;

/**
 * Default brand ramp parameters (9-stop ramp anchored on picked color)
 *
 * Tighter floor/ceiling than surfaces so the ramp extremes still read as
 * "dark/light primary" rather than near-black/white.
 */
export const DEFAULT_BRAND_RAMP_PARAMS = {
  chromaFalloff: 1.25,
  floor: 12, // L value at step 900
  ceiling: 92, // L value at step 100
  darkCurve: 0.5, // curve for steps 600-900
  lightCurve: 0.5, // curve for steps 100-400
} as const;

/**
 * Default interaction state parameters
 */
export const DEFAULT_STATE_PARAMS = {
  light: { intensity: 6 },
  dark: { intensity: 6 },
} as const;

/**
 * Default action color parameters
 */
export const DEFAULT_ACTION_PARAMS = {
  success: { hue: 145, hueAdjust: 0 },
  error: { hue: 25, hueAdjust: 0 },
  caution: { hue: 45, hueAdjust: 0 },
  info: { hue: 220, hueAdjust: 0 },
  chroma: 0.15,
  baseLightness: 50,
  fgLightnessOffset: -15,
  bgLightnessOffset: 40,
} as const;

/**
 * Default spectrum colour parameters.
 *
 * Absolute hues rather than rotations of the theme's primary: a rotation from
 * an already-warm primary can land another warm colour, and the point of these
 * is that one is reliably cool and one reliably warm. Chroma and lightness are
 * shared so the three read as one family.
 */
export const DEFAULT_SPECTRUM_PARAMS = {
  cool: { hue: 225, hueAdjust: 0 },
  warm: { hue: 30, hueAdjust: 0 },
  vivid: { hue: 300, hueAdjust: 0 },
  /**
   * Held at 0.12 because sRGB runs out above it.
   *
   * oklchToHex clips out-of-gamut colours, and clipping bends hue. Measured
   * worst-case drift across the wheel at L 58 and 70: 0.10 -> 0.7 degrees,
   * 0.12 -> 3.3, 0.14 -> 7.0, 0.16 -> 10.4, 0.18 -> 15.6. These stops exist to
   * be interpolated across, so a hue that does not come back as asked is a
   * defect rather than a nuance. Guarded by spectrum.test.ts.
   */
  chroma: 0.12,
  baseLightness: 58,
  darkLightnessShift: 12,
  /**
   * Enough that a sage theme and a mulberry one carry visibly different
   * spectra, little enough that the cool stop stays cool.
   */
  themeAffinity: 0.3,
} as const;

// =============================================================================
// Elevation Defaults
// =============================================================================

/**
 * Default elevation color configuration
 * Dynamic - user-configurable via OK Themes
 *
 * Model:
 * - chroma: 100% saturation (full brand color)
 * - lightOpacity: 10% base opacity (low=5%, default=10%, high=15%)
 * - darkOpacity: 16% base opacity (low=8%, default=16%, high=24%)
 */
export const DEFAULT_ELEVATION_COLORS: ElevationColors = {
  source: 'accent',
  chroma: 100,
  lightOpacity: 10,
  darkOpacity: 16,
};

/**
 * Default elevation style configuration
 * Static - hardcoded, not in theme input
 *
 * Three levels, each climbing one intensity rung so adjacent elevations are
 * visibly distinct rather than mathematically distinct. Shadow reinforces the
 * surface ladder; it never carries a boundary on its own.
 */
export const DEFAULT_ELEVATION_STYLES: ElevationStyles = {
  level1: { offsetX: 0, offsetY: 2, blur: 8, intensity: 'low' },
  level2: { offsetX: 0, offsetY: 6, blur: 16, intensity: 'default' },
  level3: { offsetX: 0, offsetY: 10, blur: 30, intensity: 'high' },
};

// =============================================================================
// Typography Defaults
// =============================================================================

/**
 * Typography primitive values
 * These are the raw building blocks - fixed values not configurable per-preset
 */
export const TYPE_PRIMITIVES = {
  // Font families
  family: {
    sans: "var(--font-nunito), 'Nunito', ui-sans-serif, system-ui, -apple-system, sans-serif",
    mono: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
  },

  // Font sizes (rem values)
  size: {
    '3xs': '0.625rem', // 10px
    '2xs': '0.75rem', // 12px
    xs: '0.875rem', // 14px
    sm: '1rem', // 16px (base)
    md: '1.25rem', // 20px
    lg: '1.5rem', // 24px
    xl: '1.75rem', // 28px
    '2xl': '2rem', // 32px
    '3xl': '2.25rem', // 36px
    '4xl': '2.5rem', // 40px
    '5xl': '2.75rem', // 44px
    '6xl': '3rem', // 48px
    '7xl': '3.75rem', // 60px
    '8xl': '4.5rem', // 72px
  },

  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },

  // Line heights (unitless)
  leading: {
    none: '1',
    tight: '1.2',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Letter spacing (em values)
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

/**
 * Default semantic typography styles
 * Maps semantic style names to primitive token references
 * These can be overridden per-preset
 */
export const DEFAULT_TYPOGRAPHY_SEMANTICS: TypographySemanticStyles = {
  // Display style - oversized hero/marketing headline, larger than heading1
  // Light & airy: regular weight, normal tracking. Responsive like headings.
  display: {
    size: '4xl', // 40px mobile
    sizeMd: '8xl', // 72px desktop
    weight: 'regular',
    leading: 'tight',
    tracking: 'normal',
  },

  // Body styles - for paragraph text and general content
  body: {
    size: 'sm', // 16px
    weight: 'regular',
    leading: 'normal',
  },
  bodyLg: {
    size: 'md', // 20px
    weight: 'regular',
    leading: 'normal',
  },
  bodySm: {
    size: 'xs', // 14px
    weight: 'regular',
    leading: 'normal',
  },

  // Label styles - for form labels, buttons, navigation
  label: {
    size: 'xs', // 14px
    weight: 'medium',
    leading: 'snug',
  },
  labelSm: {
    size: '2xs', // 12px
    weight: 'medium',
    leading: 'tight',
  },
  labelCompact: {
    size: '3xs', // 10px
    weight: 'medium',
    leading: 'tight',
  },

  // Heading styles - for titles and section headers
  // Responsive: size is mobile, sizeMd is desktop (768px+)
  heading1: {
    size: 'xl', // 28px mobile
    sizeMd: '6xl', // 48px desktop
    weight: 'bold',
    leading: 'tight',
    tracking: 'tight',
  },
  heading2: {
    size: 'lg', // 24px mobile
    sizeMd: '3xl', // 36px desktop
    weight: 'bold',
    leading: 'tight',
    tracking: 'tight',
  },
  heading3: {
    size: 'lg', // 24px mobile
    sizeMd: '2xl', // 32px desktop
    weight: 'bold',
    leading: 'tight',
    tracking: 'tight',
  },
  heading4: {
    size: 'md', // 20px - fixed, no responsive change
    weight: 'bold',
    leading: 'tight',
    tracking: 'tight',
  },

  // Caption styles - for helper text, timestamps, metadata
  caption: {
    size: '2xs', // 12px
    weight: 'regular',
    leading: 'normal',
    muted: true,
  },
  captionCompact: {
    size: '3xs', // 10px
    weight: 'regular',
    leading: 'tight',
    muted: true,
  },

  // Code style - for inline code and code blocks
  code: {
    size: 'xs', // 14px
    weight: 'regular',
    leading: 'normal',
  },
};
