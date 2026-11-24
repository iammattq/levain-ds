/**
 * @jest-environment node
 */
/**
 * Every class ui-react names is one Tailwind builds or shared.css defines (T27). A class defined nowhere does nothing,
 * silently: the slider drew no fill, the calendar's month and year panels never slid, the toasts were never styled.
 * The classes are the string literals in a class position (a className attribute or prop, an argument of cn / cva /
 * clsx, a function whose name says it returns classes), built with Tailwind 4 over the real shared.css, as a consumer
 * gets them. Inline `animation`s must name keyframes shared.css defines.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parseSync, traverse, types as t, type NodePath } from '@babel/core';
import { compile } from 'tailwindcss';

const SRC = join(__dirname, '..');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'tests' || f === '__mocks__' ? [] : files(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}
const shared = readFileSync(join(SRC, '..', '..', 'tokens', 'src', 'styles', 'shared.css'), 'utf8');
const theme = readFileSync(join(SRC, '..', 'node_modules', 'tailwindcss', 'theme.css'), 'utf8');

/**
 * Hooks with no styles of their own: Tailwind's group and peer markers, names kept for a selector or a reader, and
 * Toaster's toast-* classes, which its docs (docs/components/Toaster.json) leave for the consumer's stylesheet.
 */
const MARKERS = [/^(group|peer)(\/[\w-]+)?$/, /^highlight-pill$/, /^surface-card$/, /^toast-(base|success|error|warning|info)$/];

const CLASS_CALLS = new Set(['cn', 'cva', 'clsx', 'twMerge']);

/** Whether a string literal sits where a class goes, and is not a variant name, a key or a value it is compared with. */
function inClassPosition(p: NodePath): boolean {
  let child: NodePath = p;
  for (let a = p.parentPath; a; child = a, a = a.parentPath) {
    const n = a.node;
    if (t.isBinaryExpression(n) || (t.isMemberExpression(n) && n.computed && child.node === n.property)) return false;
    if (t.isObjectProperty(n)) {
      const key = t.isIdentifier(n.key) ? n.key.name : t.isStringLiteral(n.key) ? n.key.value : '';
      if (key === 'defaultVariants') return false;
      if (child.node === n.key) {
        // a key is a class in cn({ 'a b': cond }), a variant name in cva's variants
        const call = a.findParent(q => q.isCallExpression());
        return Boolean(call && t.isIdentifier((call.node as t.CallExpression).callee, { name: 'cn' }) || call && t.isIdentifier((call.node as t.CallExpression).callee, { name: 'clsx' }));
      }
      if (/className/i.test(key)) return true;
    }
    if (t.isJSXAttribute(n)) return t.isJSXIdentifier(n.name) && /className$/i.test(n.name.name);
    if (t.isSwitchCase(n) && child.node === n.test) return false;
    // an argument of cn / cva / clsx is a class; of any other call (buttonVariants({ variant: 'primary' })), it is not
    if (t.isCallExpression(n) && child.node !== n.callee) return t.isIdentifier(n.callee) && CLASS_CALLS.has(n.callee.name);
    if (t.isFunction(n)) {
      const id = t.isVariableDeclarator(a.parent) && t.isIdentifier(a.parent.id) ? a.parent.id.name : (n as { id?: { name?: string } }).id?.name ?? '';
      return /class/i.test(id);
    }
  }
  return false;
}

/** The whole class tokens in a string; the halves a `${}` splits are left out. */
function tokensOf(s: string, openStart: boolean, openEnd: boolean) {
  const parts = s.split(/\s+/);
  return parts.filter((x, i) => x && (i > 0 || !openStart) && (i < parts.length - 1 || !openEnd));
}

type Use = { token: string; at: string };
const uses: Use[] = [];
const animations: Use[] = [];
for (const path of files(SRC)) {
  const at = (line: number) => `${path.slice(SRC.length + 1)}:${line}`;
  const ast = parseSync(readFileSync(path, 'utf8'), {
    filename: path,
    presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
    configFile: false,
    babelrc: false,
  });
  traverse(ast!, {
    StringLiteral(p) {
      if (t.isObjectProperty(p.parent) && t.isIdentifier(p.parent.key, { name: 'animation' }))
        animations.push({ token: p.node.value.split(/\s+/)[0], at: at(p.node.loc!.start.line) });
      if (inClassPosition(p)) for (const token of tokensOf(p.node.value, false, false)) uses.push({ token, at: at(p.node.loc!.start.line) });
    },
    TemplateLiteral(p) {
      if (!inClassPosition(p)) return;
      const qs = p.node.quasis;
      qs.forEach((q, i) => {
        const s = q.value.cooked ?? '';
        const openStart = i > 0 && !/^\s/.test(s);
        const openEnd = i < qs.length - 1 && !/\s$/.test(s);
        for (const token of tokensOf(s, openStart, openEnd)) uses.push({ token, at: at(q.loc!.start.line) });
      });
    },
  });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const definedInShared = (name: string) => new RegExp(`\\.${escapeRe(name)}(?![\\w-])`).test(shared);
/** Whether built CSS has a selector for the whole class: `.p-2` must not count because `.p-2xs` exists. */
const builtIn = (css: string, token: string) =>
  new RegExp(`\\.${escapeRe(token.replace(/[^\w-]/g, c => '\\' + c))}(?![\\w\\\\-])`).test(css);

describe('class names (T27)', () => {
  it('finds the classes it checks (cn, cva, className, class-returning helpers)', () => {
    const tokens = new Set(uses.map(u => u.token));
    for (const known of ['animate-slide-in', 'type-label-sm', 'scrollbar-thin', 'rounded-full']) expect(tokens).toContain(known);
    expect(tokens).not.toContain('xs'); // a variant value compared against, not a class
    expect(tokens).not.toContain('default'); // a key into a tone map
  });

  it('matches a whole class, not a longer one it starts', () => {
    const css = '.p-2xs { padding: 1px; }\n.hover\\:bg-x:hover { color: red; }\n.w-1\\/2 { width: 50%; }';
    expect(builtIn(css, 'p-2')).toBe(false);
    expect(builtIn(css, 'p-2xs')).toBe(true);
    expect(builtIn(css, 'hover:bg-x')).toBe(true);
    expect(builtIn(css, 'w-1/2')).toBe(true);
    expect(builtIn(css, 'w-1/20')).toBe(false);
  });

  it('every class is built by Tailwind or defined in shared.css', async () => {
    const compiler = await compile(theme + '\n' + shared + '\n@tailwind utilities;\n', { base: __dirname });
    const css = compiler.build([...new Set(uses.map(u => u.token))]);
    const unknown: Record<string, string[]> = {};
    for (const { token, at } of uses) {
      if (builtIn(css, token) || definedInShared(token) || MARKERS.some(m => m.test(token))) continue;
      (unknown[token] ??= []).push(at);
    }
    expect(unknown).toEqual({});
  });

  it('every inline animation names keyframes shared.css defines', () => {
    expect(animations.length).toBeGreaterThan(0);
    const missing = animations.filter(a => !new RegExp(`@keyframes ${escapeRe(a.token)}\\s*\\{`).test(shared));
    expect(missing).toEqual([]);
  });
});
