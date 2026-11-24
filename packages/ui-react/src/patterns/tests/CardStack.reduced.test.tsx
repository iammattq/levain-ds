// Reduce Motion: its own file, as framer reads the system setting once per module registry.
import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardStack, rowGeometry } from '../CardStack';

const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const ownRO = (window as { ResizeObserver?: unknown }).ResizeObserver;
const ownWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  (window as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.hasAttribute('data-stack-row') ? 1054 : 0; } });
});
afterAll(() => {
  if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia;
  (window as { ResizeObserver?: unknown }).ResizeObserver = ownRO;
  if (ownWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', ownWidth);
});

it('under Reduce Motion the row follows the scroll without the spring: a frame later each card is where it goes', async () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];
  render(<CardStack items={items} getKey={k => k} renderItem={k => <div><p>{k}</p></div>} variant="row" label="Your work" />);
  const g = rowGeometry(1054, 232);
  const x = (id: string) => Number(/translateX\((-?[\d.]+)px\)/.exec((document.querySelector(`[data-stack-card="${id}"]`)!.parentElement as HTMLElement).style.transform)?.[1] ?? 0);
  act(() => { document.querySelector('[data-stack-row]')!.dispatchEvent(new WheelEvent('wheel', { deltaX: g.STEP, bubbles: true, cancelable: true })); });
  await act(() => new Promise(r => setTimeout(r, 30)));
  expect(x('b')).toBeCloseTo(g.left);
  expect(x('e')).toBeCloseTo(g.right);
});
