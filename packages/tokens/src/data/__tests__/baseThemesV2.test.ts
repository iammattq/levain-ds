/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { baseThemesV2 } from '../baseThemesV2';
import { themeGeneratorV2 } from '../../generator';
import type { GeneratedThemeMode } from '../../generator/types';

/**
 * Ladder invariants, checked against every SHIPPED theme rather than against
 * DEFAULT_TOKEN_MAPPING.
 *
 * A theme may override any part of the mapping, and an override that shifts
 * the surface ladder without shifting the borders with it reintroduces exactly
 * the collisions these rules exist to prevent. Testing the defaults alone
 * cannot catch that — Sage did precisely this.
 */
describe('baseThemesV2 ladder invariants', () => {
  const modes = ['light', 'dark'] as const;

  const surfaceLadder = [
    'surface-canvas',
    'surface-section',
    'surface-card',
    'surface-component',
    'surface-elevated',
  ] as const;

  const borders = ['border-subtle', 'border-default', 'border-emphasis'] as const;

  /** Resolve a mode's semantic tokens back to their index on its own ramp. */
  function indexOf(mode: GeneratedThemeMode, token: string): number {
    const value = (mode.tokens as Record<string, string>)[token];
    const index = mode.surfaces.findIndex(
      (swatch) => swatch.toLowerCase() === value.toLowerCase()
    );

    expect(index).toBeGreaterThanOrEqual(0);
    return index;
  }

  const generated = baseThemesV2.map((input) => ({
    name: input.name,
    theme: themeGeneratorV2.generate(input),
  }));

  describe.each(generated)('$name', ({ theme }) => {
    it.each(modes)(
      'climbs the surface ladder strictly in %s mode',
      (modeName) => {
        const mode = theme[modeName];
        const indices = surfaceLadder.map((token) => indexOf(mode, token));

        expect(indices).toEqual([...indices].sort((a, b) => a - b));
        expect(new Set(indices).size).toBe(surfaceLadder.length);
      }
    );

    it('keeps every border below the surface ladder in light mode', () => {
      const mode = theme.light;
      const floor = indexOf(mode, 'surface-canvas');

      for (const border of borders) {
        expect(indexOf(mode, border)).toBeLessThan(floor);
      }
    });

    it('keeps every border above the surface ladder in dark mode', () => {
      const mode = theme.dark;
      const ceiling = indexOf(mode, 'surface-elevated');

      for (const border of borders) {
        expect(indexOf(mode, border)).toBeGreaterThan(ceiling);
      }
    });

    it.each(modes)(
      'gives no two ladder rungs the same colour in %s mode',
      (modeName) => {
        const mode = theme[modeName];
        const colours = surfaceLadder.map(
          (token) => (mode.tokens as Record<string, string>)[token].toLowerCase()
        );

        expect(new Set(colours).size).toBe(surfaceLadder.length);
      }
    );
  });
});
