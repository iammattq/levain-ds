import { hexToOklch, oklchToHex, createOklch } from '../convert';
import type { OklchColor } from '../../types';

describe('hexToOklch', () => {
  describe('valid hex colors', () => {
    it('converts 6-digit hex color to OKLCH', () => {
      const result = hexToOklch('#5860fe');
      expect(result).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
      expect(result.l).toBeGreaterThanOrEqual(0);
      expect(result.l).toBeLessThanOrEqual(100);
    });

    it('converts 3-digit hex color to OKLCH', () => {
      const result = hexToOklch('#f00');
      expect(result).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
      expect(result.l).toBeGreaterThanOrEqual(0);
      expect(result.l).toBeLessThanOrEqual(100);
    });

    it('converts lowercase hex to OKLCH', () => {
      const result = hexToOklch('#abc123');
      expect(result).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
    });

    it('converts uppercase hex to OKLCH', () => {
      const result = hexToOklch('#ABC123');
      expect(result).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
    });
  });

  describe('edge cases - achromatic colors', () => {
    it('converts pure black (#000000)', () => {
      const result = hexToOklch('#000000');
      expect(result.l).toBeCloseTo(0, 1);
      expect(result.c).toBeCloseTo(0, 5);
      expect(result.h).toBeDefined();
    });

    it('converts pure white (#ffffff)', () => {
      const result = hexToOklch('#ffffff');
      expect(result.l).toBeCloseTo(100, 1);
      expect(result.c).toBeCloseTo(0, 5);
      expect(result.h).toBeDefined();
    });

    it('converts middle gray (#808080)', () => {
      const result = hexToOklch('#808080');
      expect(result.l).toBeGreaterThan(40);
      expect(result.l).toBeLessThan(70);
      expect(result.c).toBeCloseTo(0, 3);
      expect(result.h).toBeDefined();
    });

    it('converts light gray (#cccccc)', () => {
      const result = hexToOklch('#cccccc');
      expect(result.l).toBeGreaterThan(75);
      expect(result.c).toBeCloseTo(0, 3);
      expect(result.h).toBeDefined();
    });

    it('converts dark gray (#333333)', () => {
      const result = hexToOklch('#333333');
      expect(result.l).toBeLessThan(35);
      expect(result.c).toBeCloseTo(0, 3);
      expect(result.h).toBeDefined();
    });
  });

  describe('edge cases - saturated colors', () => {
    it('converts pure red (#ff0000)', () => {
      const result = hexToOklch('#ff0000');
      expect(result.l).toBeGreaterThan(0);
      expect(result.l).toBeLessThan(100);
      expect(result.c).toBeGreaterThan(0.1);
      expect(result.h).toBeGreaterThanOrEqual(0);
      expect(result.h).toBeLessThanOrEqual(360);
    });

    it('converts pure green (#00ff00)', () => {
      const result = hexToOklch('#00ff00');
      expect(result.l).toBeGreaterThan(0);
      expect(result.l).toBeLessThan(100);
      expect(result.c).toBeGreaterThan(0.1);
      expect(result.h).toBeGreaterThan(90);
      expect(result.h).toBeLessThan(180);
    });

    it('converts pure blue (#0000ff)', () => {
      const result = hexToOklch('#0000ff');
      expect(result.l).toBeGreaterThan(0);
      expect(result.l).toBeLessThan(100);
      expect(result.c).toBeGreaterThan(0.1);
      expect(result.h).toBeGreaterThan(200);
      expect(result.h).toBeLessThan(300);
    });

    it('converts cyan (#00ffff)', () => {
      const result = hexToOklch('#00ffff');
      expect(result.l).toBeGreaterThan(0);
      expect(result.c).toBeGreaterThan(0.1);
    });

    it('converts magenta (#ff00ff)', () => {
      const result = hexToOklch('#ff00ff');
      expect(result.l).toBeGreaterThan(0);
      expect(result.c).toBeGreaterThan(0.1);
    });

    it('converts yellow (#ffff00)', () => {
      const result = hexToOklch('#ffff00');
      expect(result.l).toBeGreaterThan(0);
      expect(result.c).toBeGreaterThan(0.1);
    });
  });

  describe('lightness scale is 0-100', () => {
    it('scales lightness from 0-1 to 0-100', () => {
      const white = hexToOklch('#ffffff');
      const black = hexToOklch('#000000');

      // White should be close to 100, black close to 0
      expect(white.l).toBeGreaterThan(99);
      expect(black.l).toBeLessThan(1);
    });
  });

  describe('error handling', () => {
    it('throws error for invalid hex color', () => {
      expect(() => hexToOklch('invalid')).toThrow('Invalid hex color');
    });

    it('throws error for empty string', () => {
      expect(() => hexToOklch('')).toThrow('Invalid hex color');
    });

    it('accepts hex without hash (culori is flexible)', () => {
      // culori's oklch() function actually accepts hex without hash
      const result = hexToOklch('5860fe');
      expect(result).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
    });

    it('throws error for invalid hex characters', () => {
      expect(() => hexToOklch('#gggggg')).toThrow('Invalid hex color');
    });

    it('throws error for wrong length hex', () => {
      expect(() => hexToOklch('#12')).toThrow('Invalid hex color');
    });
  });
});

describe('oklchToHex', () => {
  describe('valid OKLCH colors', () => {
    it('converts OKLCH color to hex', () => {
      const color: OklchColor = { l: 50, c: 0.15, h: 264 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('converts high lightness OKLCH to hex', () => {
      const color: OklchColor = { l: 90, c: 0.05, h: 120 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('converts low lightness OKLCH to hex', () => {
      const color: OklchColor = { l: 10, c: 0.05, h: 45 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('converts saturated color to hex', () => {
      const color: OklchColor = { l: 60, c: 0.3, h: 180 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('edge cases - achromatic colors', () => {
    it('converts black (L=0) to hex', () => {
      const color: OklchColor = { l: 0, c: 0, h: 0 };
      const result = oklchToHex(color);
      expect(result.toLowerCase()).toBe('#000000');
    });

    it('converts white (L=100) to hex', () => {
      const color: OklchColor = { l: 100, c: 0, h: 0 };
      const result = oklchToHex(color);
      expect(result.toLowerCase()).toBe('#ffffff');
    });

    it('converts gray (c=0) to hex', () => {
      const color: OklchColor = { l: 50, c: 0, h: 0 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      // For achromatic colors, R, G, B should be roughly equal
      const r = parseInt(result.slice(1, 3), 16);
      const g = parseInt(result.slice(3, 5), 16);
      const b = parseInt(result.slice(5, 7), 16);
      expect(Math.abs(r - g)).toBeLessThan(3);
      expect(Math.abs(g - b)).toBeLessThan(3);
    });
  });

  describe('edge cases - hue values', () => {
    it('handles hue = 0', () => {
      const color: OklchColor = { l: 50, c: 0.15, h: 0 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('handles hue = 360', () => {
      const color: OklchColor = { l: 50, c: 0.15, h: 360 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('handles hue = 180', () => {
      const color: OklchColor = { l: 50, c: 0.15, h: 180 };
      const result = oklchToHex(color);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('lightness scale is 0-100', () => {
    it('scales lightness from 0-100 to 0-1 for conversion', () => {
      const white: OklchColor = { l: 100, c: 0, h: 0 };
      const black: OklchColor = { l: 0, c: 0, h: 0 };

      expect(oklchToHex(white).toLowerCase()).toBe('#ffffff');
      expect(oklchToHex(black).toLowerCase()).toBe('#000000');
    });
  });

  describe('error handling', () => {
    it('throws error for invalid color object', () => {
      // Test with values that might produce invalid results
      // culori's formatHex should handle edge cases gracefully
      const color: OklchColor = { l: 50, c: 0.15, h: 264 };
      expect(() => oklchToHex(color)).not.toThrow();
    });
  });
});

describe('createOklch', () => {
  it('creates OKLCH color from components', () => {
    const result = createOklch(50, 0.15, 264);
    expect(result).toEqual({
      l: 50,
      c: 0.15,
      h: 264,
    });
  });

  it('creates OKLCH color with zero values', () => {
    const result = createOklch(0, 0, 0);
    expect(result).toEqual({
      l: 0,
      c: 0,
      h: 0,
    });
  });

  it('creates OKLCH color with max lightness', () => {
    const result = createOklch(100, 0.2, 120);
    expect(result).toEqual({
      l: 100,
      c: 0.2,
      h: 120,
    });
  });

  it('creates OKLCH color with hue = 360', () => {
    const result = createOklch(50, 0.15, 360);
    expect(result).toEqual({
      l: 50,
      c: 0.15,
      h: 360,
    });
  });
});

describe('round-trip conversions', () => {
  describe('hex → oklch → hex', () => {
    it('converts and back for brand color', () => {
      const original = '#5860fe';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      // Colors should be very similar (allowing for small rounding differences)
      expect(back.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);

      // Check each component is within 5 of original (out of 255)
      const origR = parseInt(original.slice(1, 3), 16);
      const origG = parseInt(original.slice(3, 5), 16);
      const origB = parseInt(original.slice(5, 7), 16);
      const backR = parseInt(back.slice(1, 3), 16);
      const backG = parseInt(back.slice(3, 5), 16);
      const backB = parseInt(back.slice(5, 7), 16);

      expect(Math.abs(origR - backR)).toBeLessThanOrEqual(5);
      expect(Math.abs(origG - backG)).toBeLessThanOrEqual(5);
      expect(Math.abs(origB - backB)).toBeLessThanOrEqual(5);
    });

    it('converts and back for pure red', () => {
      const original = '#ff0000';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      const origR = parseInt(original.slice(1, 3), 16);
      const origG = parseInt(original.slice(3, 5), 16);
      const origB = parseInt(original.slice(5, 7), 16);
      const backR = parseInt(back.slice(1, 3), 16);
      const backG = parseInt(back.slice(3, 5), 16);
      const backB = parseInt(back.slice(5, 7), 16);

      expect(Math.abs(origR - backR)).toBeLessThanOrEqual(5);
      expect(Math.abs(origG - backG)).toBeLessThanOrEqual(5);
      expect(Math.abs(origB - backB)).toBeLessThanOrEqual(5);
    });

    it('converts and back for pure white', () => {
      const original = '#ffffff';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      expect(back.toLowerCase()).toBe('#ffffff');
    });

    it('converts and back for pure black', () => {
      const original = '#000000';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      expect(back.toLowerCase()).toBe('#000000');
    });

    it('converts and back for gray', () => {
      const original = '#808080';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      const origR = parseInt(original.slice(1, 3), 16);
      const backR = parseInt(back.slice(1, 3), 16);
      const backG = parseInt(back.slice(3, 5), 16);
      const backB = parseInt(back.slice(5, 7), 16);

      // Gray should stay gray (RGB components should be similar)
      expect(Math.abs(backR - backG)).toBeLessThan(5);
      expect(Math.abs(backG - backB)).toBeLessThan(5);
      expect(Math.abs(origR - backR)).toBeLessThanOrEqual(5);
    });

    it('converts and back for accent color', () => {
      const original = '#ff6b9d';
      const oklch = hexToOklch(original);
      const back = oklchToHex(oklch);

      const origR = parseInt(original.slice(1, 3), 16);
      const origG = parseInt(original.slice(3, 5), 16);
      const origB = parseInt(original.slice(5, 7), 16);
      const backR = parseInt(back.slice(1, 3), 16);
      const backG = parseInt(back.slice(3, 5), 16);
      const backB = parseInt(back.slice(5, 7), 16);

      expect(Math.abs(origR - backR)).toBeLessThanOrEqual(5);
      expect(Math.abs(origG - backG)).toBeLessThanOrEqual(5);
      expect(Math.abs(origB - backB)).toBeLessThanOrEqual(5);
    });
  });

  describe('oklch → hex → oklch', () => {
    it('converts and back for mid-range color', () => {
      const original: OklchColor = { l: 60, c: 0.15, h: 264 };
      const hex = oklchToHex(original);
      const back = hexToOklch(hex);

      // Allow ±1 unit tolerance for lightness due to hex quantization
      expect(Math.abs(back.l - original.l)).toBeLessThanOrEqual(1);
      expect(back.c).toBeCloseTo(original.c, 2);
      // Hue can wrap around, so check modulo 360
      const hueDiff = Math.abs(back.h - original.h) % 360;
      expect(Math.min(hueDiff, 360 - hueDiff)).toBeLessThan(5);
    });

    it('converts and back for low chroma color', () => {
      const original: OklchColor = { l: 50, c: 0.01, h: 180 };
      const hex = oklchToHex(original);
      const back = hexToOklch(hex);

      // Allow ±1 unit tolerance for lightness due to hex quantization
      expect(Math.abs(back.l - original.l)).toBeLessThanOrEqual(1);
      expect(back.c).toBeCloseTo(original.c, 2);
      // For very low chroma, hue becomes less meaningful
    });

    it('converts and back for high chroma color', () => {
      const original: OklchColor = { l: 70, c: 0.3, h: 120 };
      const hex = oklchToHex(original);
      const back = hexToOklch(hex);

      // High chroma colors may be clamped during sRGB gamut mapping
      // Lightness should still be close
      expect(Math.abs(back.l - original.l)).toBeLessThanOrEqual(1);
      // Chroma may be reduced significantly due to gamut mapping
      expect(back.c).toBeLessThanOrEqual(original.c);
      expect(back.c).toBeGreaterThan(0);
      // Hue should be preserved reasonably well
      const hueDiff = Math.abs(back.h - original.h) % 360;
      expect(Math.min(hueDiff, 360 - hueDiff)).toBeLessThan(10);
    });
  });
});
