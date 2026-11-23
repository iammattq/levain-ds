import type { ActionColorParams, ActionColorSet } from '../types';
import { oklchToHex } from './convert';

/**
 * Generate action color set (base, foreground, background variants)
 *
 * Generation formula:
 * - Light mode: fg is darker (+ fgOffset), bg is lighter (+ bgOffset)
 * - Dark mode: offsets inverted (fg is lighter, bg is darker)
 * - Background uses 0.5x chroma (less saturated)
 *
 * @param params - Action color parameters
 * @param mode - 'light' or 'dark'
 */
export function generateActionColor(
  params: ActionColorParams,
  mode: 'light' | 'dark'
): ActionColorSet {
  const hue = params.hue + params.hueAdjust;
  const isLight = mode === 'light';

  const base = oklchToHex({
    l: params.baseLightness,
    c: params.chroma,
    h: hue,
  });

  const fg = oklchToHex({
    l: isLight
      ? params.baseLightness + (params.lightFgLightnessOffset ?? params.fgLightnessOffset)
      : params.baseLightness - (params.darkFgLightnessOffset ?? params.fgLightnessOffset),
    c: params.chroma,
    h: hue,
  });

  const bg = oklchToHex({
    l: isLight
      ? params.baseLightness + params.bgLightnessOffset
      : params.baseLightness - params.bgLightnessOffset,
    c: params.chroma * 0.5, // less saturated for backgrounds
    h: hue,
  });

  return { base, fg, bg };
}

/**
 * Action color types
 */
export const ACTION_TYPES = ['success', 'error', 'caution', 'info'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
