// Reduce Motion: its own file, as framer reads the system setting once per module registry.
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FabMenu, FAB_SIZE } from '../FabMenu';

const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; });

const items = [{ label: 'One', content: <p>One</p> }, { label: 'Two', content: <p>Two</p> }];
const fab = () => document.querySelector<HTMLElement>('[data-fab-menu]')!;
const contents = () => document.querySelector<HTMLElement>('[data-fab-content]')!;
const press = async (el: Element) => { await act(async () => { fireEvent.click(el); }); };

it('under Reduce Motion: no morph (the shape changes in one step), the contents only fade, no rise, no slide', async () => {
  jest.useFakeTimers();
  render(<FabMenu items={items} />);
  const trigger = document.querySelector<HTMLButtonElement>('[data-fab-trigger]')!;
  await press(trigger);
  expect(fab().style.transition).toBe('none');
  expect(fab().style.getPropertyValue('--fab-r')).toBe('var(--radius-xl)');
  expect(contents().style.transition).toBe('opacity 160ms ease-out');
  expect(contents().style.transform).toBe('none');
  expect(contents().style.opacity).toBe('1');
  await press(document.querySelector('[data-fab-item="Two"]')!);
  expect(document.querySelector<HTMLElement>('[data-fab-level="Two"]')!.style.transition).toBe('none');
  expect(document.querySelector<HTMLElement>('[data-glyph="menu"] > span')!.style.transition).toBe('none');
  // closing: the contents fade, then the shape and fill go back in one step at 160ms, never interpolated
  await press(trigger);
  expect(fab().style.transition).toBe('width 0s 160ms, height 0s 160ms, border-radius 0s 160ms, background-color 0s 160ms, color 0s 160ms');
  expect(fab().style.getPropertyValue('--fab-w')).toBe(`${FAB_SIZE}px`);
  expect(contents().style.transform).toBe('none');
  expect(contents().style.opacity).toBe('0');
  // jsdom lists no animations: the net settles it
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(fab()).not.toHaveAttribute('data-closing');
  expect(contents().style.visibility).toBe('hidden');
  jest.useRealTimers();
});
