// D8 (T26 review): a group removed mid-drag cleans up after itself; a drop reports to the onMove of the moment, not the
// one from when the drag began; Space on a button inside a card is the button's, not a pick-up.
// Reduced motion here, so a drop commits at once instead of after the settle spring.
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SortableGroup, SortableList, type SortableMove } from '../SortableList';

jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: () => true }));

// jsdom 20 has no PointerEvent; React's onPointerDown needs one carrying pointerId and button
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}
const realPointerEvent = (window as { PointerEvent?: unknown }).PointerEvent;
beforeAll(() => { (window as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent; });
afterAll(() => { (window as { PointerEvent?: unknown }).PointerEvent = realPointerEvent; });

// two lists side by side: To do at x 0-100, Queued at x 200-300
let rects: jest.SpyInstance;
beforeEach(() => {
  rects = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const left = this.getAttribute('aria-label') === 'Queued' ? 200 : this.getAttribute('aria-label') === 'To do' ? 0 : -1;
    if (left < 0) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    return { left, top: 0, right: left + 100, bottom: 100, width: 100, height: 100, x: left, y: 0, toJSON() {} } as DOMRect;
  });
});
afterEach(() => { rects.mockRestore(); document.body.style.userSelect = ''; });

const card = (t: string) => (
  <span>
    {t}
    <button>Edit {t}</button>
  </span>
);
function Board({ onMove, onDragChange }: { onMove: (m: SortableMove) => void; onDragChange?: (d: boolean) => void }) {
  return (
    <SortableGroup onMove={onMove} onDragChange={onDragChange}>
      <SortableList id="todo" order={0} label="To do" items={['Alpha', 'Beta']} getKey={t => t} renderItem={card} />
      <SortableList id="queued" order={1} label="Queued" items={['Gamma']} getKey={t => t} renderItem={card} />
    </SortableGroup>
  );
}
const item = (name: string) => screen.getByText(name).closest('[role="listitem"]') as HTMLElement;
const press = (el: Element, x = 10, y = 10) => act(() => { fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: x, clientY: y }); });
const moveTo = (x: number, y: number) => act(() => { window.dispatchEvent(new FakePointerEvent('pointermove', { pointerId: 1, clientX: x, clientY: y })); });
const release = (x: number, y: number) => act(() => { window.dispatchEvent(new FakePointerEvent('pointerup', { pointerId: 1, clientX: x, clientY: y })); });

describe('SortableList: a group removed mid-drag (D8)', () => {
  it('leaves no pointer listeners, no frame loop and text selection back on', () => {
    jest.useFakeTimers();
    const onMove = jest.fn();
    const dragging: boolean[] = [];
    const { unmount } = render(<Board onMove={onMove} onDragChange={d => dragging.push(d)} />);
    press(item('Alpha'));
    moveTo(30, 30);
    expect(dragging).toEqual([true]);
    expect(document.body.style.userSelect).toBe('none');

    const removed = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(document.body.style.userSelect).toBe('');
    const gone = removed.mock.calls.map(([type]) => type);
    expect(gone).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel']));
    expect(dragging.at(-1)).toBe(false);

    const frames = jest.spyOn(window, 'requestAnimationFrame');
    act(() => { jest.advanceTimersByTime(200); });
    expect(frames).not.toHaveBeenCalled();
    release(250, 50);
    expect(onMove).not.toHaveBeenCalled();
    removed.mockRestore();
    frames.mockRestore();
    jest.useRealTimers();
  });

  it('a pressed card that has not lifted yet leaves no listeners either', () => {
    const { unmount } = render(<Board onMove={jest.fn()} />);
    press(item('Alpha'));
    const removed = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['pointermove', 'pointerup']));
    removed.mockRestore();
  });

  it('a touch hold in progress never lifts after the group is gone', () => {
    jest.useFakeTimers();
    const dragging: boolean[] = [];
    const { unmount } = render(<Board onMove={jest.fn()} onDragChange={d => dragging.push(d)} />);
    const pt = [{ identifier: 3, clientX: 10, clientY: 10 }];
    act(() => { fireEvent.touchStart(screen.getByText('Alpha'), { touches: pt, changedTouches: pt }); });
    unmount();
    act(() => { jest.advanceTimersByTime(400); });
    expect(dragging).toEqual([]);
    expect(document.body.style.userSelect).toBe('');
    jest.useRealTimers();
  });
});

describe('SortableList: the onMove a drop reports to (D8)', () => {
  it('is the one passed most recently, not the one from when the drag began', () => {
    const first = jest.fn(), latest = jest.fn();
    const { rerender } = render(<Board onMove={first} />);
    press(item('Alpha'));
    moveTo(30, 30);
    rerender(<Board onMove={latest} />);
    moveTo(250, 50);
    release(250, 50);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith({ key: 'Alpha', from: 'todo', to: 'queued', index: 1 });
  });
});

describe('SortableList: Space inside a card (D8)', () => {
  it('Space on a button in the card is the button\'s; Space on the card picks it up', () => {
    render(<Board onMove={jest.fn()} />);
    const edit = screen.getByRole('button', { name: 'Edit Alpha' });
    const ev = fireEvent.keyDown(edit, { key: ' ' });
    expect(ev).toBe(true); // not prevented: the button still clicks
    expect(screen.queryByText(/Picked up/)).toBeNull();
    fireEvent.keyDown(item('Alpha'), { key: ' ' });
    expect(screen.getByText(/Picked up/)).toBeInTheDocument();
  });
});
