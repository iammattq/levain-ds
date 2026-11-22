/**
 * Base themes definitions for V2 theme system
 * Simplified input format with OKLCH-based generation
 */
import type { ThemeInputV2 } from '../generator/types';

/**
 * Array of built-in V2 theme definitions.
 * Each theme only needs name, primary, and accent colors.
 * All other parameters use sensible defaults.
 */
export const baseThemesV2: ThemeInputV2[] = [
  {
    name: 'Sage',
    // Sage green + warm terracotta — classic earthy pairing.
    primary: '#97A888',
    accent: '#C9966B',
    surfaces: {
      tint: 9,
      tintColor: '#C4A36A',
      chromaFalloff: 0.95,
      floor: 8.5,
      ceiling: 99,
      darkCurve: 0.74,
      lightCurve: 0.28,
    },
    states: {
      light: {
        intensity: 10,
      },
    },
    actionColors: {
      chroma: 0.045,
      baseLightness: 64,
      fgLightnessOffset: -18,
      bgLightnessOffset: 31,
    },
    tokenMapping: {
      dark: {
        // Sage's dark ladder sits two rungs higher than the default, so its
        // borders shift with it — they have to stay above surface-elevated.
        'surface-canvas': 3,
        'surface-section': 4,
        'surface-card': 5,
        'surface-component': 6,
        'surface-subtle': 4,
        'surface-interactive': 6,
        'surface-elevated': 7,
        'border-subtle': 8,
        'border-default': 10,
        'border-emphasis': 13,
        'text-inverted': 3,
      },
    },
    elevation: {
      chroma: 19,
      darkOpacity: 18,
    },
  },
  {
    name: 'Harbor',
    // Blue-gray + weathered copper — maritime/dock pairing.
    primary: '#547385',
    accent: '#9A7155',
    surfaces: {
      tint: 8,
      tintColor: '#D7C9B0',
      chromaFalloff: 0.95,
      floor: 13,
      ceiling: 97.5,
      darkCurve: 0.62,
      lightCurve: 0.33,
    },
    states: {
      light: {
        intensity: 10,
      },
    },
    actionColors: {
      success: {
        hue: 150,
      },
      error: {
        hue: 20,
      },
      caution: {
        hue: 56,
      },
      info: {
        hue: 205,
      },
      chroma: 0.045,
      baseLightness: 64,
      fgLightnessOffset: -18,
      bgLightnessOffset: 31,
    },
  },
  {
    name: 'Mulberry',
    // Dusty mauve + olive ochre — vintage / heirloom pairing.
    primary: '#875E77',
    accent: '#88774C',
    surfaces: {
      tint: 8.5,
      tintColor: '#C8CBB0',
      chromaFalloff: 0.9,
      floor: 13.5,
      ceiling: 97.5,
      darkCurve: 0.64,
      lightCurve: 0.32,
    },
    states: {
      light: {
        intensity: 10,
      },
    },
    actionColors: {
      success: {
        hue: 132,
      },
      error: {
        hue: 14,
      },
      caution: {
        hue: 52,
      },
      info: {
        hue: 202,
      },
      chroma: 0.045,
      baseLightness: 64,
      fgLightnessOffset: -18,
      bgLightnessOffset: 31,
    },
  },
  {
    name: 'Slate',
    // Cool gray-blue + warm caramel — industrial paired with warmth.
    primary: '#626F77',
    accent: '#8B6F58',
    surfaces: {
      tint: 7.5,
      tintColor: '#D4C4AD',
      chromaFalloff: 0.85,
      floor: 12,
      ceiling: 97.5,
      darkCurve: 0.58,
      lightCurve: 0.35,
    },
    states: {
      light: {
        intensity: 10,
      },
    },
    actionColors: {
      success: {
        hue: 146,
      },
      error: {
        hue: 18,
      },
      caution: {
        hue: 56,
      },
      info: {
        hue: 208,
      },
      chroma: 0.04,
      baseLightness: 64,
      fgLightnessOffset: -18,
      bgLightnessOffset: 31,
    },
  },
  // Linen - warm editorial / paper-inspired. Pairs with Linen typography preset.
  {
    name: 'Linen',
    // Warm taupe + cool dusty blue-gray — warm/cool counterbalance for editorial pages.
    primary: '#BFA98E',
    accent: '#7E8C8E',
    surfaces: {
      tint: 9,
      tintColor: '#DDD3C0',
      chromaFalloff: 0.85,
      floor: 13.5,
      ceiling: 97.5,
      darkCurve: 0.62,
      lightCurve: 0.33,
    },
    states: {
      light: {
        intensity: 10,
      },
    },
    actionColors: {
      success: {
        hue: 134,
      },
      error: {
        hue: 18,
      },
      caution: {
        hue: 50,
      },
      info: {
        hue: 215,
      },
      chroma: 0.04,
      baseLightness: 62,
      fgLightnessOffset: -18,
      bgLightnessOffset: 32,
    },
  },
  // Atrium - cool architectural / monochrome restraint. Pairs with Atrium typography preset.
  {
    name: 'Atrium',
    // Cool gray + muted brass — architectural restraint, with brass-fixture warmth.
    primary: '#6F7479',
    accent: '#8C7B5A',
    surfaces: {
      tint: 5,
      chromaFalloff: 0.7,
      floor: 12,
      ceiling: 97,
      darkCurve: 0.58,
      lightCurve: 0.34,
    },
    states: {
      light: {
        intensity: 8,
      },
    },
    actionColors: {
      success: {
        hue: 142,
      },
      error: {
        hue: 18,
      },
      caution: {
        hue: 50,
      },
      info: {
        hue: 218,
      },
      chroma: 0.038,
      baseLightness: 60,
      fgLightnessOffset: -18,
      bgLightnessOffset: 33,
    },
  },
  // Heather - refined dusty mauve. Pairs with Heather typography preset.
  {
    name: 'Heather',
    // Dusty lavender + soft sage — floral + foliage.
    primary: '#968D9A',
    accent: '#88957D',
    surfaces: {
      tint: 7,
      tintColor: '#D9CFC1',
      chromaFalloff: 0.8,
      floor: 13,
      ceiling: 97.5,
      darkCurve: 0.6,
      lightCurve: 0.34,
    },
    states: {
      light: {
        intensity: 9,
      },
    },
    actionColors: {
      success: {
        hue: 138,
      },
      error: {
        hue: 14,
      },
      caution: {
        hue: 52,
      },
      info: {
        hue: 220,
      },
      chroma: 0.04,
      baseLightness: 62,
      fgLightnessOffset: -18,
      bgLightnessOffset: 32,
    },
  },
];
