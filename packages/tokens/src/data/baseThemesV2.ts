/**
 * Base themes definitions for V2 theme system
 * Simplified input format with OKLCH-based generation
 */
import type { ThemeInputV2 } from '../generator/types';

/** Cobalt Mono (TH1): black and white, as the AI chat apps draw themselves, with cobalt only on links and focus.
 *  Pure greys; the primary button and the accent (the selected tab, status labels) are the text colour itself:
 *  near-black on light, near-white on dark, the text on them flipped per mode (textOn). The light canvas sits near
 *  white (#f2f2f2, cards whiter still), so the light half of the ramp is squeezed toward 100 (lightCurve 0.2), and
 *  dark mode's text takes the stops that stay distinct. */
const COBALT = '#2451C9';
const cobaltMono: ThemeInputV2 = {
  name: 'Cobalt Mono',
  primary: COBALT,
  accent: COBALT,
  surfaces: { tint: 0, tintColor: COBALT, chromaFalloff: 1, floor: 6, ceiling: 100, darkCurve: 0.6, lightCurve: 0.2 },
  states: { light: { intensity: 4 }, dark: { intensity: 5 } },
  // (T20) dark status text sits at L72, not the mirrored L67: at 67 caution and error missed 4.5:1 on surface-elevated
  // and 3:1 against border-default (a progress track). Light mode keeps the default offset.
  actionColors: { chroma: 0.12, baseLightness: 52, darkFgLightnessOffset: -20 },
  elevation: { source: 'accent', chroma: 0, lightOpacity: 8, darkOpacity: 30 },
  tokenMapping: {
    light: { 'text-emphasis': 1, 'text-default': 3, 'text-muted': 8, 'text-faint': 11, 'border-subtle': 18, 'border-default': 16, 'border-emphasis': 14, primary: 1, accent: 3 },
    // the link and the focus ring take a lighter cobalt on the dark canvas
    dark: { 'text-emphasis': 25, 'text-default': 23, 'text-muted': 15, 'text-faint': 14, 'text-link': 'primary-300', 'border-focus': 'primary-400', primary: 25, accent: 23 },
  },
  textOn: { light: { primary: 25, accent: 25 }, dark: { primary: 1, accent: 1 } },
};

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
  // after the seven, so no existing theme changes index
  cobaltMono,
];
