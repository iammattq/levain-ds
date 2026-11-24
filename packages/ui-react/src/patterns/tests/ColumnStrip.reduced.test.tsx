// Reduce Motion: its own file, as framer reads the system setting once per module registry.
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColumnStrip, COLUMN_STRIP_DWELL, useColumnStrip, type ColumnStripDrag } from '../ColumnStrip';

const W = 390;
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const scrollTo = jest.fn(function (this: HTMLElement, o: ScrollToOptions) { this.scrollLeft = o.left ?? 0; });
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return W; } });
  (HTMLElement.prototype as { scrollTo: unknown }).scrollTo = scrollTo;
  window.innerWidth = W;
});
afterAll(() => {
  if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia;
  delete (HTMLElement.prototype as { clientWidth?: unknown }).clientWidth;
  delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
});

const columns = ['Ideas', 'Queued', 'In progress'].map(k => ({ key: k, label: k, content: <p>{k}</p> }));
let drag: ColumnStripDrag;
function Harness() {
  drag = useColumnStrip();
  return <ColumnStrip columns={columns} drag={drag} />;
}

it('a pill jumps at once', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
  expect(scrollTo).toHaveBeenCalledWith({ left: W * 2, behavior: 'auto' });
});

it('a held card pages without a slide, and the cue shows at full strength', async () => {
  jest.useFakeTimers();
  render(<Harness />);
  act(() => drag.onDragChange(true));
  act(() => drag.onDragMove(W - 10, 300));
  expect((document.querySelector('[data-page-cue]') as HTMLElement).style.opacity).toBe('1');
  await act(async () => { jest.advanceTimersByTime(COLUMN_STRIP_DWELL); });
  await act(async () => { jest.advanceTimersByTime(20); });
  expect((document.querySelector('[data-rail]') as HTMLElement).style.transform).toContain(`translateX(-${W}px)`);
  jest.useRealTimers();
});
