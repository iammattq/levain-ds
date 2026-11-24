// Every exported piece has a doc JSON and a manifest entry, and every doc and manifest entry names something exported.
// Today's missing ones are listed in docsCoverageGaps.txt, one line each; filling a gap means deleting its line.
//
// A piece is a component index.ts exports as a value from src/components, src/patterns, src/templates or src/provider
// (a PascalCase name; hooks, functions, *Variants and CONSTANTS are not pieces), with icons.tsx counted as one piece,
// Icons. A piece is documented by a doc whose name is the piece, or by a subcomponents entry in another doc (Card lists
// CardContent); a piece documented that way needs no manifest entry of its own. Each subcomponents name must be
// exported, as a piece or a type.
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const DOCS = join(ROOT, 'docs');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const PIECE_DIRS = /^\.\/src\/(components|patterns|templates|provider)\//;
const pieces = new Set<string>();
const exportedTypes = new Set<string>();
const utilModules = new Set<string>();
const index = read('index.ts');
const understood = new Set<number>(); // where each export statement the parse read starts
for (const m of index.matchAll(/export\s*(type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
  understood.add(m.index!);
  const [, typeOnly, names, from] = m;
  if (from.startsWith('./src/utils/')) utilModules.add(from.slice('./src/utils/'.length));
  for (const raw of names.split(',')) {
    const item = raw.trim();
    if (!item) continue;
    const isType = !!typeOnly || item.startsWith('type ');
    const name = item.replace(/^type\s+/, '').split(/\s+as\s+/).pop()!.trim();
    if (isType) exportedTypes.add(name);
    else if (PIECE_DIRS.test(from) && /^[A-Z][a-z]/.test(name)) pieces.add(name);
  }
}
for (const m of index.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
  understood.add(m.index!);
  if (m[1] !== './src/components/icons') {
    throw new Error(`docsCoverage: index.ts has \`export * from '${m[1]}'\`; say what pieces it adds (icons count as one, Icons)`);
  }
  pieces.add('Icons');
}
// Any other export form (export *, export const, export default...) would add pieces the parse can't see: fail loudly.
const unread = [...index.matchAll(/^export\b.*$/gm)].filter(m => !understood.has(m.index!)).map(m => m[0]);
if (unread.length) throw new Error(`docsCoverage: index.ts exports the parse doesn't read:\n${unread.join('\n')}`);

type Doc = { name: string; subcomponents?: { name: string }[] };
const docs: { file: string; doc: Doc }[] = [];
for (const dir of ['components', 'patterns', 'templates', 'utils']) {
  for (const f of readdirSync(join(DOCS, dir))) {
    if (!f.endsWith('.json') || f === 'manifest.json') continue; // docs/components/manifest.json is an empty leftover
    docs.push({ file: `${dir}/${f}`, doc: JSON.parse(readFileSync(join(DOCS, dir, f), 'utf8')) });
  }
}
const componentDocs = docs.filter(d => !d.file.startsWith('utils/'));
const ownDoc = new Set(componentDocs.map(d => d.doc.name));
const asSub = new Set(componentDocs.flatMap(d => (d.doc.subcomponents ?? []).map(s => s.name)));
const manifest = new Set((JSON.parse(read('docs/manifest.json')) as { name: string }[]).map(e => e.name));

// What is missing today, computed: "<Piece> doc" or "<Piece> manifest".
// and "<Name> unexported": a doc lists it in subcomponents, but index.ts doesn't export it (as a piece or a type).
const missing: string[] = [];
for (const p of [...pieces].sort()) {
  const documented = ownDoc.has(p) || asSub.has(p);
  if (!documented) missing.push(`${p} doc`);
  if (!manifest.has(p) && !(asSub.has(p) && !ownDoc.has(p))) missing.push(`${p} manifest`);
}

for (const d of componentDocs) {
  for (const s of d.doc.subcomponents ?? []) {
    if (!pieces.has(s.name) && !exportedTypes.has(s.name)) missing.push(`${s.name} unexported`);
  }
}

const gaps = read('src/tests/docsCoverageGaps.txt')
  .split('\n')
  .map(l => l.replace(/#.*/, '').trim())
  .filter(Boolean);

describe('docs coverage', () => {
  it('finds the pieces (sanity: the parse sees the index)', () => {
    for (const p of ['Button', 'Card', 'Stack', 'Cluster', 'StatusCard', 'GradientCard', 'Icons', 'PageTemplate']) {
      expect(pieces).toContain(p);
    }
    for (const notPiece of ['useIsPhone', 'buttonVariants', 'morphId', 'COLUMN_STRIP_EDGE', 'ButtonProps', 'cn']) {
      expect(pieces).not.toContain(notPiece);
    }
  });

  it('every piece has a doc and a manifest entry, and every subcomponents name is exported, unless its line is in docsCoverageGaps.txt', () => {
    expect(missing.filter(m => !gaps.includes(m))).toEqual([]);
  });

  it('docsCoverageGaps.txt lists only what is still missing (delete a line once its doc or entry exists)', () => {
    expect(gaps.filter(g => !missing.includes(g))).toEqual([]);
    expect(gaps.filter((g, i) => gaps.indexOf(g) !== i)).toEqual([]);
  });

  it('every doc names an exported piece (a utils doc: a src/utils module index.ts exports from)', () => {
    const bad = docs
      .filter(d => (d.file.startsWith('utils/') ? !utilModules.has(d.doc.name) : !pieces.has(d.doc.name)))
      .map(d => `${d.file}: ${d.doc.name}`);
    expect(bad).toEqual([]);
  });

  it('every manifest entry names an exported piece', () => {
    expect([...manifest].filter(n => !pieces.has(n))).toEqual([]);
  });
});

