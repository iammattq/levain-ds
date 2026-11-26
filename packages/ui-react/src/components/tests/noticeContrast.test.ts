/**
 * @jest-environment node
 */
// T62: each Notice tone's text on its background in Sage and Cobalt Mono, light and dark (4.5:1), and its background
// against the page surfaces it sits on (each under 3:1, which is why every tone has a border; recorded, not asserted).
import { baseThemesV2, themeGeneratorV2 } from '@levain/tokens';
import { noticeTokens, type NoticeTone } from '../Notice';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const THEMES = ['Sage', 'Cobalt Mono', 'Cobalt Warm'];
const TONES = Object.keys(noticeTokens) as NoticeTone[];
const PAGES = ['surface-canvas', 'surface-section', 'surface-card'];

type Row = { theme: string; mode: 'light' | 'dark'; tone: NoticeTone; fg: string; bg: string; text: number; button: number; page: Record<string, number> };
const rows: Row[] = THEMES.flatMap((name) => {
  const input = baseThemesV2.find((t) => t.name === name);
  if (!input) throw new Error('missing theme ' + name);
  const theme = themeGeneratorV2.generate(input);
  return (['light', 'dark'] as const).flatMap((mode) => {
    const t = { ...theme[mode].tokens, ...theme[mode].actions } as Record<string, string>;
    return TONES.map((tone) => {
      const { fg, bg } = noticeTokens[tone];
      return {
        theme: name, mode, tone, fg: t[fg]!, bg: t[bg]!,
        text: contrast(t[fg]!, t[bg]!),
        // the ghost Dismiss/Retry button's label colour on the tone's background
        button: contrast(t['text-default']!, t[bg]!),
        page: Object.fromEntries(PAGES.map((p) => [p, contrast(t[bg]!, t[p]!)])),
      };
    });
  });
});
const key = (r: Row) => `${r.theme} ${r.mode} ${r.tone}`;

describe('Notice contrast (T62)', () => {
  it('reads every tone in both themes and modes', () => {
    expect(rows).toHaveLength(THEMES.length * 2 * TONES.length);
  });

  it("each tone's text passes 4.5:1 on its background", () => {
    expect(rows.filter((r) => !(r.text >= 4.5)).map((r) => `${key(r)} ${r.text.toFixed(2)}`)).toEqual([]);
  });

  it("a ghost button's label passes 4.5:1 on each tone's background", () => {
    expect(rows.filter((r) => !(r.button >= 4.5)).map((r) => `${key(r)} ${r.button.toFixed(2)}`)).toEqual([]);
  });

  // The full table, for the report: `PRINT_CONTRAST=1 jest noticeContrast`.
  if (process.env.PRINT_CONTRAST) {
    it('prints the table', () => {
      const lines = rows.map((r) => `| ${r.theme} | ${r.mode} | ${r.tone} | ${r.fg} on ${r.bg} | ${r.text.toFixed(2)} | ${r.button.toFixed(2)} | ${PAGES.map((p) => r.page[p]!.toFixed(2)).join(' / ')} |`);
      console.log(['| theme | mode | tone | colours | text | button label | bg vs canvas / section / card |', '|---|---|---|---|---|---|---|', ...lines].join('\n'));
    });
  }
});
