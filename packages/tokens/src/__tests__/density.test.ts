import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../styles/shared.css'), 'utf8');
const rem = (v: string) => parseFloat(v) * (v.trim().endsWith('rem') ? 16 : 1);
function vars(block: string) {
  const out: Record<string, number> = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([0-9.]+(?:rem|px))/g)) out[m[1]!] = rem(m[2]!);
  return out;
}
const theme = vars(css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {'))));
const root = vars(css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {'))));
const start = css.indexOf("[data-density='condensed'] {");
const condensed = vars(css.slice(start, css.indexOf('\n}', start)));
const STEPS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

describe('density: condensed', () => {
  it('tightens every spacing step, in both the utility (--spacing-*) and var() (--space-*) scales, equally', () => {
    for (const s of STEPS) {
      expect(condensed['--spacing-' + s]).toBeLessThan(theme['--spacing-' + s]!);
      expect(condensed['--space-' + s]).toBe(condensed['--spacing-' + s]);
    }
  });

  it('keeps the scale in order, so every spacing invariant (inside never exceeds around) still holds', () => {
    const values = STEPS.map(s => condensed['--spacing-' + s]!);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('tightens radius in order, and never below the next step down', () => {
    const steps = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
    const values = steps.map(s => condensed['--radius-' + s]!);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    for (const s of steps) expect(condensed['--radius-' + s]).toBeLessThanOrEqual(root['--radius-' + s]!);
  });

  it('keeps text legible: nothing below 12px', () => {
    for (const [name, px] of Object.entries(condensed)) if (name.startsWith('--type-')) expect(px).toBeGreaterThanOrEqual(12);
  });
});
