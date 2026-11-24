// The scrim behind BottomSheet, Drawer and the phone dialogs dims the page in dark mode too (T37).
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import { SheetScrim } from '../Sheet';

const scrim = () => {
  render(<SheetScrim reduce={false} />);
  return document.querySelector('[data-sheet-scrim]')!;
};

describe('SheetScrim', () => {
  it('keeps light mode as it was: the inverted surface at 30 %', () => {
    const classes = scrim().className.split(/\s+/);
    expect(classes).toContain('bg-[var(--color-surface-inverted)]/30');
    expect(classes).toContain('absolute');
    expect(classes).toContain('inset-0');
  });

  it('in dark mode takes the ramp\'s darkest step at 50 %, never the inverted surface', () => {
    const dark = scrim().className.split(/\s+/).filter(c => c.startsWith('dark:'));
    expect(dark).toEqual(['dark:bg-[var(--color-surface-0)]/50']);
  });

  it('--color-surface-0 is near black (under #0d0d0d) in both modes of every base theme, and darker than the dark canvas', () => {
    const css = readFileSync(join(__dirname, '..', '..', '..', '..', 'tokens', 'generated', 'themes.css'), 'utf8');
    const blocks = [...css.matchAll(/^((?:html|\.dark)\[data-levain-theme="[^"]+"\][^{]*)\{([^}]*)\}/gm)];
    expect(blocks.length).toBeGreaterThanOrEqual(16); // 8 base themes, light and dark
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const value = (body: string, name: string) => body.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
    for (const [, selector, body] of blocks) {
      const zero = value(body!, 'surface-0');
      expect(zero).toBeDefined();
      expect(lum(zero!)).toBeLessThan(0.05); // darker than #0d0d0d
      if (selector!.includes('.dark')) expect(lum(zero!)).toBeLessThan(lum(value(body!, 'surface-canvas')!));
    }
  });
});
