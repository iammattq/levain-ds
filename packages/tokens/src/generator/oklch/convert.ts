import { oklch, formatHex } from 'culori';
import type { OklchColor } from '../types';

/**
 * Convert hex color to OKLCH representation
 * @param hex - Hex color string (e.g., '#5860fe')
 * @returns OKLCH color with lightness 0-100
 */
export function hexToOklch(hex: string): OklchColor {
  const color = oklch(hex);
  if (!color) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    l: (color.l ?? 0) * 100,
    c: color.c ?? 0,
    h: color.h ?? 0,
  };
}

/**
 * Convert OKLCH color to hex string
 * @param color - OKLCH color with lightness 0-100
 * @returns Hex color string
 */
export function oklchToHex(color: OklchColor): string {
  const result = formatHex({
    mode: 'oklch',
    l: color.l / 100,
    c: color.c,
    h: color.h,
  });
  if (!result) {
    throw new Error(`Invalid OKLCH color: ${JSON.stringify(color)}`);
  }
  return result;
}

/**
 * Create OKLCH color from components
 */
export function createOklch(l: number, c: number, h: number): OklchColor {
  return { l, c, h };
}
