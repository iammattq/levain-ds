// The shipped source prints nothing in normal use: no console.log or console.debug. console.warn and console.error
// stay, for misuse and failures an app should hear about.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PACKAGES = join(__dirname, '../../..');
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'tests' || f === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });

test('no console.log or console.debug in ui-react or tokens source', () => {
  const files = [...sourceFiles(join(PACKAGES, 'ui-react/src')), ...sourceFiles(join(PACKAGES, 'tokens/src'))];
  expect(files.length).toBeGreaterThan(50);
  const hits = files.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .flatMap((line, i) => (/console\.(log|debug)\s*\(/.test(line) ? [`${relative(PACKAGES, f)}:${i + 1}`] : []))
  );
  expect(hits).toEqual([]);
});
