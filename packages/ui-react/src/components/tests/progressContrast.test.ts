/**
 * @jest-environment node
 */
// T18: each progress tone read against its track and the surfaces it sits on, in the default theme (Sage) and Cobalt
// Mono, light and dark. The fill is non-text (WCAG 1.4.11: 3:1 against the track); the bar's value text is text (4.5:1
// on every surface). Cobalt Mono dark missed both until T20 raised its -fg tokens.
import { baseThemesV2, themeGeneratorV2 } from '@levain/tokens';
import { toneToken, trackToken, type ProgressTone } from '../progress';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const THEMES = ['Sage', 'Cobalt Mono', 'Cobalt Warm'];
const SURFACES = ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-subtle', 'surface-interactive', 'surface-elevated'];
const TONES = Object.keys(toneToken) as ProgressTone[];

type Row = { theme: string; mode: 'light' | 'dark'; tone: ProgressTone; against: string; ratio: number; need: number };
const rows: Row[] = THEMES.flatMap((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  const theme = themeGeneratorV2.generate(input);
  return (['light', 'dark'] as const).flatMap((mode) => {
    const t = { ...theme[mode].tokens, ...theme[mode].actions } as Record<string, string>;
    return TONES.flatMap((tone) => {
      const c = t[toneToken[tone]]!;
      return [
        { theme: name, mode, tone, against: 'track', ratio: contrast(c, t[trackToken]!), need: 3 },
        ...SURFACES.map((s) => ({ theme: name, mode, tone, against: s, ratio: contrast(c, t[s]!), need: 4.5 })),
      ];
    });
  });
});
const key = (r: Row) => `${r.theme} ${r.mode} ${r.tone} on ${r.against}`;

describe('progress tone contrast (T18)', () => {
  it('reads every tone in both themes and modes, on the track and every surface', () => {
    expect(rows).toHaveLength(THEMES.length * 2 * TONES.length * (SURFACES.length + 1));
  });

  it('every tone passes on the track (3:1) and on every surface (4.5:1)', () => {
    expect(rows.filter((r) => r.ratio < r.need).map((r) => `${key(r)} ${r.ratio.toFixed(2)}`)).toEqual([]);
  });

  // The full table, for the report: `PRINT_CONTRAST=1 jest progressContrast`.
  if (process.env.PRINT_CONTRAST) {
    it('prints the table', () => {
      const lines = ['| theme | mode | tone | against | ratio | need |', '|---|---|---|---|---|---|'];
      for (const r of rows) lines.push(`| ${r.theme} | ${r.mode} | ${r.tone} | ${r.against} | ${r.ratio.toFixed(2)} | ${r.need} |`);
      console.log(lines.join('\n'));
    });
  }
});
