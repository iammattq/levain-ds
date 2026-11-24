// Reduce Motion on a phone: its own file, as framer reads the system setting once per module registry.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusCardDialog } from '../StatusCard';
import { PHONE_QUERY } from '../Sheet';

// configurable, and put back as it was: a non-configurable stub can't be removed, and strict mode throws on the delete
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query === PHONE_QUERY || query.includes('prefers-reduced-motion'), media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; });

it('under Reduce Motion the sheet does not rise: it fades in where it lands', () => {
  render(<StatusCardDialog id="T50" title="Restart words" open onClose={() => {}}><p>Body</p></StatusCardDialog>);
  const s = screen.getByRole('dialog');
  expect(s).toHaveAttribute('data-sheet');
  expect(s.style.transform ?? '').not.toContain('100%');
  expect(s.style.opacity).toBe('0');
  fireEvent.keyDown(document, { key: 'Escape' });
});
