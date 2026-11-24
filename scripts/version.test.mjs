import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, set } from './version.mjs';

function repo({ root = '0.6.0', tokens = '0.6.0', ui = '0.6.0', peer = '0.6.0' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'levain-version-'));
  mkdirSync(join(dir, 'packages/tokens'), { recursive: true });
  mkdirSync(join(dir, 'packages/ui-react'), { recursive: true });
  const put = (file, json) => writeFileSync(join(dir, file), JSON.stringify(json, null, 2) + '\n');
  put('package.json', { name: 'levain-ds', version: root, private: true });
  put('packages/tokens/package.json', { name: '@levain/tokens', version: tokens });
  put('packages/ui-react/package.json', {
    name: '@levain/ui-react',
    version: ui,
    peerDependencies: { '@levain/tokens': peer, react: '^19.0.0' },
    devDependencies: { '@levain/tokens': 'workspace:*' },
  });
  return dir;
}

test('the repo itself agrees', () => {
  assert.deepEqual(check(new URL('..', import.meta.url).pathname), []);
});

test('agreeing versions pass', () => {
  assert.deepEqual(check(repo()), []);
});

test('a package on another version fails, naming each place', () => {
  const problems = check(repo({ tokens: '0.5.0' }));
  assert.ok(problems.length > 0);
  assert.ok(problems.some((line) => line.includes('packages/tokens/package.json version: 0.5.0')));
});

test('a peer requirement that differs from the packages fails', () => {
  assert.ok(check(repo({ peer: '0.3.0' })).length > 0);
});

test('a workspace: or range peer fails even when nothing else differs', () => {
  assert.ok(check(repo({ peer: 'workspace:^' })).some((line) => line.includes('not a plain version')));
  assert.ok(check(repo({ peer: '^0.6.0' })).length > 0);
});

test('set writes all four places and keeps the other fields', () => {
  const dir = repo({ root: '0.2.3', tokens: '0.3.2', ui: '0.3.2', peer: '0.3.0' });
  set(dir, '0.7.0');
  assert.deepEqual(check(dir), []);
  const ui = JSON.parse(readFileSync(join(dir, 'packages/ui-react/package.json'), 'utf8'));
  assert.equal(ui.version, '0.7.0');
  assert.deepEqual(ui.peerDependencies, { '@levain/tokens': '0.7.0', react: '^19.0.0' });
  assert.equal(ui.devDependencies['@levain/tokens'], 'workspace:*');
});

test('set refuses something that is not a plain version', () => {
  const dir = repo();
  assert.throws(() => set(dir, 'v0.7.0'));
  assert.deepEqual(check(dir), []);
});
