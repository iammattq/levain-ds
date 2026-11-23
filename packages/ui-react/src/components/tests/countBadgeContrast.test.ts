/**
 * @jest-environment node
 */
// T7: CountBadge's caution tone read in Sage and Cobalt Mono, light and dark. Filled caution: its text against its fill
// (4.5:1). Plain caution: the number against every card and section surface it sits on (4.5:1). The default tones are
// the board's existing colours (faint text, text-default pill) and are checked the same way for the record.
import { baseThemesV2, themeGeneratorV2 } from '@levain/tokens';
import { countBadgeTokens, type CountBadgeTone } from '../CountBadge';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const THEMES = ['Sage', 'Cobalt Mono'];
const SURFACES = ['surface-canvas', 'surface-section', 'surface-card', 'surface-component', 'surface-subtle', 'surface-interactive', 'surface-elevated'];
const TONES: CountBadgeTone[] = ['default', 'caution'];

type Row = { theme: string; mode: 'light' | 'dark'; variant: 'plain' | 'filled'; tone: CountBadgeTone; against: string; ratio: number };
const rows: Row[] = THEMES.flatMap((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  const theme = themeGeneratorV2.generate(input);
  return (['light', 'dark'] as const).flatMap((mode) => {
    const t = { ...theme[mode].tokens, ...theme[mode].actions } as Record<string, string>;
    return TONES.flatMap((tone) => {
      const plain = countBadgeTokens.plain[tone];
      const filled = countBadgeTokens.filled[tone];
      return [
        ...SURFACES.map((s) => ({ theme: name, mode, variant: 'plain' as const, tone, against: s, ratio: contrast(t[plain.fg]!, t[s]!) })),
        { theme: name, mode, variant: 'filled' as const, tone, against: filled.bg!, ratio: contrast(t[filled.fg]!, t[filled.bg!]!) },
      ];
    });
  });
});
const key = (r: Row) => `${r.theme} ${r.mode} ${r.variant} ${r.tone} on ${r.against}`;
const failing = (rs: Row[]) => rs.filter((r) => !(r.ratio >= 4.5)).map((r) => `${key(r)} ${r.ratio.toFixed(2)}`);

describe('CountBadge contrast (T7)', () => {
  it('reads every variant and tone in both themes and modes', () => {
    expect(rows).toHaveLength(THEMES.length * 2 * TONES.length * (SURFACES.length + 1));
  });

  it('filled caution text passes 4.5:1 on its fill', () => {
    expect(failing(rows.filter((r) => r.variant === 'filled' && r.tone === 'caution'))).toEqual([]);
  });

  it('plain caution passes 4.5:1 on every card and section surface', () => {
    expect(failing(rows.filter((r) => r.variant === 'plain' && r.tone === 'caution'))).toEqual([]);
  });

  it('the default tones pass too', () => {
    expect(failing(rows.filter((r) => r.tone === 'default'))).toEqual([]);
  });

  // The full table, for the report: `PRINT_CONTRAST=1 jest countBadgeContrast`.
  if (process.env.PRINT_CONTRAST) {
    it('prints the table', () => {
      const lines = ['| theme | mode | variant | tone | against | ratio |', '|---|---|---|---|---|---|'];
      for (const r of rows) lines.push(`| ${r.theme} | ${r.mode} | ${r.variant} | ${r.tone} | ${r.against} | ${r.ratio.toFixed(2)} |`);
      console.log(lines.join('\n'));
    });
  }
});
