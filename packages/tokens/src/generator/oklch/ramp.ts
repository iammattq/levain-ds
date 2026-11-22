import type {
  RampParams,
  ResolvedBrandRampParams,
  UnifiedRampParams,
} from '../types';
import { hexToOklch, oklchToHex } from './convert';

/**
 * Calculate lightness for a given ramp index using power curve
 * @param index - Ramp index 0-10 (working range)
 * @param start - Starting lightness (ceiling or floor)
 * @param end - Ending lightness (50 = midpoint)
 * @param curve - Power curve exponent
 */
export function calculateLightness(
  index: number,
  start: number,
  end: number,
  curve: number
): number {
  // Normalize index to 0-1 (11 steps: 0-10)
  const t = index / 10;

  // Apply power curve
  const curved = Math.pow(t, curve);

  // Interpolate between start and end
  return start + (end - start) * curved;
}

/**
 * Calculate chroma with falloff near extremes
 * Prevents over-saturated near-white/black tints
 * @param lightness - Current lightness value (0-100)
 * @param baseTint - Base tint percentage (0-10)
 * @param chromaFalloff - Falloff exponent (0.5-2.0)
 */
export function calculateChroma(
  lightness: number,
  baseTint: number,
  chromaFalloff: number
): number {
  // Distance from extremes (0 or 100)
  const distFromExtreme = Math.min(lightness, 100 - lightness);

  // Falloff factor: 1 at L:50, approaches 0 at extremes
  const falloff = Math.pow(distFromExtreme / 50, chromaFalloff);

  // Base chroma from tint percentage (scaled to OKLCH range)
  const baseChroma = (baseTint / 100) * 0.1;

  return baseChroma * falloff;
}

/**
 * Generate 14-stop surface ramp for a mode
 *
 * Structure:
 * - Index 0: Pure extreme (white in light, black in dark) - untinted
 * - Index 1-11: Working range, curve-adjusted, all tinted
 * - Index 12: Flip surface from opposite half (for contrast panels)
 * - Index 13: Opposite extreme (black in light, white in dark) - untinted
 *
 * @param params - Ramp generation parameters
 * @param mode - 'light' or 'dark'
 */
export function generateSurfaceRamp(
  params: RampParams,
  mode: 'light' | 'dark'
): string[] {
  const ramp: string[] = [];
  const isLight = mode === 'light';

  const start = isLight ? params.ceiling : params.floor;
  const end = 50; // midpoint

  // Index 0: pure extreme (white or black, untinted)
  ramp[0] = oklchToHex({ l: isLight ? 100 : 0, c: 0, h: 0 });

  // Index 1-11: working range (tinted)
  for (let i = 0; i <= 10; i++) {
    const l = calculateLightness(i, start, end, params.curve);
    const c = calculateChroma(l, params.tint, params.chromaFalloff);
    const h = params.primaryHue + params.hueShift;

    ramp[i + 1] = oklchToHex({ l, c, h });
  }

  // Index 12: flip surface (from opposite half)
  const flipL = isLight ? 15 : 85;
  const flipC = calculateChroma(flipL, params.tint, params.chromaFalloff);
  ramp[12] = oklchToHex({
    l: flipL,
    c: flipC,
    h: params.primaryHue + params.hueShift,
  });

  // Index 13: opposite extreme (black or white, untinted)
  ramp[13] = oklchToHex({ l: isLight ? 0 : 100, c: 0, h: 0 });

  return ramp;
}

/**
 * Generate a unified 26-stop ramp covering the full lightness range
 *
 * Structure:
 * - Indices 0-12: Dark half (floor → midpoint), controlled by darkCurve
 * - Indices 13-25: Light half (midpoint → ceiling), controlled by lightCurve
 *
 * Both modes use the same ramp - token mappings handle the light/dark distinction
 * by selecting appropriate indices for surfaces and text.
 *
 * @param params - Unified ramp parameters
 */
export function generateUnifiedRamp(params: UnifiedRampParams): string[] {
  const ramp: string[] = [];
  const midpoint = 50;

  // Dark half: indices 0-12 (floor → midpoint)
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const curved = Math.pow(t, params.darkCurve);
    const l = params.floor + (midpoint - params.floor) * curved;
    const c = calculateChroma(l, params.tint, params.chromaFalloff);
    ramp[i] = oklchToHex({ l, c, h: params.primaryHue });
  }

  // Light half: indices 13-25 (midpoint → ceiling)
  for (let i = 13; i <= 25; i++) {
    const t = (i - 13) / 12;
    const curved = Math.pow(t, params.lightCurve);
    const l = midpoint + (params.ceiling - midpoint) * curved;
    const c = calculateChroma(l, params.tint, params.chromaFalloff);
    ramp[i] = oklchToHex({ l, c, h: params.primaryHue });
  }

  return ramp;
}

/**
 * Generate a 9-stop brand ramp anchored on a picked hex color.
 *
 * Indices map to Tailwind-style steps:
 *   0 → 100 (lightest)
 *   1 → 200
 *   2 → 300
 *   3 → 400
 *   4 → 500 (anchor — exactly the picked color)
 *   5 → 600
 *   6 → 700
 *   7 → 800
 *   8 → 900 (darkest)
 *
 * Step 500 is the picked color exactly. Light steps interpolate L from
 * `ceiling` down to picked.L using `lightCurve`; dark steps interpolate from
 * picked.L down to `floor` using `darkCurve`. Chroma is anchored at picked.C
 * at step 500 and falls off toward both extremes via `chromaFalloff` (higher
 * = more aggressive falloff).
 *
 * If `ceiling <= picked.L` or `floor >= picked.L`, the corresponding side
 * collapses (steps repeat the picked color rather than going negative).
 */
export function generateBrandRamp(
  pickedHex: string,
  params: ResolvedBrandRampParams
): string[] {
  const picked = hexToOklch(pickedHex);
  const ramp: string[] = new Array(9);

  // Step 500 anchored to picked color
  ramp[4] = pickedHex;

  // Chroma falloff is purely step-distance-based so that it stays predictable
  // regardless of where picked.L sits within [floor, ceiling].
  //
  // Distance is normalized over an extended range (denominator 5, not 4) so
  // step 100/900 sit at distFromMid=0.8 rather than 1.0. Without this,
  // (1 - 1)^chromaFalloff = 0 collapses the extremes to neutral gray. With
  // it, primary-100 and primary-900 still read as branded — comparable to
  // Tailwind's color-50/950, where the ends retain visible hue.
  const chromaAt = (stepIdx: number): number => {
    const distFromMid = Math.abs(stepIdx - 4) / 5; // 0 at 500, 0.8 at 100/900
    const falloff = Math.pow(1 - distFromMid, params.chromaFalloff);
    return picked.c * falloff;
  };

  // Light half: indices 0-3 (steps 100-400)
  // Range: ceiling → picked.L
  const lightRange = Math.max(params.ceiling - picked.l, 0);
  for (let i = 0; i < 4; i++) {
    const t = (4 - i) / 4; // i=0 → 1 (ceiling), i=3 → 0.25
    const curved = Math.pow(t, params.lightCurve);
    const l = picked.l + lightRange * curved;
    ramp[i] = oklchToHex({ l, c: chromaAt(i), h: picked.h });
  }

  // Dark half: indices 5-8 (steps 600-900)
  // Range: picked.L → floor
  const darkRange = Math.max(picked.l - params.floor, 0);
  for (let i = 5; i <= 8; i++) {
    const t = (i - 4) / 4; // i=5 → 0.25, i=8 → 1 (floor)
    const curved = Math.pow(t, params.darkCurve);
    const l = picked.l - darkRange * curved;
    ramp[i] = oklchToHex({ l, c: chromaAt(i), h: picked.h });
  }

  return ramp;
}
