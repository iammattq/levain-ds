import type { SpectrumColorParams } from '../types';
import { oklchToHex } from './convert';

/**
 * Generate one spectrum colour.
 *
 * These are decorative stops, not semantics: nothing means "cool" the way
 * `error` means error. They exist so a theme has a palette wide enough to
 * interpolate across — the block grid reads them as a colour wheel — while
 * still sitting tonally with the theme's brand colours.
 *
 * Lightness shifts by mode. Action colours hold one lightness for both, which
 * is right for a badge on a card; a decorative wash needs to lift on a dark
 * ground and settle on a light one, or half the palette disappears into it.
 */
export function generateSpectrumColor(
  params: SpectrumColorParams,
  mode: 'light' | 'dark'
): string {
  // Turn the whole triad to face the theme rather than pulling each stop
  // toward the primary independently — pulling them individually collapses the
  // spread, which is the one thing these stops exist to provide. Rotating them
  // together keeps the spacing and lets a sage theme and a mulberry one carry
  // visibly different spectra.
  const turn = shortestTurn(SPECTRUM_ANCHOR_HUE, params.primaryHue);
  const rotated = params.hue + params.hueAdjust + turn * params.themeAffinity;
  const hue = ((rotated % 360) + 360) % 360;
  const lightness =
    mode === 'dark'
      ? params.baseLightness + params.darkLightnessShift
      : params.baseLightness;

  return oklchToHex({
    l: Math.min(Math.max(lightness, 0), 100),
    c: params.chroma,
    h: hue,
  });
}

/**
 * Hue the default stops are described against.
 *
 * The triad is rotated by the angle from here to the theme's primary, scaled
 * by `themeAffinity`, so the defaults read as "cool, warm, vivid" for a theme
 * whose primary already sits near this hue.
 */
export const SPECTRUM_ANCHOR_HUE = 225;

/** Signed shortest angle from one hue to another, in degrees. */
function shortestTurn(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * Spectrum stop names.
 *
 * Three stops plus the theme's own primary and accent give five points around
 * the wheel, which is enough to read as a spectrum rather than as a ramp.
 */
export const SPECTRUM_TYPES = ['cool', 'warm', 'vivid'] as const;
export type SpectrumType = (typeof SPECTRUM_TYPES)[number];
