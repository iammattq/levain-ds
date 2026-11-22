import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  isValidHexColor,
} from '../color';

describe('Color Conversion Utilities', () => {
  describe('hexToRgb', () => {
    test('converts 6-char hex to RGB', () => {
      expect(hexToRgb('#FF5500')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('converts 3-char shorthand hex to RGB', () => {
      expect(hexToRgb('#F50')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('returns null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
    });

    test('handles lowercase hex', () => {
      expect(hexToRgb('#ff5500')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('handles hex without # prefix', () => {
      expect(hexToRgb('FF5500')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('handles 8-char hex with alpha (ignores alpha)', () => {
      expect(hexToRgb('#FF5500FF')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('handles 4-char hex with alpha (ignores alpha)', () => {
      expect(hexToRgb('#F50F')).toEqual({ r: 255, g: 85, b: 0 });
    });

    test('returns null for empty string', () => {
      expect(hexToRgb('')).toBeNull();
    });

    test('returns null for partial hex', () => {
      expect(hexToRgb('#FF')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    test('converts RGB to uppercase 6-char hex', () => {
      expect(rgbToHex({ r: 255, g: 85, b: 0 })).toBe('#FF5500');
    });

    test('handles black', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    });

    test('handles white', () => {
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    });

    test('pads single-digit hex values', () => {
      expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
    });

    test('clamps values above 255', () => {
      expect(rgbToHex({ r: 300, g: 85, b: 0 })).toBe('#FF5500');
    });

    test('clamps negative values to 0', () => {
      expect(rgbToHex({ r: -10, g: 85, b: 0 })).toBe('#005500');
    });

    test('rounds decimal values', () => {
      expect(rgbToHex({ r: 255.6, g: 84.5, b: 0.4 })).toBe('#FF5500');
    });
  });

  describe('rgbToHsv', () => {
    test('converts pure red', () => {
      expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({
        h: 0,
        s: 100,
        v: 100,
      });
    });

    test('converts pure green', () => {
      expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({
        h: 120,
        s: 100,
        v: 100,
      });
    });

    test('converts pure blue', () => {
      expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({
        h: 240,
        s: 100,
        v: 100,
      });
    });

    test('converts black (edge case)', () => {
      expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
    });

    test('converts white (edge case)', () => {
      expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({
        h: 0,
        s: 0,
        v: 100,
      });
    });

    test('converts gray (no saturation)', () => {
      expect(rgbToHsv({ r: 128, g: 128, b: 128 })).toEqual({
        h: 0,
        s: 0,
        v: 50,
      });
    });

    test('converts yellow', () => {
      expect(rgbToHsv({ r: 255, g: 255, b: 0 })).toEqual({
        h: 60,
        s: 100,
        v: 100,
      });
    });

    test('converts cyan', () => {
      expect(rgbToHsv({ r: 0, g: 255, b: 255 })).toEqual({
        h: 180,
        s: 100,
        v: 100,
      });
    });

    test('converts magenta', () => {
      expect(rgbToHsv({ r: 255, g: 0, b: 255 })).toEqual({
        h: 300,
        s: 100,
        v: 100,
      });
    });
  });

  describe('hsvToRgb', () => {
    test('converts pure red', () => {
      expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({
        r: 255,
        g: 0,
        b: 0,
      });
    });

    test('converts pure green', () => {
      expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
    });

    test('converts pure blue', () => {
      expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
    });

    test('h=360 same as h=0 (edge case)', () => {
      expect(hsvToRgb({ h: 360, s: 100, v: 100 })).toEqual({
        r: 255,
        g: 0,
        b: 0,
      });
    });

    test('converts black', () => {
      expect(hsvToRgb({ h: 0, s: 0, v: 0 })).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('converts white', () => {
      expect(hsvToRgb({ h: 0, s: 0, v: 100 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
    });

    test('converts gray (zero saturation)', () => {
      expect(hsvToRgb({ h: 180, s: 0, v: 50 })).toEqual({
        r: 128,
        g: 128,
        b: 128,
      });
    });

    test('converts yellow', () => {
      expect(hsvToRgb({ h: 60, s: 100, v: 100 })).toEqual({
        r: 255,
        g: 255,
        b: 0,
      });
    });

    test('converts cyan', () => {
      expect(hsvToRgb({ h: 180, s: 100, v: 100 })).toEqual({
        r: 0,
        g: 255,
        b: 255,
      });
    });

    test('converts magenta', () => {
      expect(hsvToRgb({ h: 300, s: 100, v: 100 })).toEqual({
        r: 255,
        g: 0,
        b: 255,
      });
    });

    test('converts orange (between red and yellow)', () => {
      expect(hsvToRgb({ h: 30, s: 100, v: 100 })).toEqual({
        r: 255,
        g: 128,
        b: 0,
      });
    });
  });

  describe('isValidHexColor', () => {
    test('returns true for valid 6-char hex', () => {
      expect(isValidHexColor('#FF5500')).toBe(true);
    });

    test('returns true for valid 3-char hex', () => {
      expect(isValidHexColor('#F50')).toBe(true);
    });

    test('returns true for lowercase hex', () => {
      expect(isValidHexColor('#ff5500')).toBe(true);
    });

    test('returns true for 8-char hex with alpha', () => {
      expect(isValidHexColor('#FF5500FF')).toBe(true);
    });

    test('returns true for 4-char hex with alpha', () => {
      expect(isValidHexColor('#F50F')).toBe(true);
    });

    test('returns false for invalid string', () => {
      expect(isValidHexColor('invalid')).toBe(false);
    });

    test('returns false for hex without #', () => {
      expect(isValidHexColor('FF5500')).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(isValidHexColor('')).toBe(false);
    });

    test('returns false for partial hex', () => {
      expect(isValidHexColor('#FF')).toBe(false);
    });

    test('returns false for 5-char hex', () => {
      expect(isValidHexColor('#FF550')).toBe(false);
    });

    test('returns false for hex with invalid characters', () => {
      expect(isValidHexColor('#GGGGGG')).toBe(false);
    });
  });

  describe('Round-trip conversions', () => {
    test('RGB -> HSV -> RGB preserves color', () => {
      const original = { r: 128, g: 64, b: 192 };
      const hsv = rgbToHsv(original);
      const result = hsvToRgb(hsv);
      // Allow small rounding differences
      expect(result.r).toBeCloseTo(original.r, -1);
      expect(result.g).toBeCloseTo(original.g, -1);
      expect(result.b).toBeCloseTo(original.b, -1);
    });

    test('Hex -> RGB -> Hex preserves color', () => {
      const original = '#3A7F5C';
      const rgb = hexToRgb(original);
      expect(rgb).not.toBeNull();
      const result = rgbToHex(rgb!);
      expect(result).toBe(original);
    });

    test('Full round-trip: Hex -> RGB -> HSV -> RGB -> Hex', () => {
      const original = '#FF5500';
      const rgb1 = hexToRgb(original);
      expect(rgb1).not.toBeNull();
      const hsv = rgbToHsv(rgb1!);
      const rgb2 = hsvToRgb(hsv);
      const result = rgbToHex(rgb2);
      expect(result).toBe(original);
    });
  });
});
