/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { baseThemesV2 } from '../baseThemesV2';
import { themeGeneratorV2 } from '../../generator';
import { hexToOklch } from '../../generator/oklch/convert';

/**
 * The Cobalt themes (TH1): three looks a phone user tells apart at a glance (Mono, Night, Accent). Their text is
 * read against every surface it sits on at WCAG AA (4.5:1 for body text), the accent too (status labels draw it as
 * text), and the text on the primary and accent fills passes in each mode. Mono and Night have black-and-white
 * buttons; Night's greys are cobalt; Accent's button is the cobalt.
 */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const NAMES = ['Cobalt Mono', 'Cobalt Night', 'Cobalt Accent'];
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
        // (the accent too: status markers draw it as text)
        for (const text of ['text-emphasis', 'text-default', 'text-muted', 'text-faint', 'text-link', 'accent']) {
          expect(contrast(t[text], t[s])).toBeGreaterThanOrEqual(4.5);
        }
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

  // the three tell apart at a glance: by the greys' cast and by the button's colour
  const tok = (i: number, mode: 'light' | 'dark') => cobalt[i].theme[mode].tokens as Record<string, string>;
  const chroma = (hex: string) => hexToOklch(hex).c;
  it('Night alone has cobalt greys, visibly so: a navy ladder on dark, a blue-white canvas on light', () => {
    for (const k of ['surface-canvas', 'surface-section', 'surface-card']) {
      expect(chroma(tok(0, 'dark')[k])).toBeLessThan(0.001);
      expect(chroma(tok(2, 'dark')[k])).toBeLessThan(0.001);
      expect(chroma(tok(1, 'dark')[k])).toBeGreaterThan(0.03);
    }
    expect(chroma(tok(1, 'light')['surface-canvas'])).toBeGreaterThan(0.015);
  });
  it('Mono and Night have black-and-white buttons and accent; Accent has cobalt ones', () => {
    for (const i of [0, 1]) for (const mode of ['light', 'dark'] as const) {
      // (Night's near-black carries its navy cast; still far from the cobalt's 0.17)
      expect(chroma(tok(i, mode).primary)).toBeLessThan(0.05);
      expect(chroma(tok(i, mode).accent)).toBeLessThan(0.05);
    }
    expect(hexToOklch(tok(0, 'light').primary).l).toBeLessThan(30); // black on light (lightness 0-100)
    expect(hexToOklch(tok(0, 'dark').primary).l).toBeGreaterThan(90); // white on dark
    for (const mode of ['light', 'dark'] as const) expect(chroma(tok(2, mode).primary)).toBeGreaterThan(0.1);
  });
});
