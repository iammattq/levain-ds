/**
 * generated/themes.css (T32): the base themes as plain CSS, written by scripts/generate.ts from the same data as
 * generated/themesV2.json. The committed file must be exactly what the writer makes from that JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import themes from '../../../generated/themesV2.json';
import { baseThemesV2 } from '../../data/baseThemesV2';
import type { ThemesV2Collection } from '../themeTypes';
import { SCHEME_ATTR, THEMES_MARKER, schemeSelector, themeCSS, themeSelector, themeSlug, themesCSS, themeVars } from '../themeCss';

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
      expect(css).toContain(
        `html[data-levain-theme="${slug}"], [data-levain-theme="${slug}"], [data-levain-theme="${slug}"] [data-levain-scheme="light"] {`
      );
      expect(css).toContain(
        `.dark[data-levain-theme="${slug}"], .dark [data-levain-theme="${slug}"], [data-levain-theme="${slug}"] [data-levain-scheme="dark"] {`
      );
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

// T72: data-levain-scheme gives an element below the theme's one mode's colours inside the other.
describe('scheme scope', () => {
  const css = fs.readFileSync(cssFile, 'utf8');
  const blockOf = (selector: string) => {
    const at = css.indexOf(selector);
    if (at < 0) return '';
    const start = css.lastIndexOf('\n', at) + 1; // the whole selector list
    return css.slice(start, css.indexOf('}', at));
  };

  it('the attribute and its selector', () => {
    expect(SCHEME_ATTR).toBe('data-levain-scheme');
    expect(schemeSelector('cobalt-mono', 'light')).toBe('[data-levain-theme="cobalt-mono"] [data-levain-scheme="light"]');
    expect(schemeSelector('a"b', 'dark')).toBe('[data-levain-theme="a\\"b"] [data-levain-scheme="dark"]');
  });

  it('every base theme carries both scopes, each with that mode\'s colours', () => {
    for (const t of Object.values(collection)) {
      const slug = themeSlug(t.name);
      for (const mode of ['light', 'dark'] as const) {
        const block = blockOf(schemeSelector(slug, mode));
        expect(block).not.toBe('');
        // the same block as the mode's own: every var, the mode's values
        expect(block).toContain(themeSelector(slug, mode));
        for (const [k, v] of themeVars(t[mode])) expect(block).toContain(`  ${k}: ${v};`);
      }
    }
  });

  it('a runtime theme (a user theme\'s attribute) gets the scopes too', () => {
    const out = themeCSS('user-abc', collection['0']);
    expect(out).toContain(`${schemeSelector('user-abc', 'light')} {`);
    expect(out).toContain(`${schemeSelector('user-abc', 'dark')} {`);
  });

  // The scoped element matches the rule itself, so it beats what it would inherit from .dark on <html>; it also
  // outranks shared.css's .dark glow (0,1,0) set on any element carrying .dark.
  it('matches the scoped element itself and outranks .dark', () => {
    const sel = schemeSelector('sage', 'light');
    const attrs = (sel.match(/\[[^\]]+\]/g) ?? []).length;
    expect(attrs).toBe(2); // (0,2,0) > .dark (0,1,0)
    // the last compound is the scope attribute: the rule lands on the scoped element, not an ancestor
    expect(sel.trim().split(/\s+/).pop()).toBe('[data-levain-scheme="light"]');
  });
});
