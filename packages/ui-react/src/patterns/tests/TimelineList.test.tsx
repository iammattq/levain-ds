import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineList } from '../TimelineList';

const RELEASES = [
  { date: 'Nov 22, 2026', title: 'v0.13.0', body: <ul><li>Board: two tabs</li><li>Drag and drop</li></ul>, current: true },
  { date: 'Nov 18, 2026', title: 'v0.12.1', body: 'Fix: the comment box grows' },
  { date: 'Nov 15, 2026', title: 'v0.12.0' },
];

describe('TimelineList', () => {
  test('renders the entries in order as an ordered list', () => {
    const { container } = render(<TimelineList entries={RELEASES} />);
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('list')[0]).toBe(list);
    const items = within(list).getAllByRole('listitem').filter(li => li.parentElement === list);
    expect(items.map(li => li.querySelector('.type-label')!.textContent)).toEqual(['v0.13.0', 'v0.12.1', 'v0.12.0']);
    expect(within(items[0]).getByText('Nov 22, 2026')).toBeInTheDocument();
  });

  test('the body is optional and may be any node', () => {
    render(<TimelineList entries={RELEASES} />);
    const items = screen.getAllByRole('listitem').filter(li => li.tagName === 'LI' && li.querySelector('[data-timeline-dot]'));
    expect(within(items[0]).getByText('Drag and drop')).toBeInTheDocument();
    expect(within(items[1]).getByText('Fix: the comment box grows')).toBeInTheDocument();
    expect(items[2].querySelector('.type-body-sm')).toBeNull();
  });

  test('current marks the dot, and only that one', () => {
    const { container } = render(<TimelineList entries={RELEASES} />);
    const dots = [...container.querySelectorAll('[data-timeline-dot]')];
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('data-current');
    expect(dots[0]).toHaveClass('animate-pulse', 'bg-[var(--color-primary)]');
    for (const d of dots.slice(1)) { expect(d).not.toHaveAttribute('data-current'); expect(d).toHaveClass('bg-[var(--color-surface-canvas)]'); }
  });

  test('a line joins each entry to the next; none under the last', () => {
    const { container } = render(<TimelineList entries={RELEASES} />);
    expect(container.querySelectorAll('[data-timeline-line]')).toHaveLength(2);
    const last = container.querySelectorAll('ol > li')[2];
    expect(last.querySelector('[data-timeline-line]')).toBeNull();
  });

  test('has no heading of its own', () => {
    render(<TimelineList entries={RELEASES} />);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  test('an empty list renders an empty ol', () => {
    render(<TimelineList entries={[]} />);
    expect(screen.getByRole('list')).toBeEmptyDOMElement();
  });
});
