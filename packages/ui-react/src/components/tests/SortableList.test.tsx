import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SortableGroup, SortableList, type SortableMove } from '../SortableList';

function Board({ onMove }: { onMove: (m: SortableMove) => void }) {
  const card = (t: string) => <span>{t}</span>;
  return (
    <SortableGroup onMove={onMove}>
      <SortableList id="todo" order={0} label="To do" items={['Alpha', 'Beta']} getKey={t => t} renderItem={card} />
      <SortableList id="queued" order={1} label="Queued" items={['Gamma']} getKey={t => t} renderItem={card} />
    </SortableGroup>
  );
}
const item = (name: string) => screen.getByText(name).closest('[role="listitem"]') as HTMLElement;

describe('SortableList from the keyboard', () => {
  it('Space lifts, the arrows carry it to the next list and down, Space drops: one move', () => {
    const onMove = jest.fn();
    render(<Board onMove={onMove} />);
    fireEvent.keyDown(item('Beta'), { key: ' ' });
    expect(screen.getByText(/Picked up/)).toBeInTheDocument();
    fireEvent.keyDown(item('Beta'), { key: 'ArrowRight' });
    // now drawn in Queued, at the same index (clamped), and still the focused item
    expect(screen.getByRole('list', { name: 'Queued' })).toContainElement(item('Beta'));
    fireEvent.keyDown(item('Beta'), { key: 'ArrowDown' });
    fireEvent.keyDown(item('Beta'), { key: ' ' });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ key: 'Beta', from: 'todo', to: 'queued', index: 1 });
    expect(screen.getByText(/Dropped in Queued, position 2/)).toBeInTheDocument();
  });

  it('Escape puts it back without a move; dropping where it started is no move', () => {
    const onMove = jest.fn();
    render(<Board onMove={onMove} />);
    fireEvent.keyDown(item('Alpha'), { key: ' ' });
    fireEvent.keyDown(item('Alpha'), { key: 'ArrowRight' });
    fireEvent.keyDown(item('Alpha'), { key: 'Escape' });
    expect(screen.getByRole('list', { name: 'To do' })).toContainElement(item('Alpha'));
    fireEvent.keyDown(item('Alpha'), { key: ' ' });
    fireEvent.keyDown(item('Alpha'), { key: ' ' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('items are announced as sortable and reachable by Tab', () => {
    render(<Board onMove={jest.fn()} />);
    expect(item('Gamma')).toHaveAttribute('tabindex', '0');
    expect(item('Gamma')).toHaveAttribute('aria-roledescription', 'sortable item');
  });
});

describe('SortableList: an item leaving the list', () => {
  it('collapses in place, out of reach, and is gone after the shift duration (lists-close-gaps)', () => {
    jest.useFakeTimers();
    const card = (t: string) => <span>{t}</span>;
    const list = (items: string[]) => (
      <SortableGroup onMove={jest.fn()}>
        <SortableList id="todo" label="To do" items={items} getKey={t => t} renderItem={card} />
      </SortableGroup>
    );
    const { rerender } = render(list(['Alpha', 'Beta', 'Gamma']));
    rerender(list(['Alpha', 'Gamma']));
    const leaving = screen.getByText('Beta').parentElement!;
    expect(leaving).toHaveAttribute('aria-hidden');
    expect(screen.getAllByRole('listitem').map(e => e.textContent)).toEqual(['Alpha', 'Gamma']);
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.queryByText('Beta')).toBeNull();
    jest.useRealTimers();
  });
});

describe('SortableList on a touch screen', () => {
  const realMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: q === '(pointer: coarse)', media: q, addEventListener: () => {}, removeEventListener: () => {} })) as never;
  });
  afterEach(() => { window.matchMedia = realMatchMedia; });
  const pt = (x: number, y: number) => [{ identifier: 3, clientX: x, clientY: y }];
  // a touch's events go to the element it began on, even after that element has left the page
  let touched: Element;
  const down = (el: Element) => { touched = el; act(() => { fireEvent.touchStart(el, { touches: pt(10, 10), changedTouches: pt(10, 10) }); }); };
  /** true when the move was left to the browser (not prevented) */
  const moveTo = (x: number, y: number) => { let free = true; act(() => { free = fireEvent.touchMove(touched, { touches: pt(x, y), changedTouches: pt(x, y) }); }); return free; };
  let dragging: boolean[] = [];
  const lifted = () => dragging[dragging.length - 1] === true;
  beforeEach(() => { dragging = []; });
  const board = () => render(
    <SortableGroup onMove={jest.fn()} onDragChange={d => dragging.push(d)}>
      <SortableList id="todo" label="To do" items={['Alpha']} getKey={t => t} renderItem={t => <span>{t}</span>} />
    </SortableGroup>,
  );

  it('gives each item a grip that claims the gesture (touch-action: none)', () => {
    const { container } = board();
    const grip = container.querySelector('[data-sortable-handle]') as HTMLElement;
    expect(grip).not.toBeNull();
    expect(grip.style.touchAction).toBe('none');
  });

  it('a hold on the item lifts it after touchHold; a still finger is kept from scrolling meanwhile', () => {
    jest.useFakeTimers();
    board();
    down(screen.getByText('Alpha'));
    expect(moveTo(12, 13)).toBe(false); // jitter inside touchSlop: prevented, so no scroll starts
    expect(lifted()).toBe(false);
    act(() => { jest.advanceTimersByTime(260); });
    expect(lifted()).toBe(true);
    expect(moveTo(40, 80)).toBe(false); // the drag's own
    act(() => { fireEvent.touchCancel(touched, { changedTouches: pt(40, 80) }); });
    expect(lifted()).toBe(false);
    jest.useRealTimers();
  });

  it('moves still drive the drag after the touched card has left the page, and lifting the finger drops it', () => {
    jest.useFakeTimers();
    board();
    down(screen.getByText('Alpha'));
    act(() => { jest.advanceTimersByTime(260); });
    expect(lifted()).toBe(true);
    expect(touched.isConnected).toBe(false); // the lifted card is drawn in a portal; the original is gone
    expect(moveTo(40, 80)).toBe(false);
    act(() => { fireEvent.touchEnd(touched, { changedTouches: pt(40, 80) }); });
    act(() => { jest.runOnlyPendingTimers(); });
    expect(document.body.style.userSelect).toBe('');
    jest.useRealTimers();
  });

  it('a finger that moves past touchSlop during the hold scrolls, and the hold is off', () => {
    jest.useFakeTimers();
    board();
    down(screen.getByText('Alpha'));
    expect(moveTo(10, 40)).toBe(true);
    expect(moveTo(10, 80)).toBe(true);
    act(() => { jest.advanceTimersByTime(400); });
    expect(lifted()).toBe(false);
    jest.useRealTimers();
  });

  it('a touch on the grip lifts the item at once', () => {
    const { container } = board();
    down(container.querySelector('[data-sortable-handle]')!);
    expect(lifted()).toBe(true);
    act(() => { fireEvent.touchCancel(touched, { changedTouches: pt(10, 10) }); });
    expect(lifted()).toBe(false);
  });

  it('items take no text selection, callout or context menu on touch', () => {
    board();
    const li = item('Alpha');
    expect(li).toHaveClass('select-none');
    expect(fireEvent.contextMenu(li)).toBe(false);
  });

  it('a held card near the bottom of the window scrolls the page', () => {
    jest.useFakeTimers();
    const scrollBy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { container } = board();
    const at = (y: number) => [{ identifier: 3, clientX: 10, clientY: y }];
    touched = container.querySelector('[data-sortable-handle]')!;
    act(() => { fireEvent.touchStart(touched, { touches: at(window.innerHeight - 5), changedTouches: at(window.innerHeight - 5) }); });
    act(() => { jest.advanceTimersByTime(100); });
    expect(scrollBy.mock.calls.some(([, y]) => (y as number) > 0)).toBe(true);
    act(() => { fireEvent.touchCancel(touched, { changedTouches: at(window.innerHeight - 5) }); });
    expect(lifted()).toBe(false);
    scrollBy.mockRestore();
    jest.useRealTimers();
  });
});
