/**
 * Theme colours as plain CSS (T32).
 *
 * One writer for both places the colours reach a page: scripts/generate.ts writes generated/themes.css with it, and
 * themeManager injects the same text when an app hasn't linked that file, or for a custom theme made at runtime. So
 * the file and the runtime CSS can't drift.
 *
 * A theme's colours sit under `[data-levain-theme="<slug>"]` (light) and `.dark` with it (dark), no `!important`.
 * Neither depends on load order against shared.css, which sets neutral `--elevation-*` on `:root` (0,1,0) and a glow on
 * `.dark` (0,1,0): light adds `html[data-levain-theme]` (0,1,1) and dark is `.dark[data-levain-theme]` (0,2,0). The
 * bare `[data-levain-theme]` stays for a theme set on an element below <html>.
 */
import type { GeneratedThemeMode } from '../generator/types';
import type { ThemesV2Collection, ThemeV2Entry } from './themeTypes';

/** The attribute on <html> (or any element) that picks a theme. */
export const THEME_ATTR = 'data-levain-theme';

/**
 * The attribute any element below the theme's can carry to use one mode's colours of the current theme inside the
 * other (T72): `data-levain-scheme="light"` in a dark page, or `"dark"` in a light one. Colour variables only: the
 * `.dark` class, and the `dark:` styles that follow it, stay the page's.
 */
export const SCHEME_ATTR = 'data-levain-scheme';

/** Set on :root by the theme CSS, so the theme manager can tell the file is already on the page. */
export const THEMES_MARKER = '--levain-themes';

/** A theme's name as its attribute value: "Cobalt Mono" → "cobalt-mono". */
export function themeSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A value safe inside a double-quoted CSS attribute selector. */
function attrValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

/** The selectors for one theme in one mode. */
export function themeSelector(value: string, mode: 'light' | 'dark'): string {
  const attr = `[${THEME_ATTR}="${attrValue(value)}"]`;
  return mode === 'light' ? `html${attr}, ${attr}` : `.dark${attr}, .dark ${attr}`;
}

/**
 * The selector for one theme's scheme scope: an element carrying `data-levain-scheme="<mode>"` below the theme's. It
 * matches the scoped element itself, so it beats what that element would inherit from the page's mode.
 */
export function schemeSelector(value: string, mode: 'light' | 'dark'): string {
  return `[${THEME_ATTR}="${attrValue(value)}"] [${SCHEME_ATTR}="${mode}"]`;
}

/**
 * Every colour variable of one theme mode, as `name: value` pairs, in the order themeManager always wrote them:
 * primary/accent (through tokenMapping), the base alias, the surface ramp, the primary and accent ramps, the semantic
 * tokens, actions, spectrum, states, text-on colours, gradients and elevation.
 */
export function themeVars(m: GeneratedThemeMode): Array<[string, string]> {
  const vars: Array<[string, string]> = [];
  const add = (name: string, value: string) => vars.push([name, value]);

  const primary = m.tokens['primary'] ?? m.primary;
  const accent = m.tokens['accent'] ?? m.accent;
  add('--color-primary', primary);
  add('--color-accent', accent);
  add('--color-base', primary);
  m.surfaces.forEach((c, i) => add(`--color-surface-${i}`, c));
  m.primaryRamp.forEach((c, i) => add(`--color-primary-${(i + 1) * 100}`, c));
  m.accentRamp.forEach((c, i) => add(`--color-accent-${(i + 1) * 100}`, c));
  // Brand semantics are written explicitly above and below.
  const brand = new Set(['primary', 'accent', 'gradient-start', 'gradient-end']);
  Object.entries(m.tokens).forEach(([k, v]) => {
    if (!brand.has(k)) add(`--color-${k}`, v);
  });
  Object.entries(m.actions).forEach(([k, v]) => add(`--color-${k}`, v));
  Object.entries(m.spectrum ?? {}).forEach(([k, v]) => add(`--color-spectrum-${k}`, v));
  add('--color-state-hover', m.states.hover);
  add('--color-state-focus', m.states.focus);
  add('--color-state-active', m.states.active);
  add('--color-text-on-primary', m.textOnPrimary);
  add('--color-text-on-accent', m.textOnAccent);
  const gradStart = m.tokens['gradient-start'] ?? m.primaryRamp[2];
  const gradEnd = m.tokens['gradient-end'] ?? m.primaryRamp[6];
  add('--color-gradient-start', gradStart);
  add('--color-gradient-end', gradEnd);
  add('--color-grad-1', `linear-gradient(to bottom right, ${gradStart}, ${gradEnd})`);
  add('--color-grad-2', `linear-gradient(to right, ${gradStart}, ${gradEnd})`);
  add('--color-elevation-low', m.elevationColors.low);
  add('--color-elevation-default', m.elevationColors.default);
  add('--color-elevation-high', m.elevationColors.high);
  add('--elevation-1', m.elevationStyles.level1);
  add('--elevation-2', m.elevationStyles.level2);
  add('--elevation-3', m.elevationStyles.level3);
  return vars;
}

/** A rule block: `selector {\n  name: value;\n…}\n`. */
export function cssBlock(selector: string, vars: Array<[string, string]>): string {
  return `${selector} {\n${vars.map(([k, v]) => `  ${k}: ${v};\n`).join('')}}\n`;
}

/**
 * One theme, light and dark, under the attribute value given (a base theme's slug, or `user-<id>`). Each mode's block
 * also carries that mode's scheme scope (`data-levain-scheme`), so the scope costs a selector, not a second copy.
 */
export function themeCSS(value: string, entry: Pick<ThemeV2Entry, 'light' | 'dark'>): string {
  const block = (mode: 'light' | 'dark') =>
    cssBlock(`${themeSelector(value, mode)}, ${schemeSelector(value, mode)}`, themeVars(entry[mode]));
  return block('light') + block('dark');
}

/** The selector swatches' vars (`--color-theme-<index>-primary/-secondary`), light on :root and dark on .dark. */
export function swatchCSS(themes: ThemesV2Collection): string {
  const swatches = (mode: 'light' | 'dark') =>
    Object.entries(themes).flatMap(([i, t]): Array<[string, string]> => [
      [`--color-theme-${i}-primary`, t[mode].primary],
      [`--color-theme-${i}-secondary`, t[mode].accent],
    ]);
  return cssBlock(':root', swatches('light')) + cssBlock('.dark', swatches('dark'));
}

/** Every base theme: the marker, the swatches and each theme's colours. The text of generated/themes.css. */
export function themesCSS(themes: ThemesV2Collection): string {
  const header =
    '/* @levain/tokens base themes. Generated by scripts/generate.ts from src/data/baseThemesV2.ts: do not edit.\n' +
    ` * Put ${THEME_ATTR}="<theme>" on <html> (and .dark for dark mode) to apply one; ${SCHEME_ATTR}="light" (or "dark")
 * on an element below gives it that mode's colours. */\n`;
  return (
    header +
    cssBlock(':root', [[THEMES_MARKER, '1']]) +
    swatchCSS(themes) +
    Object.values(themes)
      .map((t) => themeCSS(themeSlug(t.name), t))
      .join('')
  );
}
