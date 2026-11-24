// Reduce Motion: its own file, as framer reads the system setting once per module registry.
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Drawer } from '../Drawer';

const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; });

it('under Reduce Motion the drawer appears in place, with no slide, and goes at once', async () => {
  const { rerender } = render(<Drawer open label="Menu" onClose={() => {}}><p>Body</p></Drawer>);
  const d = screen.getByRole('dialog', { name: 'Menu' });
  // in place from the first render: no offset to slide from (a slide would start at translateX(-100%))
  expect(d.style.transform ?? '').not.toMatch(/translateX\(-/);
  expect(document.querySelector('[data-sheet-scrim]')).toBeInTheDocument();
  rerender(<Drawer open={false} label="Menu" onClose={() => {}}><p>Body</p></Drawer>);
  // an instant exit: gone within a couple of frames, not after sheetOut's 280 ms
  await act(() => new Promise(r => setTimeout(r, 50)));
  expect(screen.queryByRole('dialog')).toBeNull();
});
