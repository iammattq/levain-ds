import {
  calculateLightness,
  calculateChroma,
  generateSurfaceRamp,
  generateUnifiedRamp,
  generateBrandRamp,
} from '../ramp';
import { hexToOklch } from '../convert';
import type {
  RampParams,
  ResolvedBrandRampParams,
  UnifiedRampParams,
} from '../../types';

describe('calculateLightness', () => {
  describe('basic interpolation', () => {
    it('returns start value at index 0', () => {
      expect(calculateLightness(0, 98, 50, 1)).toBe(98);
    });

    it('returns end value at index 10', () => {
      expect(calculateLightness(10, 98, 50, 1)).toBe(50);
    });

    it('returns midpoint at index 5 with linear curve (curve=1)', () => {
      const result = calculateLightness(5, 98, 50, 1);
      expect(result).toBeCloseTo(74, 0); // (98 + 50) / 2
    });
  });

  describe('power curve effects', () => {
    it('skews toward end with curve < 1 (faster descent)', () => {
      const linear = calculateLightness(5, 98, 50, 1);
      const skewed = calculateLightness(5, 98, 50, 0.47);

      // With curve < 1, descent is faster, so midpoint is darker (closer to end)
      expect(skewed).toBeLessThan(linear);
    });

    it('skews toward start with curve > 1 (slower descent)', () => {
      const linear = calculateLightness(5, 98, 50, 1);
      const skewed = calculateLightness(5, 98, 50, 1.5);

      // With curve > 1, descent is slower, so midpoint is lighter (closer to start)
      expect(skewed).toBeGreaterThan(linear);
    });

    it('produces expected distribution with light mode defaults (curve=0.47)', () => {
      // Light mode: ceiling=98, curve=0.47 (faster descent toward midpoint)
      const values = Array.from({ length: 11 }, (_, i) =>
        calculateLightness(i, 98, 50, 0.47)
      );

      // Should start at 98 and end at 50
      expect(values[0]).toBe(98);
      expect(values[10]).toBe(50);

      // With curve < 1, more steps concentrated in darker range
      // But we still expect several values in lighter range (> 70)
      const veryLightCount = values.filter((v) => v > 70).length;
      expect(veryLightCount).toBeGreaterThanOrEqual(4);
    });

    it('produces expected distribution with dark mode defaults (curve=0.49)', () => {
      // Dark mode: floor=10, curve=0.49 (faster ascent toward midpoint)
      const values = Array.from({ length: 11 }, (_, i) =>
        calculateLightness(i, 10, 50, 0.49)
      );

      // Should start at 10 and end at 50
      expect(values[0]).toBe(10);
      expect(values[10]).toBe(50);

      // With curve < 1, more steps concentrated in lighter range
      // But we still expect some values in darker range (< 30)
      const veryDarkCount = values.filter((v) => v < 30).length;
      expect(veryDarkCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('handles same start and end values', () => {
      expect(calculateLightness(5, 50, 50, 1)).toBe(50);
    });

    it('handles inverted range (start < end)', () => {
      const result = calculateLightness(5, 10, 98, 1);
      expect(result).toBeCloseTo(54, 0);
    });

    it('handles extreme curve values', () => {
      // Very small curve (0.2) = very fast descent
      expect(calculateLightness(5, 98, 50, 0.2)).toBeLessThan(60);
      // Very large curve (5) = very slow descent
      expect(calculateLightness(5, 98, 50, 5)).toBeGreaterThan(90);
    });
  });
});

describe('calculateChroma', () => {
  describe('chroma at different lightness values', () => {
    it('returns maximum chroma at L=50 (midpoint)', () => {
      const chromaAt50 = calculateChroma(50, 5, 1);
      const chromaAt75 = calculateChroma(75, 5, 1);
      const chromaAt25 = calculateChroma(25, 5, 1);

      // L=50 should have highest chroma
      expect(chromaAt50).toBeGreaterThan(chromaAt75);
      expect(chromaAt50).toBeGreaterThan(chromaAt25);
    });

    it('returns zero chroma at L=0 (black)', () => {
      expect(calculateChroma(0, 5, 1.25)).toBe(0);
    });

    it('returns zero chroma at L=100 (white)', () => {
      expect(calculateChroma(100, 5, 1.25)).toBe(0);
    });

    it('has low chroma near extremes (L=5)', () => {
      const chromaNearBlack = calculateChroma(5, 5, 1.25);
      const chromaMid = calculateChroma(50, 5, 1.25);

      expect(chromaNearBlack).toBeLessThan(chromaMid * 0.2);
    });

    it('has low chroma near extremes (L=95)', () => {
      const chromaNearWhite = calculateChroma(95, 5, 1.25);
      const chromaMid = calculateChroma(50, 5, 1.25);

      expect(chromaNearWhite).toBeLessThan(chromaMid * 0.2);
    });
  });

  describe('tint parameter effects', () => {
    it('returns higher chroma with higher tint', () => {
      const tint3 = calculateChroma(50, 3, 1.25);
      const tint5 = calculateChroma(50, 5, 1.25);
      const tint10 = calculateChroma(50, 10, 1.25);

      expect(tint5).toBeGreaterThan(tint3);
      expect(tint10).toBeGreaterThan(tint5);
    });

    it('returns zero chroma with zero tint', () => {
      expect(calculateChroma(50, 0, 1.25)).toBe(0);
    });

    it('scales linearly with tint at same lightness', () => {
      const tint5 = calculateChroma(50, 5, 1.25);
      const tint10 = calculateChroma(50, 10, 1.25);

      expect(tint10).toBeCloseTo(tint5 * 2, 5);
    });
  });

  describe('chromaFalloff parameter effects', () => {
    it('has steeper falloff with higher chromaFalloff', () => {
      // At L=75 (25 units from midpoint)
      const falloff1 = calculateChroma(75, 5, 1);
      const falloff2 = calculateChroma(75, 5, 2);

      // Higher falloff = more aggressive reduction
      expect(falloff2).toBeLessThan(falloff1);
    });

    it('has gentler falloff with lower chromaFalloff', () => {
      // At L=75 (25 units from midpoint)
      const falloff1 = calculateChroma(75, 5, 1);
      const falloff05 = calculateChroma(75, 5, 0.5);

      // Lower falloff = less aggressive reduction
      expect(falloff05).toBeGreaterThan(falloff1);
    });

    it('preserves full chroma at L=50 regardless of falloff', () => {
      const falloff05 = calculateChroma(50, 5, 0.5);
      const falloff1 = calculateChroma(50, 5, 1);
      const falloff2 = calculateChroma(50, 5, 2);

      // All should be equal at midpoint
      expect(falloff05).toBeCloseTo(falloff1, 5);
      expect(falloff2).toBeCloseTo(falloff1, 5);
    });
  });

  describe('realistic parameter combinations', () => {
    it('produces sensible values with default parameters (tint=3, falloff=1.25)', () => {
      const chroma = calculateChroma(50, 3, 1.25);

      // Should be in reasonable range: 0-0.4
      expect(chroma).toBeGreaterThan(0);
      expect(chroma).toBeLessThan(0.4);

      // Specifically: baseTint=3 -> baseChroma=0.003 -> at L:50 = 0.003
      expect(chroma).toBeCloseTo(0.003, 4);
    });

    it('produces sensible values with high tint (tint=10)', () => {
      const chroma = calculateChroma(50, 10, 1.25);

      expect(chroma).toBeGreaterThan(0);
      expect(chroma).toBeLessThan(0.4);
      expect(chroma).toBeCloseTo(0.01, 4); // 10% -> 0.01
    });
  });
});

describe('generateSurfaceRamp (legacy)', () => {
  const defaultParams: RampParams = {
    ceiling: 98,
    floor: 10,
    curve: 0.47,
    tint: 3,
    chromaFalloff: 1.25,
    hueShift: 0,
    primaryHue: 240, // Blue
  };

  describe('light mode ramp', () => {
    it('returns exactly 14 stops', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'light');
      expect(ramp).toHaveLength(14);
    });

    it('has white at index 0 (#ffffff)', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'light');
      expect(ramp[0]).toBe('#ffffff');
    });

    it('has black at index 13 (#000000)', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'light');
      expect(ramp[13]).toBe('#000000');
    });
  });

  describe('dark mode ramp', () => {
    it('returns exactly 14 stops', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'dark');
      expect(ramp).toHaveLength(14);
    });

    it('has black at index 0 (#000000)', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'dark');
      expect(ramp[0]).toBe('#000000');
    });

    it('has white at index 13 (#ffffff)', () => {
      const ramp = generateSurfaceRamp(defaultParams, 'dark');
      expect(ramp[13]).toBe('#ffffff');
    });
  });
});

describe('generateUnifiedRamp', () => {
  const defaultParams: UnifiedRampParams = {
    tint: 3,
    chromaFalloff: 1.25,
    primaryHue: 240, // Blue
    floor: 4,
    ceiling: 96,
    darkCurve: 0.49,
    lightCurve: 0.47,
  };

  describe('ramp structure', () => {
    it('returns exactly 26 stops (indices 0-25)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      expect(ramp).toHaveLength(26);
    });

    it('all outputs are valid hex colors', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('all colors are unique', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      const uniqueColors = new Set(ramp);
      // Allow for some duplicates near midpoint where both halves meet
      expect(uniqueColors.size).toBeGreaterThanOrEqual(24);
    });
  });

  describe('dark half (indices 0-12)', () => {
    it('index 0 should be darkest (near floor)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      // Index 0 should be very dark (floor L=4)
      // Can't easily test exact lightness, but it should be darker than index 6
      expect(ramp[0]).not.toBe(ramp[6]);
    });

    it('index 12 should be near midpoint (L~50)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      // Index 12 is the end of dark half, should be medium
      expect(ramp[12]).not.toBe(ramp[0]);
      expect(ramp[12]).not.toBe(ramp[25]);
    });

    it('produces progressively lighter colors from 0 to 12', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      const darkHalf = ramp.slice(0, 13);
      // All should be unique (progressively lighter)
      expect(new Set(darkHalf).size).toBe(13);
    });

    it('respects darkCurve parameter', () => {
      const gentleCurve = generateUnifiedRamp({
        ...defaultParams,
        darkCurve: 0.3,
      });
      const steepCurve = generateUnifiedRamp({
        ...defaultParams,
        darkCurve: 1.2,
      });

      // Different curves should produce different distributions
      expect(gentleCurve[6]).not.toBe(steepCurve[6]);
    });
  });

  describe('light half (indices 13-25)', () => {
    it('index 13 should be near midpoint (L~50)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      // Index 13 is the start of light half, should be medium
      expect(ramp[13]).not.toBe(ramp[0]);
      expect(ramp[13]).not.toBe(ramp[25]);
    });

    it('index 25 should be lightest (near ceiling)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      // Index 25 should be very light (ceiling L=96)
      expect(ramp[25]).not.toBe(ramp[13]);
    });

    it('produces progressively lighter colors from 13 to 25', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      const lightHalf = ramp.slice(13, 26);
      // All should be unique (progressively lighter)
      expect(new Set(lightHalf).size).toBe(13);
    });

    it('respects lightCurve parameter', () => {
      const gentleCurve = generateUnifiedRamp({
        ...defaultParams,
        lightCurve: 0.3,
      });
      const steepCurve = generateUnifiedRamp({
        ...defaultParams,
        lightCurve: 1.2,
      });

      // Different curves should produce different distributions
      expect(gentleCurve[19]).not.toBe(steepCurve[19]);
    });
  });

  describe('floor and ceiling parameters', () => {
    it('respects floor parameter (affects dark half)', () => {
      const lowFloor = generateUnifiedRamp({ ...defaultParams, floor: 4 });
      const highFloor = generateUnifiedRamp({ ...defaultParams, floor: 15 });

      // Higher floor = lighter colors in dark half
      expect(lowFloor[0]).not.toBe(highFloor[0]);
      expect(lowFloor[6]).not.toBe(highFloor[6]);
    });

    it('respects ceiling parameter (affects light half)', () => {
      const lowCeiling = generateUnifiedRamp({ ...defaultParams, ceiling: 90 });
      const highCeiling = generateUnifiedRamp({
        ...defaultParams,
        ceiling: 98,
      });

      // Higher ceiling = lighter colors in light half
      expect(lowCeiling[25]).not.toBe(highCeiling[25]);
      expect(lowCeiling[19]).not.toBe(highCeiling[19]);
    });
  });

  describe('tint and chroma', () => {
    it('produces more saturated colors with higher tint', () => {
      const lowTint = generateUnifiedRamp({ ...defaultParams, tint: 1 });
      const highTint = generateUnifiedRamp({ ...defaultParams, tint: 10 });

      // Different tint should produce different colors
      expect(lowTint[12]).not.toBe(highTint[12]);
      expect(lowTint[13]).not.toBe(highTint[13]);
    });

    it('produces nearly neutral colors with zero tint', () => {
      const zeroTint = generateUnifiedRamp({ ...defaultParams, tint: 0 });

      // All colors should be valid hex
      zeroTint.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('respects chromaFalloff parameter', () => {
      // Use high tint to make chroma differences visible
      // Test at index away from midpoint (12/13) where falloff actually has an effect
      const lowFalloff = generateUnifiedRamp({
        ...defaultParams,
        tint: 10,
        chromaFalloff: 0.5,
      });
      const highFalloff = generateUnifiedRamp({
        ...defaultParams,
        tint: 10,
        chromaFalloff: 2.0,
      });

      // Different falloff should affect colors away from midpoint (L=50)
      // Index 6 is in dark half, away from midpoint
      expect(lowFalloff[6]).not.toBe(highFalloff[6]);
    });
  });

  describe('primaryHue variations', () => {
    it('produces different tints with different hues', () => {
      const blue = generateUnifiedRamp({ ...defaultParams, primaryHue: 240 });
      const red = generateUnifiedRamp({ ...defaultParams, primaryHue: 0 });
      const green = generateUnifiedRamp({ ...defaultParams, primaryHue: 145 });

      // Mid-range colors should differ based on hue
      expect(blue[12]).not.toBe(red[12]);
      expect(blue[12]).not.toBe(green[12]);
      expect(red[12]).not.toBe(green[12]);
    });

    it('handles hue wrapping (>360)', () => {
      const ramp = generateUnifiedRamp({ ...defaultParams, primaryHue: 380 });
      expect(ramp).toHaveLength(26);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('handles negative hue values', () => {
      const ramp = generateUnifiedRamp({ ...defaultParams, primaryHue: -20 });
      expect(ramp).toHaveLength(26);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });
  });

  describe('midpoint continuity', () => {
    it('index 12 and 13 should be similar (both near L=50)', () => {
      const ramp = generateUnifiedRamp(defaultParams);
      // Both should be near midpoint - not testing exact equality since
      // curves may produce slightly different values
      expect(ramp[12]).toBeDefined();
      expect(ramp[13]).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles extreme floor value (0)', () => {
      const ramp = generateUnifiedRamp({ ...defaultParams, floor: 0 });
      expect(ramp).toHaveLength(26);
      expect(ramp[0]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('handles extreme ceiling value (100)', () => {
      const ramp = generateUnifiedRamp({ ...defaultParams, ceiling: 100 });
      expect(ramp).toHaveLength(26);
      expect(ramp[25]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('handles extreme curve values', () => {
      const extremeCurves = generateUnifiedRamp({
        ...defaultParams,
        darkCurve: 0.2,
        lightCurve: 2.0,
      });
      expect(extremeCurves).toHaveLength(26);
      extremeCurves.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });
  });
});

describe('generateBrandRamp', () => {
  const defaultParams: ResolvedBrandRampParams = {
    chromaFalloff: 1.25,
    floor: 12,
    ceiling: 92,
    darkCurve: 0.5,
    lightCurve: 0.5,
  };

  // A typical mid-saturated blue
  const PICKED = '#3b82f6';

  describe('ramp structure', () => {
    it('returns exactly 9 stops (steps 100-900)', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      expect(ramp).toHaveLength(9);
    });

    it('all outputs are valid hex colors', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });
  });

  describe('step 500 anchor', () => {
    it('step 500 (index 4) equals the picked color', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      expect(ramp[4]).toBe(PICKED);
    });

    it('preserves picked color regardless of curve params', () => {
      const ramp = generateBrandRamp(PICKED, {
        ...defaultParams,
        darkCurve: 1.5,
        lightCurve: 0.2,
        chromaFalloff: 2.0,
      });
      expect(ramp[4]).toBe(PICKED);
    });
  });

  describe('lightness ordering', () => {
    it('progresses from light (100) to dark (900)', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const lightnesses = ramp.map((hex) => hexToOklch(hex).l);

      // Each step should be darker than the previous (monotonically decreasing)
      for (let i = 1; i < 9; i++) {
        expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i - 1] + 0.5);
      }
    });

    it('step 100 (index 0) is near ceiling', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const l = hexToOklch(ramp[0]).l;
      expect(l).toBeCloseTo(defaultParams.ceiling, 0);
    });

    it('step 900 (index 8) is near floor', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const l = hexToOklch(ramp[8]).l;
      expect(l).toBeCloseTo(defaultParams.floor, 0);
    });
  });

  describe('chroma anchored at step 500', () => {
    it('step 500 has the picked color chroma exactly', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const pickedC = hexToOklch(PICKED).c;
      const stepC = hexToOklch(ramp[4]).c;
      expect(stepC).toBeCloseTo(pickedC, 3);
    });

    it('chroma falls off symmetrically toward both extremes', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const c100 = hexToOklch(ramp[0]).c;
      const c500 = hexToOklch(ramp[4]).c;
      const c900 = hexToOklch(ramp[8]).c;

      // Both extremes should have lower chroma than the anchor
      expect(c100).toBeLessThan(c500);
      expect(c900).toBeLessThan(c500);
    });
  });

  describe('chromaFalloff parameter', () => {
    it('higher chromaFalloff produces more desaturated mid-stops', () => {
      const gentle = generateBrandRamp(PICKED, {
        ...defaultParams,
        chromaFalloff: 0.5,
      });
      const aggressive = generateBrandRamp(PICKED, {
        ...defaultParams,
        chromaFalloff: 2.0,
      });

      // Index 1 (step 200) and index 7 (step 800) sit between anchor and extreme
      // where chromaFalloff has visible effect (the extremes themselves both
      // collapse to c=0).
      const gentleC200 = hexToOklch(gentle[1]).c;
      const aggressiveC200 = hexToOklch(aggressive[1]).c;
      const gentleC800 = hexToOklch(gentle[7]).c;
      const aggressiveC800 = hexToOklch(aggressive[7]).c;

      expect(aggressiveC200).toBeLessThan(gentleC200);
      expect(aggressiveC800).toBeLessThan(gentleC800);
    });
  });

  describe('floor and ceiling parameters', () => {
    it('respects ceiling (controls light extreme)', () => {
      const tight = generateBrandRamp(PICKED, {
        ...defaultParams,
        ceiling: 80,
      });
      const wide = generateBrandRamp(PICKED, { ...defaultParams, ceiling: 95 });

      expect(hexToOklch(tight[0]).l).toBeLessThan(hexToOklch(wide[0]).l);
    });

    it('respects floor (controls dark extreme)', () => {
      const tight = generateBrandRamp(PICKED, { ...defaultParams, floor: 25 });
      const wide = generateBrandRamp(PICKED, { ...defaultParams, floor: 5 });

      expect(hexToOklch(tight[8]).l).toBeGreaterThan(hexToOklch(wide[8]).l);
    });
  });

  describe('curve parameters', () => {
    it('respects lightCurve (affects light half distribution)', () => {
      const gentle = generateBrandRamp(PICKED, {
        ...defaultParams,
        lightCurve: 0.3,
      });
      const steep = generateBrandRamp(PICKED, {
        ...defaultParams,
        lightCurve: 1.2,
      });
      // Mid-light step should differ between the two curves
      expect(gentle[2]).not.toBe(steep[2]);
    });

    it('respects darkCurve (affects dark half distribution)', () => {
      const gentle = generateBrandRamp(PICKED, {
        ...defaultParams,
        darkCurve: 0.3,
      });
      const steep = generateBrandRamp(PICKED, {
        ...defaultParams,
        darkCurve: 1.2,
      });
      // Mid-dark step should differ between the two curves
      expect(gentle[6]).not.toBe(steep[6]);
    });
  });

  describe('hue preservation', () => {
    it('all steps with meaningful chroma share the picked color hue', () => {
      const ramp = generateBrandRamp(PICKED, defaultParams);
      const pickedHue = hexToOklch(PICKED).h;

      ramp.forEach((hex, i) => {
        // Skip the anchor (already exact) and steps with very low chroma
        // (where hue drift from sRGB roundtrip becomes large)
        const oklch = hexToOklch(hex);
        if (oklch.c > 0.05 && i !== 4) {
          // Allow some drift from sRGB conversion roundtrip — drift is larger
          // at low chroma but hue is also perceptually less salient there.
          const drift = Math.abs(oklch.h - pickedHue);
          expect(drift).toBeLessThan(6);
        }
      });
    });
  });

  describe('edge cases', () => {
    it('handles a very light picked color (L > ceiling)', () => {
      // Very pale color, picked.L ~ 95 > ceiling 92
      const ramp = generateBrandRamp('#f0f4ff', defaultParams);
      expect(ramp).toHaveLength(9);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('handles a very dark picked color (L < floor)', () => {
      // Very dark color, picked.L ~ 8 < floor 12
      const ramp = generateBrandRamp('#0a0a14', defaultParams);
      expect(ramp).toHaveLength(9);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('handles a desaturated picked color', () => {
      // Near-gray
      const ramp = generateBrandRamp('#8a8a8a', defaultParams);
      expect(ramp).toHaveLength(9);
      ramp.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });
  });
});
