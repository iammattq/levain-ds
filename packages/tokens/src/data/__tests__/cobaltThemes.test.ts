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

const NAMES = ['Cobalt Mono', 'Cobalt Warm'];
const cobalt = NAMES.map((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  return { name, theme: themeGeneratorV2.generate(input) };
});

describe('Cobalt Mono (TH1) and Cobalt Warm', () => {
  it('ship after the seven built-ins, Cobalt Warm last, so no existing theme changes index', () => {
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
    // (T21) caution is an amber (OKLCH hue 65-85), not the orange-salmon next to error it was at hue 45. 40 degrees apart
    // at the least: at 15-20 (the old light 40 vs 25, dark 45 vs 25) the two read as one colour on the T20 swatch, and 40
    // keeps the measured caution hue (70-75) clear of error (25) with room for gamut clipping to pull it back a little.
    it.each(['light', 'dark'] as const)('draws caution as an amber, at least 40 degrees of hue from error, in %s mode', (mode) => {
      const a = theme[mode].actions;
      const [caution, error] = [a['caution-fg'], a['error-fg']].map((hex) => hexToOklch(hex).h);
      expect(caution).toBeGreaterThanOrEqual(65);
      expect(caution).toBeLessThanOrEqual(85);
      expect(Math.abs(caution - error)).toBeGreaterThanOrEqual(40);
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

  // Cobalt Warm (Ringmaster T201): white with a touch of warmth, a slightly warm black, cream text in dark, never beige
  const warm = (mode: 'light' | 'dark') => cobalt[1].theme[mode].tokens as Record<string, string>;
  const warmHue = (hex: string) => { const h = hexToOklch(hex).h; expect(h).toBeGreaterThanOrEqual(65); expect(h).toBeLessThanOrEqual(100); };
  it('Cobalt Warm: light surfaces are white with a touch of warmth, never cream (chroma 0.002-0.006, toward the cream)', () => {
    for (const k of ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-elevated']) {
      expect(chroma(warm('light')[k])).toBeGreaterThanOrEqual(0.002);
      expect(chroma(warm('light')[k])).toBeLessThanOrEqual(0.006);
      warmHue(warm('light')[k]);
    }
  });
  it("Cobalt Warm: light text is Cobalt Mono's black with a slight warmth (chroma 0.005-0.012, the same lightness within 2)", () => {
    for (const k of ['text-emphasis', 'text-default', 'text-muted', 'text-faint']) {
      expect(chroma(warm('light')[k])).toBeGreaterThanOrEqual(0.005);
      expect(chroma(warm('light')[k])).toBeLessThanOrEqual(0.012);
      expect(Math.abs(hexToOklch(warm('light')[k]).l - hexToOklch(tok('light')[k]).l)).toBeLessThanOrEqual(2);
      warmHue(warm('light')[k]);
    }
  });
  it('Cobalt Warm: dark text is a subtle cream, its quieter tiers a dimmer cream, none louder than the cream itself', () => {
    const cream = hexToOklch('#F5E9CF');
    for (const k of ['text-emphasis', 'text-default', 'text-muted', 'text-faint']) {
      expect(chroma(warm('dark')[k])).toBeGreaterThanOrEqual(0.008);
      expect(chroma(warm('dark')[k])).toBeLessThan(cream.c);
      warmHue(warm('dark')[k]);
    }
    expect(hexToOklch(warm('dark')['text-default']).l).toBeGreaterThan(hexToOklch(warm('dark')['text-muted']).l);
    expect(hexToOklch(warm('dark')['text-muted']).l).toBeGreaterThan(hexToOklch(warm('dark')['text-faint']).l);
  });
  it('Cobalt Warm: dark surfaces are a warm near-black (chroma at most 0.012)', () => {
    for (const k of ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-elevated']) {
      expect(chroma(warm('dark')[k])).toBeLessThanOrEqual(0.012);
      warmHue(warm('dark')[k]);
    }
  });
  it('Cobalt Warm: its links are a warmer blue than cobalt (hue past 264, toward ultramarine)', () => {
    for (const mode of ['light', 'dark'] as const) expect(hexToOklch(warm(mode)['text-link']).h).toBeGreaterThan(266);
  });
});
