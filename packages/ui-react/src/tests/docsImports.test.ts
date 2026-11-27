// The code examples in the doc JSON can be copied into an app: they import from the published package names or the
// peer libraries, never from an app's own paths, and every name they take from @levain/ui-react is exported.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const DOCS = join(ROOT, 'docs');
const ALLOWED = new Set(['@levain/ui-react', '@levain/tokens', 'react', 'lucide-react', 'sonner', '@tanstack/react-table', 'framer-motion']);

const jsonFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return jsonFiles(p);
    return f.endsWith('.json') ? [p] : [];
  });

const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

type Import = { file: string; names: string[]; from: string };
const imports: Import[] = [];
for (const file of jsonFiles(DOCS)) {
  const text = readFileSync(file, 'utf8');
  if (!text.trim()) continue; // docs/components/manifest.json is an empty leftover
  for (const s of strings(JSON.parse(text))) {
    for (const m of s.matchAll(/import\s+(?:[\w*\s]+,\s*)?(?:\{([^}]*)\}\s*)?(?:[\w*\s]+\s*)?from\s+['"]([^'"]+)['"]/g)) {
      const names = (m[1] ?? '').split(',').map((n) => n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean);
      imports.push({ file: file.slice(DOCS.length + 1), names, from: m[2] });
    }
  }
}

const index = readFileSync(join(ROOT, 'index.ts'), 'utf8');
const exported = new Set<string>();
for (const m of index.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
  for (const raw of m[1].split(',')) {
    const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()!.trim();
    if (name) exported.add(name);
  }
}
const iconsModule = readFileSync(join(ROOT, 'src/components/icons.tsx'), 'utf8');

describe('doc examples', () => {
  it('finds the examples', () => {
    expect(imports.length).toBeGreaterThan(50);
  });

  it('import only from the package names and peer libraries', () => {
    const bad = imports.filter((i) => !ALLOWED.has(i.from)).map((i) => `${i.file}: ${i.from}`);
    expect(bad).toEqual([]);
  });

  it('take from @levain/ui-react only names it exports', () => {
    const missing = imports
      .filter((i) => i.from === '@levain/ui-react')
      .flatMap((i) => i.names.filter((n) => !exported.has(n) && !new RegExp(`export\\s+(const|function)\\s+${n}\\b`).test(iconsModule)).map((n) => `${i.file}: ${n}`));
    expect(missing).toEqual([]);
  });
});
