import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
