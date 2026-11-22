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
  const touch = (el: Element) => {
    const e = new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    Object.defineProperty(e, 'pointerId', { value: 7 });
    act(() => { el.dispatchEvent(e); });
  };
  const board = () => render(
    <SortableGroup onMove={jest.fn()}>
      <SortableList id="todo" label="To do" items={['Alpha']} getKey={t => t} renderItem={t => <span>{t}</span>} />
    </SortableGroup>,
  );

  it('gives each item a grip that claims the gesture (touch-action: none)', () => {
    const { container } = board();
    const grip = container.querySelector('[data-sortable-handle]') as HTMLElement;
    expect(grip).not.toBeNull();
    expect(grip.style.touchAction).toBe('none');
  });

  it('a touch on the item itself scrolls; a touch on the grip lifts the item at once', () => {
    const { container } = board();
    touch(screen.getByText('Alpha'));
    expect(document.body.style.userSelect).toBe('');
    touch(container.querySelector('[data-sortable-handle]')!);
    expect(document.body.style.userSelect).toBe('none');
    const up = new MouseEvent('pointercancel', { bubbles: true });
    Object.defineProperty(up, 'pointerId', { value: 7 });
    act(() => { window.dispatchEvent(up); });
    expect(document.body.style.userSelect).toBe('');
  });
});
