import { generateActionColor, ACTION_TYPES } from '../actions';
import type { ActionColorParams } from '../../types';

// Mock the convert module
jest.mock('../convert', () => ({
  oklchToHex: jest.fn((color) => {
    // Simple mock that returns a stringified version of the OKLCH values
    // This allows us to verify the correct values are being passed
    return `#${Math.round(color.l)}-${color.c.toFixed(2)}-${Math.round(color.h)}`;
  }),
}));

import { oklchToHex } from '../convert';

describe('generateActionColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('light mode', () => {
    const baseParams: ActionColorParams = {
      hue: 145,
      hueAdjust: 0,
      chroma: 0.15,
      baseLightness: 50,
      fgLightnessOffset: -15,
      bgLightnessOffset: 40,
    };

    it('takes lightFgLightnessOffset for the light fg when given', () => {
      generateActionColor({ ...baseParams, lightFgLightnessOffset: -2 }, 'light');

      // 50 + (-2) = 48, not 50 + (-15)
      expect(oklchToHex).toHaveBeenNthCalledWith(2, { l: 48, c: 0.15, h: 145 });
    });

    it('generates base color with baseLightness', () => {
      generateActionColor(baseParams, 'light');

      // First call should be for base color
      expect(oklchToHex).toHaveBeenNthCalledWith(1, {
        l: 50,
        c: 0.15,
        h: 145,
      });
    });

    it('generates fg color darker (baseLightness + fgLightnessOffset)', () => {
      generateActionColor(baseParams, 'light');

      // Second call should be for fg color
      expect(oklchToHex).toHaveBeenNthCalledWith(2, {
        l: 35, // 50 + (-15)
        c: 0.15,
        h: 145,
      });
    });

    it('generates bg color lighter (baseLightness + bgLightnessOffset)', () => {
      generateActionColor(baseParams, 'light');

      // Third call should be for bg color
      expect(oklchToHex).toHaveBeenNthCalledWith(3, {
        l: 90, // 50 + 40
        c: 0.075, // 0.15 * 0.5
        h: 145,
      });
    });

    it('uses reduced chroma (0.5x) for bg color', () => {
      const params = { ...baseParams, chroma: 0.2 };
      generateActionColor(params, 'light');

      // Third call should have 0.5x chroma
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          c: 0.1, // 0.2 * 0.5
        })
      );
    });

    it('applies hueAdjust to all colors', () => {
      const params = { ...baseParams, hue: 145, hueAdjust: 10 };
      generateActionColor(params, 'light');

      const expectedHue = 155; // 145 + 10

      expect(oklchToHex).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ h: expectedHue })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ h: expectedHue })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ h: expectedHue })
      );
    });

    it('returns ActionColorSet with base, fg, and bg', () => {
      const result = generateActionColor(baseParams, 'light');

      expect(result).toEqual({
        base: expect.any(String),
        fg: expect.any(String),
        bg: expect.any(String),
      });
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe('dark mode', () => {
    const baseParams: ActionColorParams = {
      hue: 145,
      hueAdjust: 0,
      chroma: 0.15,
      baseLightness: 50,
      fgLightnessOffset: -15,
      bgLightnessOffset: 40,
    };

    it('generates base color with baseLightness (same as light mode)', () => {
      generateActionColor(baseParams, 'dark');

      expect(oklchToHex).toHaveBeenNthCalledWith(1, {
        l: 50,
        c: 0.15,
        h: 145,
      });
    });

    it('inverts fg offset (fg is lighter in dark mode)', () => {
      generateActionColor(baseParams, 'dark');

      // In dark mode, fg should be baseLightness - fgLightnessOffset
      // 50 - (-15) = 65
      expect(oklchToHex).toHaveBeenNthCalledWith(2, {
        l: 65,
        c: 0.15,
        h: 145,
      });
    });

    it('takes darkFgLightnessOffset for the dark fg when given', () => {
      generateActionColor({ ...baseParams, darkFgLightnessOffset: -22 }, 'dark');

      // 50 - (-22) = 72
      expect(oklchToHex).toHaveBeenNthCalledWith(2, { l: 72, c: 0.15, h: 145 });
    });

    it('leaves the dark fg alone when lightFgLightnessOffset is given', () => {
      generateActionColor({ ...baseParams, lightFgLightnessOffset: -2 }, 'dark');

      expect(oklchToHex).toHaveBeenNthCalledWith(2, { l: 65, c: 0.15, h: 145 });
    });

    it('leaves the light fg on fgLightnessOffset when darkFgLightnessOffset is given', () => {
      generateActionColor({ ...baseParams, darkFgLightnessOffset: -22 }, 'light');

      expect(oklchToHex).toHaveBeenNthCalledWith(2, { l: 35, c: 0.15, h: 145 });
    });

    it('inverts bg offset (bg is darker in dark mode)', () => {
      generateActionColor(baseParams, 'dark');

      // In dark mode, bg should be baseLightness - bgLightnessOffset
      // 50 - 40 = 10
      expect(oklchToHex).toHaveBeenNthCalledWith(3, {
        l: 10,
        c: 0.075, // 0.15 * 0.5
        h: 145,
      });
    });

    it('still uses reduced chroma (0.5x) for bg color', () => {
      const params = { ...baseParams, chroma: 0.2 };
      generateActionColor(params, 'dark');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          c: 0.1, // 0.2 * 0.5
        })
      );
    });

    it('applies hueAdjust to all colors', () => {
      const params = { ...baseParams, hue: 220, hueAdjust: -5 };
      generateActionColor(params, 'dark');

      const expectedHue = 215; // 220 + (-5)

      expect(oklchToHex).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ h: expectedHue })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ h: expectedHue })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ h: expectedHue })
      );
    });
  });

  describe('action type hues', () => {
    const createParams = (hue: number): ActionColorParams => ({
      hue,
      hueAdjust: 0,
      chroma: 0.15,
      baseLightness: 50,
      fgLightnessOffset: -15,
      bgLightnessOffset: 40,
    });

    it('works with success hue (145)', () => {
      generateActionColor(createParams(145), 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 145 })
      );
    });

    it('works with error hue (25)', () => {
      generateActionColor(createParams(25), 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 25 })
      );
    });

    it('works with caution hue (45)', () => {
      generateActionColor(createParams(45), 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 45 })
      );
    });

    it('works with info hue (220)', () => {
      generateActionColor(createParams(220), 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 220 })
      );
    });
  });

  describe('hueAdjust behavior', () => {
    const baseParams: ActionColorParams = {
      hue: 100,
      hueAdjust: 0,
      chroma: 0.15,
      baseLightness: 50,
      fgLightnessOffset: -15,
      bgLightnessOffset: 40,
    };

    it('correctly adds positive hueAdjust', () => {
      const params = { ...baseParams, hueAdjust: 20 };
      generateActionColor(params, 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 120 })
      );
    });

    it('correctly adds negative hueAdjust', () => {
      const params = { ...baseParams, hueAdjust: -20 };
      generateActionColor(params, 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 80 })
      );
    });

    it('handles zero hueAdjust', () => {
      const params = { ...baseParams, hueAdjust: 0 };
      generateActionColor(params, 'light');

      expect(oklchToHex).toHaveBeenCalledWith(
        expect.objectContaining({ h: 100 })
      );
    });
  });

  describe('edge cases', () => {
    it('handles zero chroma', () => {
      const params: ActionColorParams = {
        hue: 145,
        hueAdjust: 0,
        chroma: 0,
        baseLightness: 50,
        fgLightnessOffset: -15,
        bgLightnessOffset: 40,
      };

      generateActionColor(params, 'light');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ c: 0 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ c: 0 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ c: 0 })
      );
    });

    it('handles maximum lightness values', () => {
      const params: ActionColorParams = {
        hue: 145,
        hueAdjust: 0,
        chroma: 0.15,
        baseLightness: 70,
        fgLightnessOffset: -15,
        bgLightnessOffset: 30,
      };

      generateActionColor(params, 'light');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ l: 70 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ l: 55 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ l: 100 })
      );
    });

    it('handles minimum lightness values', () => {
      const params: ActionColorParams = {
        hue: 145,
        hueAdjust: 0,
        chroma: 0.15,
        baseLightness: 30,
        fgLightnessOffset: -15,
        bgLightnessOffset: 40,
      };

      generateActionColor(params, 'dark');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ l: 30 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ l: 45 })
      );
      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ l: -10 })
      );
    });
  });

  describe('offset calculations', () => {
    it('correctly applies different fg offset values', () => {
      const baseParams: ActionColorParams = {
        hue: 145,
        hueAdjust: 0,
        chroma: 0.15,
        baseLightness: 50,
        fgLightnessOffset: -20,
        bgLightnessOffset: 40,
      };

      generateActionColor(baseParams, 'light');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          l: 30, // 50 + (-20)
        })
      );
    });

    it('correctly applies different bg offset values', () => {
      const baseParams: ActionColorParams = {
        hue: 145,
        hueAdjust: 0,
        chroma: 0.15,
        baseLightness: 50,
        fgLightnessOffset: -15,
        bgLightnessOffset: 45,
      };

      generateActionColor(baseParams, 'light');

      expect(oklchToHex).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          l: 95, // 50 + 45
        })
      );
    });
  });
});

describe('ACTION_TYPES', () => {
  it('contains all expected action types', () => {
    expect(ACTION_TYPES).toEqual(['success', 'error', 'caution', 'info']);
  });

  it('is a readonly array', () => {
    // TypeScript enforces this at compile time, but we can verify it exists
    expect(Array.isArray(ACTION_TYPES)).toBe(true);
  });

  it('contains exactly 4 action types', () => {
    expect(ACTION_TYPES).toHaveLength(4);
  });

  it('contains success', () => {
    expect(ACTION_TYPES).toContain('success');
  });

  it('contains error', () => {
    expect(ACTION_TYPES).toContain('error');
  });

  it('contains caution', () => {
    expect(ACTION_TYPES).toContain('caution');
  });

  it('contains info', () => {
    expect(ACTION_TYPES).toContain('info');
  });
});
