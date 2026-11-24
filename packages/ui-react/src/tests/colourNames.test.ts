/**
 * Every colour variable ui-react names is one every theme defines (T27). A name no theme defines resolves to nothing,
 * so the property falls back to its inherited or initial value: near-black borders, no row highlight, a caution tone
 * that is never amber. Each `--color-…` in the source counts, a fallback's included: `var(--color-a, var(--color-b))`
 * passes only when both are defined, since a fallback that is ever used means the first name is the wrong one.
 * Names built at runtime (`--color-surface-${i}`) pass when a defined name completes the prefix with digits.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { themeManager } from '@levain/tokens';
import themes from '../../../tokens/generated/themesV2.json';

const SRC = join(__dirname, '..');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'tests' || f === '__mocks__' ? [] : files(p);
    return /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}
const sources = [...files(SRC), join(SRC, '..', 'index.ts')].map(p => ({ p: p.slice(SRC.length + 1), s: readFileSync(p, 'utf8') }));

const declared = (css: string) => new Set([...css.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map(m => m[1]));
const shared = declared(readFileSync(join(SRC, '..', '..', 'tokens', 'src', 'styles', 'shared.css'), 'utf8'));

/** Theme × mode → the names its injected CSS defines, shared.css's added. */
type Mode = Parameters<typeof themeManager.generateThemeCSS>[0];
const defined = Object.values(themes as unknown as Record<string, { name: string; light: Mode; dark: Mode }>).flatMap(t =>
  (['light', 'dark'] as const).map(mode => ({
    theme: `${t.name} ${mode}`,
    names: new Set([...declared(themeManager.generateThemeCSS(t[mode])), ...shared]),
  }))
);

/** Each `--color-…` in the source with where it is; `prefix` when it is followed by `${`. */
const references = sources.flatMap(f =>
  f.s.split('\n').flatMap((line, i) =>
    [...line.matchAll(/--color-[a-z0-9-]*[a-z0-9-](\$\{)?/g)].map(m => ({
      name: m[1] ? m[0].slice(0, -2) : m[0],
      prefix: Boolean(m[1]),
      at: `${f.p}:${i + 1}`,
    }))
  )
);

const isDefined = (names: Set<string>, ref: { name: string; prefix: boolean }) =>
  ref.prefix ? [...names].some(n => n.startsWith(ref.name) && /^\d+$/.test(n.slice(ref.name.length))) : names.has(ref.name);

describe('colour names (T27)', () => {
  it('reads every theme in both modes, and finds the names it scans for', () => {
    expect(defined.length).toBe(Object.keys(themes).length * 2);
    expect(defined.every(d => d.names.has('--color-border-default') && d.names.has('--color-caution'))).toBe(true);
    expect(references.length).toBeGreaterThan(100);
  });

  it('every --color-… name in ui-react is defined by every theme, light and dark', () => {
    const missing = new Map<string, Set<string>>();
    for (const ref of references) {
      const lacking = defined.filter(d => !isDefined(d.names, ref)).map(d => d.theme);
      if (lacking.length === 0) continue;
      const key = `${ref.name}${ref.prefix ? '${…}' : ''}${lacking.length < defined.length ? ` (not in ${lacking.join(', ')})` : ''}`;
      if (!missing.has(key)) missing.set(key, new Set());
      missing.get(key)!.add(ref.at);
    }
    expect(Object.fromEntries([...missing].map(([k, v]) => [k, [...v]]))).toEqual({});
  });
});
