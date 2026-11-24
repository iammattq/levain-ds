#!/usr/bin/env node
// One version for levain: the root package.json, both packages, and ui-react's peer requirement on tokens.
//
//   node scripts/version.mjs check        exits 1 and says what disagrees (CI runs this)
//   node scripts/version.mjs set 0.7.0    writes the version to all four places
//
// The peer requirement is the exact version, not `workspace:^`: apps install levain from git, and pnpm reads a git
// package's package.json as is, so a `workspace:` range reaches them unconverted and the peer reads as unmet.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = 'package.json';
const TOKENS = 'packages/tokens/package.json';
const UI = 'packages/ui-react/package.json';
const SEMVER = /^\d+\.\d+\.\d+$/;

const read = (dir, file) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
const write = (dir, file, json) => writeFileSync(join(dir, file), JSON.stringify(json, null, 2) + '\n');

/** Each place a version is stated, with what it says. */
export function versions(dir) {
  const ui = read(dir, UI);
  return [
    { where: `${ROOT} version`, value: read(dir, ROOT).version },
    { where: `${TOKENS} version`, value: read(dir, TOKENS).version },
    { where: `${UI} version`, value: ui.version },
    { where: `${UI} peerDependencies["@levain/tokens"]`, value: ui.peerDependencies?.['@levain/tokens'] },
  ];
}

/** Problems as lines; empty when every place states the same plain version. */
export function check(dir) {
  const found = versions(dir);
  const problems = found
    .filter(({ value }) => !SEMVER.test(String(value)))
    .map(({ where, value }) => `${where} is ${JSON.stringify(value)}, not a plain version like 0.6.0`);
  const distinct = new Set(found.map(({ value }) => value));
  if (distinct.size > 1) {
    problems.push('The versions disagree:', ...found.map(({ where, value }) => `  ${where}: ${value}`));
  }
  return problems;
}

/** Writes `version` to all four places. */
export function set(dir, version) {
  if (!SEMVER.test(version)) throw new Error(`"${version}" is not a plain version like 0.6.0`);
  for (const file of [ROOT, TOKENS]) write(dir, file, { ...read(dir, file), version });
  const ui = read(dir, UI);
  ui.version = version;
  ui.peerDependencies = { ...ui.peerDependencies, '@levain/tokens': version };
  write(dir, UI, ui);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = fileURLToPath(new URL('..', import.meta.url));
  const [command, version] = process.argv.slice(2);
  if (command === 'check') {
    const problems = check(dir);
    if (problems.length) {
      console.error(problems.join('\n'));
      console.error('Fix with: node scripts/version.mjs set <version>');
      process.exit(1);
    }
    console.log(`levain ${versions(dir)[0].value}: root, both packages and the tokens peer agree`);
  } else if (command === 'set' && version) {
    set(dir, version);
    console.log(`levain set to ${version}`);
  } else {
    console.error('Usage: node scripts/version.mjs check | set <version>');
    process.exit(2);
  }
}
