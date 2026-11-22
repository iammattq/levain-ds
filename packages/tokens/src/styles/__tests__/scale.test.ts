/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The spacing scale is declared twice in shared.css — once in @theme (where
 * Tailwind reads it to generate p-md / gap-lg utilities) and once in :root
 * (where runtime CSS and var() lookups read it).
 *
 * The duplication is deliberate: Tailwind strips @theme tokens whose utility
 * never appears in scanned source, so runtime references cannot safely point
 * at the @theme copy (ADR-010). What it costs is the risk of the two lists
 * drifting apart, which is what these tests exist to prevent.
 */
describe('spacing scale', () => {
  const css = readFileSync(
    join(__dirname, '..', 'shared.css'),
    'utf8'
  );

  /** Pull `--<prefix>-<name>: <value>;` declarations out of a CSS block. */
  function declarations(prefix: string): Map<string, string> {
    const found = new Map<string, string>();
    const pattern = new RegExp(`--${prefix}-([a-z0-9]+)\\s*:\\s*([^;]+);`, 'g');

    for (const [, name, value] of css.matchAll(pattern)) {
      found.set(name, value.trim());
    }

    return found;
  }

  const theme = declarations('spacing');
  const root = declarations('space');

  it('declares both copies of the scale', () => {
    expect(theme.size).toBeGreaterThan(0);
    expect(root.size).toBeGreaterThan(0);
  });

  it('keeps the @theme and :root copies in agreement', () => {
    // --space-0 has no utility counterpart; every other step must match.
    const steps = [...root.keys()].filter((name) => name !== '0');

    expect([...theme.keys()].sort()).toEqual([...steps].sort());

    for (const step of steps) {
      expect(`--spacing-${step}: ${theme.get(step)}`).toBe(
        `--spacing-${step}: ${root.get(step)}`
      );
    }
  });

  it('grows monotonically', () => {
    const order = [
      '3xs',
      '2xs',
      'xs',
      'sm',
      'md',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
    ];
    const rems = order.map((step) => {
      const value = root.get(step);
      expect(value).toMatch(/^[\d.]+rem$/);
      return parseFloat(value as string);
    });

    expect(rems).toEqual([...rems].sort((a, b) => a - b));
  });

  it('separates adjacent steps by at least 1.3x so the choice between them is never arbitrary', () => {
    const order = [
      '3xs',
      '2xs',
      'xs',
      'sm',
      'md',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
    ];
    const rems = order.map((step) => parseFloat(root.get(step) as string));

    for (let i = 1; i < rems.length; i++) {
      expect(rems[i] / rems[i - 1]).toBeGreaterThanOrEqual(1.3);
    }
  });

  it('lands every step on a whole number of pixels at a 16px root', () => {
    for (const [name, value] of root) {
      if (name === '0') continue;

      const px = parseFloat(value) * 16;
      expect(Number.isInteger(px)).toBe(true);
    }
  });
});

describe('containment', () => {
  const css = readFileSync(join(__dirname, '..', 'shared.css'), 'utf8');

  it.each(['--measure', '--gutter', '--gutter-gap', '--spine', '--container-page'])(
    'declares %s',
    (token) => {
      expect(css).toContain(`${token}:`);
    }
  );

  it('builds the spine from its parts rather than hardcoding a width', () => {
    expect(css).toMatch(
      /--spine:\s*calc\(\s*var\(--gutter\)\s*\+\s*var\(--gutter-gap\)\s*\+\s*var\(--measure\)\s*\)/
    );
  });

  it('keeps the measure in the range a line of prose can be read across', () => {
    const measure = css.match(/--measure:\s*([\d.]+)rem/);
    expect(measure).not.toBeNull();

    // The classic guidance is 45-75 characters, but characters-per-rem
    // depends entirely on the face — the same 42rem is ~84ch in a narrow
    // sans and ~70ch in a wide serif. So this is a guardrail against a
    // measure that is obviously wrong, not a precise ch assertion.
    const rem = parseFloat(measure![1]);
    expect(rem).toBeGreaterThanOrEqual(30);
    expect(rem).toBeLessThanOrEqual(48);
  });
});
