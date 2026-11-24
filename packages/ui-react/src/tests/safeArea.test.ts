/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'tailwindcss';

/**
 * The safe-area utilities (T12) as Tailwind 4 builds them from the real shared.css: what a consumer gets when its source
 * names `pb-safe` or `pb-safe-md`. Here rather than in tokens because ui-react is the package with Tailwind installed.
 */
const shared = readFileSync(join(__dirname, '..', '..', '..', 'tokens', 'src', 'styles', 'shared.css'), 'utf8');

/** Tailwind's own theme first, as `@import 'tailwindcss'` puts it ahead of shared.css in a consumer's stylesheet. */
const theme = readFileSync(join(__dirname, '..', '..', 'node_modules', 'tailwindcss', 'theme.css'), 'utf8');

const build = async (classes: string[]) => {
  const compiler = await compile(theme + '\n' + shared + '\n@tailwind utilities;\n', { base: __dirname });
  return compiler.build(classes);
};

/** The declarations in the rule for `.<name>` (Tailwind escapes the brackets in its selector), whitespace collapsed. */
const rule = (css: string, name: string) => {
  for (const [, selector, body] of css.matchAll(/^\.(\S+)\s*\{([^}]*)\}/gm)) {
    if (selector.replace(/\\/g, '') === name) return body.replace(/\s+/g, ' ').trim();
  }
  return null;
};

describe('safe-area vars', () => {
  it.each(['top', 'right', 'bottom', 'left'])('--safe-%s reads its env() inset, 0px when there is none', side => {
    expect(shared).toContain(`--safe-${side}: env(safe-area-inset-${side}, 0px);`);
  });

  it('survives tree-shaking: emitted even when no utility uses it', async () => {
    const css = await build([]);
    for (const side of ['top', 'right', 'bottom', 'left']) expect(css).toContain(`--safe-${side}: env(safe-area-inset-${side}, 0px)`);
  });
});

describe('safe-area utilities', () => {
  it.each([
    ['pt-safe', 'padding-top: var(--safe-top);'],
    ['pr-safe', 'padding-right: var(--safe-right);'],
    ['pb-safe', 'padding-bottom: var(--safe-bottom);'],
    ['pl-safe', 'padding-left: var(--safe-left);'],
    ['px-safe', 'padding-left: var(--safe-left); padding-right: var(--safe-right);'],
    ['py-safe', 'padding-top: var(--safe-top); padding-bottom: var(--safe-bottom);'],
    ['p-safe', 'padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);'],
  ])('%s is the inset alone', async (name, declarations) => {
    expect(rule(await build([name]), name)).toBe(declarations);
  });

  it.each([
    ['pb-safe-md', 'padding-bottom: calc(var(--spacing-md) + var(--safe-bottom));'],
    ['pt-safe-2xs', 'padding-top: calc(var(--spacing-2xs) + var(--safe-top));'],
    ['pl-safe-md', 'padding-left: calc(var(--spacing-md) + var(--safe-left));'],
    ['pr-safe-md', 'padding-right: calc(var(--spacing-md) + var(--safe-right));'],
    [
      'px-safe-md',
      'padding-left: calc(var(--spacing-md) + var(--safe-left)); padding-right: calc(var(--spacing-md) + var(--safe-right));',
    ],
    [
      'py-safe-sm',
      'padding-top: calc(var(--spacing-sm) + var(--safe-top)); padding-bottom: calc(var(--spacing-sm) + var(--safe-bottom));',
    ],
    [
      'p-safe-lg',
      'padding: calc(var(--spacing-lg) + var(--safe-top)) calc(var(--spacing-lg) + var(--safe-right)) calc(var(--spacing-lg) + var(--safe-bottom)) calc(var(--spacing-lg) + var(--safe-left));',
    ],
  ])('%s is a spacing step plus the inset', async (name, declarations) => {
    expect(rule(await build([name]), name)).toBe(declarations);
  });

  it('emits the spacing step it adds, so the calc never reads an empty var', async () => {
    expect(await build(['pb-safe-md'])).toMatch(/--spacing-md:\s*1\.5rem/);
  });

  it('produces nothing for a name off the spacing scale', async () => {
    const css = await build(['pb-safe-nope', 'pb-safe-7']);
    expect(rule(css, 'pb-safe-nope')).toBeNull();
    expect(rule(css, 'pb-safe-7')).toBeNull();
  });
});

describe("Sheet's spelling (T24 to T12)", () => {
  /** Every declaration the classes build, with each --safe-* var replaced by the env() it holds. */
  const resolved = async (classes: string[]) => {
    const css = await build(classes);
    const decls = classes.map(c => {
      const found = rule(css, c);
      if (!found) throw new Error(`no rule for ${c}`);
      return found;
    }).join(' ');
    return decls
      .replace(/var\(--safe-(top|right|bottom|left)\)/g, 'env(safe-area-inset-$1, 0px)')
      .replace(/env\(safe-area-inset-(\w+),\s*0px\)/g, 'env(safe-area-inset-$1, 0px)')
      .replace(/\s+/g, ' ');
  };

  it('the body pads exactly as the hand-written env() did', async () => {
    const before = await resolved([
      'pb-[calc(var(--spacing-md)+env(safe-area-inset-bottom,0px))]',
      'pl-[calc(var(--spacing-md)+env(safe-area-inset-left,0px))]',
      'pr-[calc(var(--spacing-md)+env(safe-area-inset-right,0px))]',
    ]);
    expect(await resolved(['pb-safe-md', 'px-safe-md'])).toBe(before);
  });

  it('the head pads exactly as the hand-written env() did', async () => {
    const before = await resolved(['pl-[env(safe-area-inset-left,0px)]', 'pr-[env(safe-area-inset-right,0px)]']);
    expect(await resolved(['px-safe'])).toBe(before);
  });

  it('the cap is the same height', async () => {
    const before = await resolved(['max-h-[calc(100dvh-env(safe-area-inset-top,0px)-2rem)]']);
    expect(await resolved(['max-h-[calc(100dvh-var(--safe-top)-2rem)]'])).toBe(before);
  });
});
