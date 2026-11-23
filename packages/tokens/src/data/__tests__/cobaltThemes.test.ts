/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { baseThemesV2 } from '../baseThemesV2';
import { themeGeneratorV2 } from '../../generator';
import { hexToOklch } from '../../generator/oklch/convert';

/**
 * Cobalt Mono (TH1): black and white with cobalt only on links and focus. Its text is read against every surface it
 * sits on at WCAG AA (4.5:1 for body text), the accent too (status labels draw it as text), and the text on its
 * primary and accent fills passes in each mode: black buttons on light, white on dark.
 */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const NAMES = ['Cobalt Mono'];
const cobalt = NAMES.map((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  return { name, theme: themeGeneratorV2.generate(input) };
});

describe('Cobalt Mono (TH1)', () => {
  it('ships after the seven built-ins, so no existing theme changes index', () => {
    expect(baseThemesV2.slice(7).map((t) => t.name)).toEqual(NAMES);
  });

  describe.each(cobalt)('$name', ({ theme }) => {
    const surfaces = ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-elevated'];
    it.each(['light', 'dark'] as const)('keeps its text at AA on every surface in %s mode', (mode) => {
      const t = theme[mode].tokens as Record<string, string>;
      for (const s of surfaces) {
        // (the accent too: status markers draw it as text)
        for (const text of ['text-emphasis', 'text-default', 'text-muted', 'text-faint', 'text-link', 'accent']) {
          expect(contrast(t[text], t[s])).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    // (T20) a status colour is read as text on every surface and drawn as a shape (a progress bar) on border-default
    it.each(['light', 'dark'] as const)('keeps every status -fg at AA as text and 3:1 against border-default in %s mode', (mode) => {
      const t = theme[mode].tokens as Record<string, string>, a = theme[mode].actions;
      for (const status of ['success', 'caution', 'error', 'info']) {
        const fg = a[`${status}-fg`];
        for (const s of [...surfaces, 'surface-interactive']) expect({ status, s, ratio: contrast(fg, t[s]) >= 4.5 }).toEqual({ status, s, ratio: true });
        expect({ status, ratio: contrast(fg, t['border-default']) >= 3 }).toEqual({ status, ratio: true });
      }
    });
    it.each(['light', 'dark'] as const)('puts readable text on its primary button in %s mode', (mode) => {
      const m = theme[mode], t = m.tokens as Record<string, string>;
      expect(contrast(m.textOnPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it.each(['light', 'dark'] as const)('puts readable text on its accent fill (the selected tab) in %s mode', (mode) => {
      const m = theme[mode], t = m.tokens as Record<string, string>;
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
    it('links in cobalt, in both modes', () => {
      for (const mode of ['light', 'dark'] as const) {
        const h = Math.round(hexToOklch((theme[mode].tokens as Record<string, string>)['text-link']).h);
        expect(h).toBeGreaterThanOrEqual(255);
        expect(h).toBeLessThanOrEqual(275);
      }
    });
  });

  const tok = (mode: 'light' | 'dark') => cobalt[0].theme[mode].tokens as Record<string, string>;
  const chroma = (hex: string) => hexToOklch(hex).c;
  it('is black and white: pure greys, a near-black button on light and a near-white one on dark', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const k of ['surface-canvas', 'surface-section', 'surface-card', 'primary', 'accent']) expect(chroma(tok(mode)[k])).toBeLessThan(0.001);
    }
    expect(hexToOklch(tok('light').primary).l).toBeLessThan(30); // lightness 0-100
    expect(hexToOklch(tok('dark').primary).l).toBeGreaterThan(90);
  });
});
