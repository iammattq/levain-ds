/**
 * Base themes definitions for V2 theme system
 * Simplified input format with OKLCH-based generation
 */
import type { ThemeInputV2 } from '../generator/types';

/** TH1's cobalt: the one colour in the Cobalt themes. */
const COBALT = '#2451C9';
/** The Cobalt themes' text and border stops (a squeezed light half: see the themes below). On the dark canvas the
 *  link and the focus ring take a lighter cobalt. */
const TEXT = {
  light: { 'text-emphasis': 1, 'text-default': 3, 'text-muted': 8, 'text-faint': 11, 'border-subtle': 18, 'border-default': 16, 'border-emphasis': 14 },
  dark: { 'text-emphasis': 25, 'text-default': 23, 'text-muted': 15, 'text-faint': 14, 'text-link': 'primary-300', 'border-focus': 'primary-400' },
} as const;
/** Black-and-white fills, as the AI chat apps draw their buttons: near-black on light, near-white on dark, the text on
 *  them flipped. The accent (the selected tab, status labels) is the text colour itself, so nothing else is coloured. */
const MONO = {
  fills: { light: { primary: 1, accent: 3 }, dark: { primary: 25, accent: 23 } },
  textOn: { light: { primary: 25, accent: 25 }, dark: { primary: 1, accent: 1 } },
} as const;

interface CobaltOption {
  /** How much cobalt the greys carry (0 pure greys; base chroma tint/1000) and how far it reaches toward black and
   *  white (lower keeps more of it at the ends). */
  tint: number;
  chromaFalloff: number;
  /** Black-and-white buttons and accent (MONO), or cobalt ones. */
  mono: boolean;
  /** The shadows' cobalt (0 grey) and strength: what lifted cards and dialogs cast. */
  shadowChroma: number;
  lightOpacity: number;
  darkOpacity: number;
}
/** Three looks a phone user tells apart at a glance, in dark mode and light (the designer, TH1):
 *  Mono: pure black and white; cobalt only on links and focus rings.
 *  Night: black-and-white buttons on cobalt surfaces: a navy ladder on dark, a cool blue-white on light.
 *  Accent: Mono's greys, cobalt carrying meaning: the primary button, the accent (status labels, the selected tab,
 *  the rule on cards) and the lifted cards' shadows. */
const COBALT_OPTIONS: Record<string, CobaltOption> = {
  'Cobalt Mono': { tint: 0, chromaFalloff: 1, mono: true, shadowChroma: 0, lightOpacity: 8, darkOpacity: 30 },
  'Cobalt Night': { tint: 60, chromaFalloff: 0.3, mono: true, shadowChroma: 40, lightOpacity: 10, darkOpacity: 40 },
  'Cobalt Accent': { tint: 0, chromaFalloff: 1, mono: false, shadowChroma: 100, lightOpacity: 16, darkOpacity: 45 },
};
function cobalt(name: string): ThemeInputV2 {
  const o = COBALT_OPTIONS[name]!;
  return {
    name,
    primary: COBALT,
    accent: COBALT,
    surfaces: { tint: o.tint, tintColor: COBALT, chromaFalloff: o.chromaFalloff, floor: 6, ceiling: 100, darkCurve: 0.6, lightCurve: 0.2 },
    states: { light: { intensity: 4 }, dark: { intensity: 5 } },
    actionColors: { chroma: 0.12, baseLightness: 52 },
    elevation: { source: 'accent', chroma: o.shadowChroma, lightOpacity: o.lightOpacity, darkOpacity: o.darkOpacity },
    tokenMapping: o.mono
      ? { light: { ...TEXT.light, ...MONO.fills.light }, dark: { ...TEXT.dark, ...MONO.fills.dark } }
      // the accent as text on the dark canvas takes a lighter cobalt; on it, dark text
      : { light: { ...TEXT.light }, dark: { ...TEXT.dark, accent: 'accent-300' } },
    textOn: o.mono ? MONO.textOn : { light: { primary: 25, accent: 25 }, dark: { primary: 25, accent: 1 } },
  };
}

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
  // ── Cobalt (TH1): black and white with cobalt, the restraint of the AI chat apps. Three looks for the designer to
  // pick (see COBALT_OPTIONS); they share the greys' shape and the text and border mapping. The light canvas sits
  // near white (#f2f2f2, cards and dialogs whiter still), so the light half of the ramp is squeezed toward 100 (lightCurve 0.2); dark mode's text then takes the stops that stay distinct.
  ...Object.keys(COBALT_OPTIONS).map(cobalt),
];
