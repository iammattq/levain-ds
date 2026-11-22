import type { SemanticToken, TokenMappingValue, StateColors } from '../types';

/**
 * Apply token mapping to a surface ramp
 * Maps semantic tokens to actual hex values from the surface ramp, brand
 * ramps, or raw brand colors.
 *
 * Mapping value resolution:
 *   - number 0-25 → unified surface ramp[index]
 *   - 'primary' / 'accent' → raw picked hex (= step 500)
 *   - 'primary-{step}' / 'accent-{step}' → primaryRamp/accentRamp[stepIdx]
 *
 * @param ramp - 26-stop unified surface ramp (hex colors)
 * @param mapping - Token to ramp index or brand color mapping
 * @param primary - Picked primary brand hex
 * @param accent - Picked accent brand hex
 * @param primaryRamp - 9-stop primary brand ramp (hex colors)
 * @param accentRamp - 9-stop accent brand ramp (hex colors)
 * @returns Record of token names to hex values
 */
export function applyTokenMapping(
  ramp: string[],
  mapping: Record<SemanticToken, TokenMappingValue>,
  primary: string,
  accent: string,
  primaryRamp: string[],
  accentRamp: string[]
): Record<string, string> {
  const tokens: Record<string, string> = {};

  for (const [token, value] of Object.entries(mapping)) {
    if (value === 'primary') {
      tokens[token] = primary;
    } else if (value === 'accent') {
      tokens[token] = accent;
    } else if (typeof value === 'string') {
      // Brand ramp ref like 'primary-300' or 'accent-700'
      const dashIdx = value.indexOf('-');
      const rampName = value.slice(0, dashIdx);
      const stepStr = value.slice(dashIdx + 1);
      const stepIdx = parseInt(stepStr, 10) / 100 - 1; // 100→0, 900→8
      const sourceRamp = rampName === 'primary' ? primaryRamp : accentRamp;
      tokens[token] = sourceRamp[stepIdx];
    } else {
      tokens[token] = ramp[value];
    }
  }

  return tokens;
}

/**
 * Generate interaction state overlays
 * Uses OKLCH transparency for smooth color mixing
 *
 * Light mode: darkens (black with opacity)
 * Dark mode: lightens (white with opacity)
 *
 * Intensity controls hover (the biggest state change), with
 * increments of +2 for focus and +4 for active:
 * - hover: intensity (main feedback)
 * - focus: intensity + 2
 * - active: intensity + 4
 *
 * Example: intensity=6 → hover: 6%, focus: 8%, active: 10%
 *
 * @param intensity - Base intensity percentage (e.g., 6 for both modes)
 * @param mode - 'light' or 'dark'
 * @returns State overlay colors as OKLCH strings
 */
export function generateStateOverlays(
  intensity: number,
  mode: 'light' | 'dark'
): StateColors {
  const l = mode === 'light' ? 0 : 100;
  const hover = intensity;
  const focus = intensity + 2;
  const active = intensity + 4;
  return {
    hover: `oklch(${l}% 0 0 / ${hover}%)`,
    focus: `oklch(${l}% 0 0 / ${focus}%)`,
    active: `oklch(${l}% 0 0 / ${active}%)`,
  };
}
