import { describe, expect, it } from '@jest/globals';

import { hexToOklch } from '../convert';
import {
  generateSpectrumColor,
  SPECTRUM_ANCHOR_HUE,
  SPECTRUM_TYPES,
} from '../spectrum';
import { DEFAULT_SPECTRUM_PARAMS } from '../../defaults';

const params = (
  overrides: Partial<Parameters<typeof generateSpectrumColor>[0]> = {}
) => ({
  hue: DEFAULT_SPECTRUM_PARAMS.cool.hue,
  hueAdjust: 0,
  chroma: DEFAULT_SPECTRUM_PARAMS.chroma,
  baseLightness: DEFAULT_SPECTRUM_PARAMS.baseLightness,
  darkLightnessShift: DEFAULT_SPECTRUM_PARAMS.darkLightnessShift,
  // Most cases measure the stop itself, so hold the triad still by default.
  primaryHue: SPECTRUM_ANCHOR_HUE,
  themeAffinity: 0,
  ...overrides,
});

describe('generateSpectrumColor', () => {
  it('returns a hex colour', () => {
    expect(generateSpectrumColor(params(), 'light')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lifts the stop in dark mode so it stays visible on a dark ground', () => {
    const light = hexToOklch(generateSpectrumColor(params(), 'light'));
    const dark = hexToOklch(generateSpectrumColor(params(), 'dark'));
    expect(dark.l).toBeGreaterThan(light.l);
  });

  it('applies hueAdjust on top of the base hue', () => {
    const base = hexToOklch(generateSpectrumColor(params(), 'light'));
    const turned = hexToOklch(
      generateSpectrumColor(params({ hueAdjust: 40 }), 'light')
    );
    // Not exact: sRGB clipping bends hue slightly. The tolerance is the point
    // of the chroma guard below.
    expect(turned.h - base.h).toBeGreaterThan(34);
    expect(turned.h - base.h).toBeLessThan(46);
  });

  it('keeps the default chroma inside sRGB, so hues come back as asked', () => {
    // Clipping an out-of-gamut colour bends its hue, which would make these
    // stops unusable as a palette to interpolate across. Raising the default
    // chroma should fail here before it reaches a theme.
    let worst = 0;
    for (let hue = 0; hue < 360; hue += 5) {
      for (const mode of ['light', 'dark'] as const) {
        const asked = hue;
        const got = hexToOklch(
          generateSpectrumColor(params({ hue, hueAdjust: 0 }), mode)
        ).h;
        const drift = Math.min(
          Math.abs(got - asked),
          360 - Math.abs(got - asked)
        );
        worst = Math.max(worst, drift);
      }
    }
    expect(worst).toBeLessThan(5);
  });

  it('wraps a hue that runs past the wheel', () => {
    const wrapped = generateSpectrumColor(
      params({ hue: 350, hueAdjust: 40 }),
      'light'
    );
    const direct = generateSpectrumColor(
      params({ hue: 30, hueAdjust: 0 }),
      'light'
    );
    expect(wrapped).toBe(direct);
  });

  it('keeps lightness inside the legal range at extreme shifts', () => {
    const hot = generateSpectrumColor(
      params({ baseLightness: 95, darkLightnessShift: 40 }),
      'dark'
    );
    expect(hot).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('turns the whole triad toward the theme, keeping its spacing', () => {
    // A theme 100 degrees off the anchor at affinity 0.5 should move every
    // stop by the same 50 degrees — the spread is the point, so it must
    // survive the rotation.
    const shifts = SPECTRUM_TYPES.map((type) => {
      const still = hexToOklch(
        generateSpectrumColor(
          params({ hue: DEFAULT_SPECTRUM_PARAMS[type].hue }),
          'light'
        )
      ).h;
      const turned = hexToOklch(
        generateSpectrumColor(
          params({
            hue: DEFAULT_SPECTRUM_PARAMS[type].hue,
            primaryHue: SPECTRUM_ANCHOR_HUE + 100,
            themeAffinity: 0.5,
          }),
          'light'
        )
      ).h;
      let delta = turned - still;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      return delta;
    });

    // Measured through a hex round-trip, so clipping costs a couple of
    // degrees. What matters is that all three move together.
    for (const shift of shifts) expect(Math.abs(shift - 50)).toBeLessThan(3);
    expect(Math.max(...shifts) - Math.min(...shifts)).toBeLessThan(3);
  });

  it('gives every theme the same spectrum at zero affinity', () => {
    const a = generateSpectrumColor(params({ primaryHue: 10 }), 'light');
    const b = generateSpectrumColor(params({ primaryHue: 300 }), 'light');
    expect(a).toBe(b);
  });

  it('names three stops, one reliably cool and one reliably warm', () => {
    expect(SPECTRUM_TYPES).toEqual(['cool', 'warm', 'vivid']);
    // Cool sits in the blue half of the wheel, warm in the red/orange half.
    expect(DEFAULT_SPECTRUM_PARAMS.cool.hue).toBeGreaterThan(180);
    expect(DEFAULT_SPECTRUM_PARAMS.cool.hue).toBeLessThan(300);
    expect(DEFAULT_SPECTRUM_PARAMS.warm.hue).toBeLessThan(90);
  });
});
