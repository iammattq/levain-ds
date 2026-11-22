/**
 * Color conversion utilities for internal use by color-related components.
 * Not exported from the package - used internally by ColorPickerPanel.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

/**
 * Validates if a string is a valid hex color (3, 4, 6, or 8 characters after #).
 * Supports: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

/**
 * Converts a hex color string to RGB values.
 * Supports 3-char (#RGB) and 6-char (#RRGGBB) formats.
 * Returns null for invalid hex colors.
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // Validate length (3, 4, 6, or 8 chars - we only process RGB, ignore alpha)
  if (!/^[0-9A-Fa-f]{3,4}$|^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{8}$/.test(cleanHex)) {
    return null;
  }

  let r: number, g: number, b: number;

  if (cleanHex.length === 3 || cleanHex.length === 4) {
    // 3-char shorthand (#RGB or #RGBA): expand each char
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    // 6-char or 8-char format (#RRGGBB or #RRGGBBAA): take first 6 chars
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  }

  return { r, g, b };
}

/**
 * Converts RGB values to a hex color string.
 * Always returns uppercase 6-char format with # prefix.
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number): string => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts RGB values to HSV.
 * RGB values expected in 0-255 range.
 * Returns HSV with h in 0-360, s and v in 0-100.
 */
export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Value
  const v = max * 100;

  // Saturation
  const s = max === 0 ? 0 : (delta / max) * 100;

  // Hue
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
}

/**
 * Converts HSV values to RGB.
 * HSV expected with h in 0-360, s and v in 0-100.
 * Returns RGB values in 0-255 range.
 */
export function hsvToRgb(hsv: HSV): RGB {
  // Normalize h to 0-360 range (handles h=360 same as h=0)
  let h = hsv.h % 360;
  if (h < 0) h += 360;

  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}
