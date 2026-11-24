/**
 * generated/themes.css (T32): the base themes as plain CSS, written by scripts/generate.ts from the same data as
 * generated/themesV2.json. The committed file must be exactly what the writer makes from that JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import themes from '../../../generated/themesV2.json';
import { baseThemesV2 } from '../../data/baseThemesV2';
import type { ThemesV2Collection } from '../themeTypes';
import { THEMES_MARKER, themeCSS, themeSelector, themeSlug, themesCSS, themeVars } from '../themeCss';

const collection = themes as unknown as ThemesV2Collection;
const cssFile = path.join(__dirname, '../../../generated/themes.css');

describe('generated/themes.css', () => {
  const css = fs.readFileSync(cssFile, 'utf8');

  it('matches what the writer makes from themesV2.json (run pnpm generate-themes if not)', () => {
    expect(css).toBe(themesCSS(collection));
  });

  it('has every base theme, light and dark', () => {
    for (const t of baseThemesV2) {
      const slug = themeSlug(t.name);
      expect(css).toContain(`html[data-levain-theme="${slug}"], [data-levain-theme="${slug}"] {`);
      expect(css).toContain(`.dark[data-levain-theme="${slug}"], .dark [data-levain-theme="${slug}"] {`);
    }
  });

  it('has no !important', () => {
    expect(css).not.toContain('!important');
  });

  it('carries the marker the theme manager looks for', () => {
    expect(css).toContain(`${THEMES_MARKER}: 1;`);
  });

  it('writes each theme mode with its own values', () => {
    const sage = collection['0'];
    const block = themeCSS('sage', sage);
    expect(block).toContain(`--color-surface-canvas: ${sage.light.tokens['surface-canvas']};`);
    expect(block).toContain(`--color-surface-canvas: ${sage.dark.tokens['surface-canvas']};`);
    expect(css).toContain(block);
  });
});

describe('themeCss helpers', () => {
  it('slugs names', () => {
    expect(themeSlug('Cobalt Mono')).toBe('cobalt-mono');
    expect(themeSlug(' Sage ')).toBe('sage');
  });

  it('every base theme has its own slug', () => {
    const slugs = baseThemesV2.map((t) => themeSlug(t.name));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('escapes quotes in an attribute value', () => {
    expect(themeSelector('a"b', 'light')).toBe('html[data-levain-theme="a\\"b"], [data-levain-theme="a\\"b"]');
  });

  // shared.css sets neutral --elevation-* on :root (0,1,0) and a glow on .dark (0,1,0). An app may load themes.css
  // before it (the README's @import does), so each theme's selector must outrank those, not tie and lose on order.
  it('outranks shared.css :root and .dark whatever the load order', () => {
    const specificity = (sel: string) => {
      const ids = (sel.match(/#[\w-]+/g) ?? []).length;
      const classesAttrs = (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!root)[\w-]+/g) ?? []).length + (sel.match(/:root/g) ?? []).length;
      const types = (sel.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/[a-z][\w-]*/gi) ?? []).length;
      return [ids, classesAttrs, types];
    };
    const beats = (a: number[], b: number[]) => {
      for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
      return false;
    };
    const best = (list: string) => list.split(',').map((s) => specificity(s.trim())).sort((a, b) => (beats(a, b) ? -1 : 1))[0];
    expect(specificity(':root')).toEqual([0, 1, 0]);
    expect(specificity('html[data-levain-theme="sage"]')).toEqual([0, 1, 1]);
    expect(beats(best(themeSelector('sage', 'light')), specificity(':root'))).toBe(true);
    expect(beats(best(themeSelector('sage', 'dark')), specificity('.dark'))).toBe(true);
  });

  it('a mode has one var per name (no duplicates)', () => {
    const names = themeVars(collection['0'].light).map(([k]) => k);
    expect(new Set(names).size).toBe(names.length);
  });
});
