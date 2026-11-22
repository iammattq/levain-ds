/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { baseThemesV2 } from '../baseThemesV2';
import { themeGeneratorV2 } from '../../generator';
import { hexToOklch } from '../../generator/oklch/convert';

/**
 * The Cobalt themes (TH1): black and white with a cobalt tint, three options of one theme. Their text is read
 * against every surface it sits on at WCAG AA (4.5:1 for body text), the cobalt the board uses for links and the
 * primary button passes too, and the options differ only in how much cobalt shows: the greys of Cobalt Hairline
 * carry none.
 */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const NAMES = ['Cobalt Hairline', 'Cobalt Tint', 'Cobalt Bold'];
const cobalt = NAMES.map((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  return { name, theme: themeGeneratorV2.generate(input) };
});

describe('Cobalt themes (TH1)', () => {
  it('ship after the seven built-ins, so no existing theme changes index', () => {
    expect(baseThemesV2.slice(7).map((t) => t.name)).toEqual(NAMES);
  });

  describe.each(cobalt)('$name', ({ theme }) => {
    const surfaces = ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-elevated'];
    it.each(['light', 'dark'] as const)('keeps its text at AA on every surface in %s mode', (mode) => {
      const t = theme[mode].tokens as Record<string, string>;
      for (const s of surfaces) {
        for (const text of ['text-emphasis', 'text-default', 'text-muted', 'text-faint', 'text-link']) {
          expect(contrast(t[text], t[s])).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it.each(['light', 'dark'] as const)('puts readable text on its primary and accent in %s mode', (mode) => {
      const m = theme[mode], t = m.tokens as Record<string, string>;
      expect(contrast(m.textOnPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(m.textOnAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
    });
    it('keeps the text tiers in order: muted between default and faint, in both modes', () => {
      for (const mode of ['light', 'dark'] as const) {
        const t = theme[mode].tokens as Record<string, string>, bg = t['surface-canvas'];
        const [d, m, f] = ['text-default', 'text-muted', 'text-faint'].map((k) => contrast(t[k], bg));
        expect(d).toBeGreaterThan(m);
        expect(m).toBeGreaterThan(f);
      }
    });
    it('is cobalt where it is coloured', () => {
      expect(Math.round(hexToOklch(theme.light.tokens.primary as string).h)).toBeGreaterThanOrEqual(255);
      expect(Math.round(hexToOklch(theme.light.tokens.primary as string).h)).toBeLessThanOrEqual(275);
    });
  });

  it('differ in how much cobalt the greys carry: none in Hairline, some in Tint and Bold', () => {
    const chroma = (i: number) => hexToOklch((cobalt[i].theme.dark.tokens as Record<string, string>)['surface-card']).c;
    expect(chroma(0)).toBeLessThan(0.001);
    expect(chroma(1)).toBeGreaterThan(0.003);
    expect(chroma(2)).toBeGreaterThan(0.003);
  });
});
