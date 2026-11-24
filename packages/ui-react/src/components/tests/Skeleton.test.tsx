import React from 'react';
import { render, screen } from '@testing-library/react';
import { ease } from '@levain/tokens';
import { Skeleton, SkeletonGroup } from '../Skeleton';

let mockReduce = false;
// motion.div renders a div carrying what it was asked to animate, so the pulse can be read off it
jest.mock('framer-motion', () => {
  const R = jest.requireActual('react') as typeof React;
  return {
    useReducedMotion: () => mockReduce,
    motion: {
      div: ({ animate, transition, ...rest }: Record<string, unknown>) =>
        R.createElement('div', { ...rest, 'data-animate': JSON.stringify(animate), 'data-transition': JSON.stringify(transition) }),
    },
  };
});

beforeEach(() => {
  mockReduce = false;
});

const one = (c: HTMLElement) => c.querySelector('[data-skeleton]') as HTMLElement;

describe('Skeleton', () => {
  it('is a block by default: full width, 8 px corner (radius-lg), on the section surface', () => {
    const el = one(render(<Skeleton className="aspect-square" />).container);
    expect(el).toHaveAttribute('data-skeleton', 'block');
    expect(el).toHaveClass('aspect-square');
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('');
    expect(el).toHaveClass('rounded-[var(--radius-lg)]', 'bg-[var(--color-surface-section)]');
  });

  it('line: 4 px corner (radius-sm), 1em tall and full width unless set', () => {
    const el = one(render(<Skeleton shape="line" />).container);
    expect(el).toHaveClass('rounded-[var(--radius-sm)]');
    expect(el.style.height).toBe('1em');
    expect(el.style.width).toBe('100%');
    const set = one(render(<Skeleton shape="line" width="8rem" height="1.5rem" />).container);
    expect(set.style.width).toBe('8rem');
    expect(set.style.height).toBe('1.5rem');
  });

  it('circle: round, 2.5rem by default, its height follows its width', () => {
    const el = one(render(<Skeleton shape="circle" />).container);
    expect(el).toHaveClass('rounded-[var(--radius-full)]');
    expect(el.style.width).toBe('2.5rem');
    expect(el.style.height).toBe('2.5rem');
    const sized = one(render(<Skeleton shape="circle" width={40} />).container);
    expect(sized.style.width).toBe('40px');
    expect(sized.style.height).toBe('40px');
  });

  it('numbers are px; the caller\'s style and props pass through', () => {
    const el = one(render(<Skeleton width={120} height={24} style={{ marginTop: 4 }} data-testid="s" />).container);
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('24px');
    expect(el.style.marginTop).toBe('4px');
    expect(screen.getByTestId('s')).toBe(el);
  });

  it('pulses opacity 1 → 0.5 → 1 every 2 s, forever, on the tokens\' springOut ease', () => {
    const el = one(render(<Skeleton />).container);
    expect(JSON.parse(el.dataset.animate!)).toEqual({ opacity: [1, 0.5, 1] });
    const t = JSON.parse(el.dataset.transition!);
    expect(t.duration).toBe(2);
    expect(t.ease).toEqual([...ease.springOut]);
    expect(t.repeat).toBe(null); // Infinity serialises as null
  });

  it('is still under Reduce Motion', () => {
    mockReduce = true;
    const el = one(render(<Skeleton shape="line" />).container);
    expect(el.dataset.animate).toBeUndefined();
    expect(el.dataset.transition).toBeUndefined();
    expect(el.style.opacity).toBe('');
    expect(el).toHaveClass('rounded-[var(--radius-sm)]');
  });

  it.each([false, true])('is hidden from screen readers (mockReduce motion %s)', r => {
    mockReduce = r;
    const el = one(render(<Skeleton />).container);
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonGroup', () => {
  it('gives one polite status line, "Loading" by default, where the shapes say nothing', () => {
    render(
      <SkeletonGroup className="space-y-8" data-testid="g">
        <Skeleton shape="line" />
        <Skeleton />
      </SkeletonGroup>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading');
    expect(status).toHaveClass('sr-only');
    expect(screen.getByTestId('g')).toHaveClass('space-y-8');
    expect(screen.getByTestId('g')).not.toHaveAttribute('aria-busy');
    expect(screen.getByTestId('g').querySelectorAll('[data-skeleton][aria-hidden="true"]')).toHaveLength(2);
  });

  it('takes a label naming what loads', () => {
    render(<SkeletonGroup label="Loading photos"><Skeleton /></SkeletonGroup>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading photos');
  });
});
