import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timeline, TimelineItem } from '../Timeline';

// The career Timeline's output, pinned before T9 rebuilt it on TimelineList: what the reader sees and every class
// that makes the look (heading, company, dot, line, title, period). Written against the old Timeline first.
const GROUPS = [
  { company: 'RBC', roles: [{ period: '2026 – now', title: 'Principal Design Engineer' }, { period: '2021 – 2025', title: 'Director, Design System' }] },
  { company: 'Acme', roles: [{ period: '2018 – 2020', title: 'Lead Product Designer' }] },
];

const dots = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.rounded-full.border-2')];
const lines = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.w-0\\.5.flex-1')];

describe('Timeline (career)', () => {
  test('keeps its History heading and each company over its roles, in order', () => {
    const { container } = render(<Timeline groups={GROUPS} />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    const text = container.textContent;
    const order = ['History', 'RBC', 'Principal Design Engineer', '2026 – now', 'Director, Design System', '2021 – 2025', 'Acme', 'Lead Product Designer', '2018 – 2020'];
    let at = -1;
    for (const t of order) { const i = text!.indexOf(t, at + 1); expect(i).toBeGreaterThan(at); at = i; }
    expect(screen.getByText('RBC')).toHaveClass('type-label', 'mb-1', 'block', 'font-semibold', 'text-[var(--color-text-default)]');
  });

  test('a dot per role, filled and pulsing only on the first role of the first company', () => {
    const { container } = render(<Timeline groups={GROUPS} />);
    const d = dots(container);
    expect(d).toHaveLength(3);
    for (const dot of d) expect(dot).toHaveClass('mt-1', 'h-3', 'w-3', 'flex-shrink-0', 'rounded-full', 'border-2', 'border-[var(--color-primary)]');
    expect(d[0]).toHaveClass('animate-pulse', 'bg-[var(--color-primary)]');
    for (const dot of d.slice(1)) { expect(dot).toHaveClass('bg-[var(--color-surface-canvas)]'); expect(dot).not.toHaveClass('animate-pulse'); }
  });

  test('a line under every role but the last of its company', () => {
    const { container } = render(<Timeline groups={GROUPS} />);
    const l = lines(container);
    expect(l).toHaveLength(1); // RBC's first role only
    expect(l[0]).toHaveClass('mt-1', 'w-0.5', 'flex-1', 'bg-[var(--color-primary)]');
  });

  test('title over period, in their type styles', () => {
    render(<Timeline groups={GROUPS} />);
    const title = screen.getByText('Lead Product Designer');
    const period = screen.getByText('2018 – 2020');
    expect(title).toHaveClass('type-label', 'text-[var(--color-text-muted)]');
    expect(period).toHaveClass('type-caption-compact', 'leading-4', 'text-[var(--color-text-disabled)]');
    expect(title.parentElement).toBe(period.parentElement);
    expect(title.parentElement).toHaveClass('flex', 'flex-col', 'pb-2');
    expect(title.nextElementSibling).toBe(period);
    // the row: marker column then content, gap-4
    const row = title.parentElement!.parentElement!;
    expect(row).toHaveClass('flex', 'gap-4');
    expect(row.firstElementChild).toHaveClass('flex', 'flex-col', 'items-center');
  });

  test('since T9: each company’s roles are a TimelineList (an ol, one li per role)', () => {
    const { container } = render(<Timeline groups={GROUPS} />);
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(2);
    expect(lists[0]).toHaveClass('mt-2', 'list-none');
    expect([...lists].map(l => l.children.length)).toEqual([2, 1]);
  });
});

describe('TimelineItem (on its own)', () => {
  test('is still a div row with the marker, title over period', () => {
    const { container } = render(<TimelineItem period="2018 – 2020" title="Lead Product Designer" isCurrent />);
    const row = container.firstElementChild!;
    expect(row.tagName).toBe('DIV');
    expect(row).toHaveClass('flex', 'gap-4');
    expect(dots(container)[0]).toHaveClass('animate-pulse');
    expect(lines(container)).toHaveLength(1);
  });
});
