/**
 * Theme System V2 Types
 * OKLCH-based theme generation with simplified input parameters
 */

/**
 * Semantic token names that can be mapped to ramp indices or brand colors
 */
export type SemanticToken =
  // Surfaces
  | 'surface-canvas'
  | 'surface-section'
  | 'surface-card'
  | 'surface-component'
  | 'surface-subtle'
  | 'surface-interactive'
  | 'surface-elevated'
  | 'surface-inverted'
  // Text
  | 'text-emphasis'
  | 'text-default'
  | 'text-muted'
  | 'text-faint'
  | 'text-disabled'
  | 'text-inverted'
  | 'text-link'
  // Borders
  | 'border-subtle'
  | 'border-default'
  | 'border-emphasis'
  | 'border-focus'
  | 'border-decorative'
  // Brand (resolved through brand ramps; differ per mode)
  | 'primary'
  | 'accent'
  | 'gradient-start'
  | 'gradient-end';

/**
 * Step in a 9-stop brand ramp (Tailwind convention).
 */
export type BrandRampStep = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * Reference to a specific step in a brand ramp.
 * Examples: 'primary-300', 'accent-700'.
 */
export type BrandRampRef =
  `primary-${BrandRampStep}` | `accent-${BrandRampStep}`;

/**
 * Token mapping value:
 *   - number 0-25 → unified surface ramp index
 *   - 'primary' / 'accent' → the picked brand hex (= step 500)
 *   - 'primary-{step}' / 'accent-{step}' → a specific brand ramp stop
 */
export type TokenMappingValue = number | 'primary' | 'accent' | BrandRampRef;

// =============================================================================
// Elevation Types
// =============================================================================

/**
 * User-configurable elevation settings
 *
 * Model with 3 controls:
 * - chroma: Saturation of shadow color (0% = gray, 100% = full brand color)
 * - lightOpacity: Overall shadow visibility in light mode (5-30%)
 * - darkOpacity: Overall shadow visibility in dark mode (10-40%)
 *
 * Shadow color formula:
 * 1. Start with brand color (source) directly
 * 2. Scale chroma by saturation (100% = full color, 0% = neutral gray)
 * 3. Apply opacity x intensity ratio
 *
 * The three intensity levels (low/default/high) are fixed ratios of opacity:
 * - Low = opacity × 0.5
 * - Default = opacity × 1.0
 * - High = opacity × 1.5
 */
export interface ElevationColors {
  /** Which brand color to use: 'primary' or 'accent' */
  source: 'primary' | 'accent';
  /** Saturation of shadow color (0% = gray, 100% = full brand color) */
  chroma: number;
  /** Overall shadow visibility in light mode (5-30%) */
  lightOpacity: number;
  /** Overall shadow visibility in dark mode (10-40%) */
  darkOpacity: number;
}

/**
 * Static elevation style configuration (NOT user-configurable)
 * Defines shadow geometry for a single elevation level
 */
export interface ElevationStyle {
  /** Horizontal shadow offset in pixels */
  offsetX: number;
  /** Vertical shadow offset in pixels */
  offsetY: number;
  /** Shadow blur radius in pixels */
  blur: number;
  /** Which elevation color intensity to use */
  intensity: 'low' | 'default' | 'high';
}

/**
 * Collection of elevation styles, keyed by level rather than by component.
 *
 * Elevation is contextual: the same card takes a different shadow depending on
 * what it sits on. Naming these `card`/`button` would bake a component identity
 * into a value that belongs to a boundary between two layers.
 */
export interface ElevationStyles {
  /** L2 on L0/L1 — a section resting on the page canvas */
  level1: ElevationStyle;
  /** L3 on L2 — a card inside a section */
  level2: ElevationStyle;
  /** Floating above the page — modals, dropdowns, popovers */
  level3: ElevationStyle;
}

/**
 * Generated elevation colors (hex values for shadows)
 */
export interface GeneratedElevationColors {
  /** Low intensity shadow color */
  low: string;
  /** Default intensity shadow color */
  default: string;
  /** High intensity shadow color */
  high: string;
}

/**
 * Generated CSS box-shadow strings for each elevation level
 * Emitted as --elevation-1 / --elevation-2 / --elevation-3
 */
export interface GeneratedElevationStyles {
  /** CSS box-shadow for --elevation-1 */
  level1: string;
  /** CSS box-shadow for --elevation-2 */
  level2: string;
  /** CSS box-shadow for --elevation-3 */
  level3: string;
}

// =============================================================================
// Theme Input Types
// =============================================================================

/**
 * Parameters for a single spectrum colour
 */
export interface SpectrumColorParams {
  /** Base hue in degrees */
  hue: number;
  /** Per-theme adjustment applied to the hue */
  hueAdjust: number;
  /** Chroma, shared across the stops so they read as one family */
  chroma: number;
  /** Lightness in light mode */
  baseLightness: number;
  /** Lightness added in dark mode, so stops stay visible on a dark ground */
  darkLightnessShift: number;
  /** The theme's primary hue, which the triad rotates toward */
  primaryHue: number;
  /** How far the triad turns toward the primary. 0 is absolute hues. */
  themeAffinity: number;
}

/**
 * Simplified theme input for V2 generation
 * ~12 core params + 8 action color params (with sensible defaults)
 */
export interface ThemeInputV2 {
  /** Theme name */
  name: string;
  /** Primary brand color (hex) */
  primary: string;
  /** Accent brand color (hex) */
  accent: string;

  /** Elevation color configuration (optional) */
  elevation?: Partial<ElevationColors>;

  /** Surface ramp generation parameters (unified 26-stop ramp) */
  surfaces?: {
    /** Percentage of tint hue mixed into neutrals (0-10, default 3) */
    tint?: number;
    /** Hex color used to tint neutral surfaces (defaults to primary) */
    tintColor?: string;
    /** How quickly chroma drops near extremes (0.5-2.0, default 1.25) */
    chromaFalloff?: number;
    /** Darkest L value at index 0 (0-15, default 4) */
    floor?: number;
    /** Lightest L value at index 25 (85-100, default 96) */
    ceiling?: number;
    /** Power curve for dark half indices 0-12 (0.2-1.5, default 0.49) */
    darkCurve?: number;
    /** Power curve for light half indices 13-25 (0.2-1.5, default 0.47) */
    lightCurve?: number;
  };

  /** Primary brand ramp generation parameters (9-stop ramp 100-900) */
  primaryRamp?: BrandRampParams;
  /** Accent brand ramp generation parameters (9-stop ramp 100-900) */
  accentRamp?: BrandRampParams;

  /** Interaction state parameters */
  states?: {
    /** Light mode state intensity (2-10, default 4) */
    light?: { intensity?: number };
    /** Dark mode state intensity (2-12, default 6) */
    dark?: { intensity?: number };
  };

  /**
   * Spectrum colour parameters.
   *
   * Three decorative stops that widen the theme's palette. Derived from fixed
   * hues by default, each tunable by `hueAdjust`.
   */
  spectrumColors?: {
    /** Cool stop (default hue: 225) */
    cool?: { hue?: number; hueAdjust?: number };
    /** Warm stop (default hue: 30) */
    warm?: { hue?: number; hueAdjust?: number };
    /** Vivid stop (default hue: 300) */
    vivid?: { hue?: number; hueAdjust?: number };
    /** Chroma for all spectrum colours (0-0.3, default 0.12) */
    chroma?: number;
    /** Base lightness in light mode (30-80, default 58) */
    baseLightness?: number;
    /** Lightness added in dark mode (0-30, default 12) */
    darkLightnessShift?: number;
    /**
     * How far the triad turns toward the theme's primary hue (0-1, default
     * 0.3). At 0 every theme shares one spectrum; at 1 the stops are pure
     * rotations of the primary and stop being reliably cool or warm.
     */
    themeAffinity?: number;
  };

  /** Action color generation parameters */
  actionColors?: {
    /** Success color parameters (default hue: 145) */
    success?: ActionStatusInput;
    /** Error color parameters (default hue: 25) */
    error?: ActionStatusInput;
    /** Caution color parameters (default hue: 45) */
    caution?: ActionStatusInput;
    /** Info color parameters (default hue: 220) */
    info?: ActionStatusInput;
    /** Chroma for all action colors (0-0.25, default 0.15) */
    chroma?: number;
    /** Base lightness for action colors (30-70, default 50) */
    baseLightness?: number;
    /** Lightness offset for -fg variants (-30 to 0, default -15) */
    fgLightnessOffset?: number;
    /**
     * Lightness offset for -fg variants in dark mode only (-30 to 0), mirrored like fgLightnessOffset (dark fg sits at
     * baseLightness minus it). Left out, dark mode uses fgLightnessOffset. For a theme whose dark surfaces need a
     * lighter status text than its light mode's mirror gives.
     */
    darkFgLightnessOffset?: number;
    /** Lightness offset for -bg variants (0 to +50, default +40) */
    bgLightnessOffset?: number;
  };

  /** Semantic token mappings to ramp indices or brand colors */
  tokenMapping?: {
    /** Light mode token mappings */
    light?: Partial<Record<SemanticToken, TokenMappingValue>>;
    /** Dark mode token mappings */
    dark?: Partial<Record<SemanticToken, TokenMappingValue>>;
  };

  /**
   * The text on the primary and accent fills, per mode, when the theme maps those fills itself (a neutral primary:
   * near-black on light, near-white on dark, needs its text flipped per mode). Left out, the text is picked once
   * for both modes by contrast with the picked colours.
   */
  textOn?: {
    light?: { primary?: TokenMappingValue; accent?: TokenMappingValue };
    dark?: { primary?: TokenMappingValue; accent?: TokenMappingValue };
  };
}

/**
 * OKLCH color representation (lightness 0-100 scale for readability)
 */
export interface OklchColor {
  /** Lightness (0-100) */
  l: number;
  /** Chroma (0-0.4 typically) */
  c: number;
  /** Hue (0-360) */
  h: number;
}

/**
 * Action color output (base + foreground + background variants)
 */
export interface ActionColorSet {
  /** Base action color */
  base: string;
  /** Foreground variant (for text on neutral backgrounds) */
  fg: string;
  /** Background variant (for subtle backgrounds) */
  bg: string;
}

/**
 * Interaction state overlays
 */
export interface StateColors {
  /** Hover state overlay */
  hover: string;
  /** Focus state overlay */
  focus: string;
  /** Active state overlay */
  active: string;
}

/**
 * Generated theme output for a single mode (light or dark)
 */
export interface GeneratedThemeMode {
  /** Primary brand color */
  primary: string;
  /** Accent brand color */
  accent: string;
  /** 26-stop unified surface ramp (0-25) */
  surfaces: string[];
  /** 9-stop primary brand ramp (indices 0-8 = steps 100-900) */
  primaryRamp: string[];
  /** 9-stop accent brand ramp (indices 0-8 = steps 100-900) */
  accentRamp: string[];
  /** Semantic tokens mapped to hex values */
  tokens: Record<string, string>;
  /** Action colors (success, success-fg, success-bg, error, etc.) */
  actions: Record<string, string>;
  /** Decorative spectrum stops (cool, warm, vivid) */
  spectrum: Record<string, string>;
  /** Interaction state overlays */
  states: StateColors;
  /** Contrasting text color for primary brand color */
  textOnPrimary: string;
  /** Contrasting text color for accent brand color */
  textOnAccent: string;
  /** Generated elevation colors (hex values for shadows) */
  elevationColors: GeneratedElevationColors;
  /** Generated CSS box-shadow strings for each element type */
  elevationStyles: GeneratedElevationStyles;
}

/**
 * Complete generated theme with both modes
 */
export interface GeneratedThemeV2 {
  /** Theme name */
  name: string;
  /** Light mode colors */
  light: GeneratedThemeMode;
  /** Dark mode colors */
  dark: GeneratedThemeMode;
}

/**
 * Parameters for surface ramp generation (resolved from input + defaults)
 */
export interface RampParams {
  /** Lightest L value for light mode */
  ceiling: number;
  /** Darkest L value for dark mode */
  floor: number;
  /** Power curve exponent for lightness distribution */
  curve: number;
  /** Percentage of primary hue mixed into neutrals */
  tint: number;
  /** How quickly chroma drops near extremes */
  chromaFalloff: number;
  /** Hue shift for warm/cool adjustment */
  hueShift: number;
  /** Primary color hue extracted from brand color */
  primaryHue: number;
}

/**
 * One status colour's input (success, error, caution or info).
 */
export interface ActionStatusInput {
  hue?: number;
  hueAdjust?: number;
  /**
   * This status's own lightness offset for its light-mode -fg (-30 to 0): light fg sits at baseLightness plus it.
   * Left out, the status uses the shared fgLightnessOffset. For a hue that clips out of sRGB at the shared lightness
   * (an amber at L37 turns brown), so it can sit lighter while keeping its contrast. Dark mode is unaffected.
   */
  lightFgLightnessOffset?: number;
}

/**
 * Parameters for action color generation
 */
export interface ActionColorParams {
  /** Base hue for the action color */
  hue: number;
  /** Hue adjustment (-20 to +20) */
  hueAdjust: number;
  /** Chroma/saturation level */
  chroma: number;
  /** Base lightness value */
  baseLightness: number;
  /** Lightness offset for foreground variant */
  fgLightnessOffset: number;
  /** Lightness offset for the foreground variant in dark mode (defaults to fgLightnessOffset) */
  darkFgLightnessOffset?: number;
  /** This status's own lightness offset for the light-mode foreground (defaults to fgLightnessOffset) */
  lightFgLightnessOffset?: number;
  /** Lightness offset for background variant */
  bgLightnessOffset: number;
}

/**
 * User-configurable brand ramp parameters
 *
 * Generates a 9-stop ramp (100-900, Tailwind convention) anchored on a picked
 * hex color. Step 500 = picked color exactly. Steps 100-400 interpolate L
 * from `ceiling` down to picked.L using `lightCurve`; steps 600-900 interpolate
 * from picked.L down to `floor` using `darkCurve`. Chroma starts at picked.C
 * at step 500 and falls off toward extremes via `chromaFalloff`.
 */
export interface BrandRampParams {
  /** How quickly chroma drops near extremes (0.5-2.0) */
  chromaFalloff?: number;
  /** Darkest L value at step 900 (0-30) */
  floor?: number;
  /** Lightest L value at step 100 (85-100) */
  ceiling?: number;
  /** Power curve for dark half steps 600-900 (0.2-1.5) */
  darkCurve?: number;
  /** Power curve for light half steps 100-500 (0.2-1.5) */
  lightCurve?: number;
}

/**
 * Parameters for brand ramp generation (resolved from input + defaults)
 */
export interface ResolvedBrandRampParams {
  chromaFalloff: number;
  floor: number;
  ceiling: number;
  darkCurve: number;
  lightCurve: number;
}

/**
 * Parameters for unified 26-stop ramp generation
 */
export interface UnifiedRampParams {
  /** Percentage of tint hue mixed into neutrals */
  tint: number;
  /** How quickly chroma drops near extremes */
  chromaFalloff: number;
  /** Primary/tint color hue extracted from brand or tint color */
  primaryHue: number;
  /** Darkest L value at index 0 */
  floor: number;
  /** Lightest L value at index 25 */
  ceiling: number;
  /** Power curve for dark half (indices 0-12) */
  darkCurve: number;
  /** Power curve for light half (indices 13-25) */
  lightCurve: number;
}

// =============================================================================
// Typography Types
// =============================================================================

/**
 * Curated Google Fonts for Typester
 * These fonts are hand-picked for quality and variety
 */
export type GoogleFont =
  | 'Nunito' // Current default
  | 'Inter' // Clean, popular
  | 'Roboto' // Neutral
  | 'Open Sans' // Readable
  | 'Lato' // Elegant
  | 'Source Sans 3' // Technical
  | 'Outfit' // Modern geometric
  | 'Poppins' // Geometric, playful
  | 'Work Sans' // Screen optimized
  | 'DM Sans' // Modern, condensed
  | 'Manrope' // Refined modern sans
  | 'Oswald' // Condensed display sans, strong headlines
  | 'Libre Baskerville' // Classic Baskerville, literary
  | 'Cormorant Garamond' // High-contrast Garamond, refined display
  | 'Crimson Text' // Old-style book serif, readable
  | 'Prata'; // Elegant Didone display serif

/**
 * Typography size tokens
 */
export type TypographySize =
  | '3xs'
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | '8xl';

/**
 * Typography weight tokens
 */
export type TypographyWeight = 'regular' | 'medium' | 'bold';

/**
 * Typography line-height tokens
 */
export type TypographyLeading =
  'none' | 'tight' | 'snug' | 'normal' | 'relaxed';

/**
 * Typography letter-spacing tokens
 */
export type TypographyTracking = 'tight' | 'normal' | 'wide';

/**
 * A single semantic typography style definition
 * Maps to primitive token names (not raw values)
 */
export interface TypographySemanticStyle {
  /** Size primitive token (e.g., 'sm', 'lg') - mobile/base size */
  size: TypographySize;
  /** Desktop size at md breakpoint (768px+) - optional, for responsive styles */
  sizeMd?: TypographySize;
  /** Weight primitive token (e.g., 'regular', 'bold') */
  weight: TypographyWeight;
  /** Line-height primitive token (e.g., 'normal', 'tight') */
  leading: TypographyLeading;
  /** Letter-spacing primitive token (e.g., 'normal', 'tight') - optional */
  tracking?: TypographyTracking;
  /** Whether to include muted color (for caption styles) */
  muted?: boolean;
}

/**
 * All semantic typography styles
 * These compose primitives into meaningful, reusable styles
 */
export interface TypographySemanticStyles {
  // Display style - oversized hero/marketing headline, larger than heading1
  display: TypographySemanticStyle;

  // Body styles
  body: TypographySemanticStyle;
  bodyLg: TypographySemanticStyle;
  bodySm: TypographySemanticStyle;

  // Label styles
  label: TypographySemanticStyle;
  labelSm: TypographySemanticStyle;
  labelCompact: TypographySemanticStyle;

  // Heading styles
  heading1: TypographySemanticStyle;
  heading2: TypographySemanticStyle;
  heading3: TypographySemanticStyle;
  heading4: TypographySemanticStyle;

  // Caption styles
  caption: TypographySemanticStyle;
  captionCompact: TypographySemanticStyle;

  // Code style
  code: TypographySemanticStyle;
}

/**
 * Input for typography preset generation
 * Allows partial overrides of default semantic styles
 */
export interface TypographyInputV2 {
  /** Preset name */
  name: string;
  /** Optional default font family override (Google Font name) */
  fontFamily?: GoogleFont;
  /** Optional heading font family override (defaults to fontFamily) */
  headingFontFamily?: GoogleFont;
  /** Optional semantic style overrides */
  semantics?: Partial<TypographySemanticStyles>;
}

/**
 * Generated typography output
 * Contains CSS custom property mappings for semantic styles
 */
export interface GeneratedTypographyV2 {
  /** Preset name */
  name: string;
  /** CSS custom property name → value mappings */
  vars: Record<string, string>;
}
