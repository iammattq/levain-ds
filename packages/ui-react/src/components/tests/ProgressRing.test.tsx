import { render, screen } from '@testing-library/react';
import { ProgressRing } from '../ProgressRing';
import { progress } from '../progress';

const arc = (c: HTMLElement) => c.querySelector('[data-part="arc"]');

describe('progress (clamping)', () => {
  it.each([
    [50, 100, 50, 100, 50],
    [-5, 100, 0, 100, 0],
    [150, 100, 100, 100, 100],
    [372, 500, 372, 500, 74.4],
    [NaN, 100, 0, 100, 0],
    [5, 0, 0, 0, 0],
    [5, -10, 0, 0, 0],
  ])('value %p of %p → %p of %p, %p%%', (v, m, value, max, pct) => {
    expect(progress(v, m)).toEqual({ value, max, pct });
  });
  it('max defaults to 100', () => expect(progress(30)).toEqual({ value: 30, max: 100, pct: 30 }));
});

describe('ProgressRing', () => {
  it('is a meter with min, max, now and a percentage valuetext by default', () => {
    render(<ProgressRing value={25} label="Upload" />);
    const m = screen.getByRole('meter', { name: 'Upload' });
    expect(m).toHaveAttribute('aria-valuemin', '0');
    expect(m).toHaveAttribute('aria-valuemax', '100');
    expect(m).toHaveAttribute('aria-valuenow', '25');
    expect(m).toHaveAttribute('aria-valuetext', '25%');
  });

  it('takes its own valuetext and max, and reports the clamped value', () => {
    render(<ProgressRing value={620} max={500} label="PM context" aria-valuetext="620k of 500k" />);
    const m = screen.getByRole('meter', { name: 'PM context' });
    expect(m).toHaveAttribute('aria-valuemax', '500');
    expect(m).toHaveAttribute('aria-valuenow', '500');
    expect(m).toHaveAttribute('aria-valuetext', '620k of 500k');
  });

  it('a decorative ring is hidden and carries no meter', () => {
    const { container } = render(<ProgressRing value={40} decorative label="ignored" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).not.toHaveAttribute('aria-valuenow');
  });

  it('fills clockwise from 12 o\'clock: the arc is pathLength 100, dashed to the percentage, turned -90°', () => {
    const { container } = render(<ProgressRing value={372} max={500} />);
    const a = arc(container)!;
    expect(a).toHaveAttribute('pathLength', '100');
    expect(a).toHaveAttribute('stroke-dasharray', '74.4 100');
    expect(a).toHaveAttribute('transform', 'rotate(-90 8 8)');
  });

  it('draws no arc at 0, a full one past max', () => {
    expect(arc(render(<ProgressRing value={0} />).container)).toBeNull();
    expect(arc(render(<ProgressRing value={200} />).container)).toHaveAttribute('stroke-dasharray', '100 100');
  });

  it.each([
    ['xs', 14, 1.5],
    ['sm', 20, 2],
    ['md', 32, 3],
    ['lg', 48, 4],
  ] as const)('size %s renders %ipx with a %fpx stroke that does not scale', (size, px, stroke) => {
    const { container } = render(<ProgressRing value={50} size={size} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
    expect(svg).toHaveAttribute('width', String(px));
    for (const c of svg.querySelectorAll('circle')) {
      expect(c).toHaveAttribute('stroke-width', String(stroke));
      expect(c).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    }
  });

  it('defaults to md', () => {
    expect(render(<ProgressRing value={1} />).container.querySelector('svg')).toHaveAttribute('data-size', 'md');
  });

  it.each([
    ['default', 'text-[var(--color-text-muted)]'],
    ['caution', 'text-[var(--color-caution-fg)]'],
    ['danger', 'text-[var(--color-error-fg)]'],
  ] as const)('tone %s colours the arc %s over the border-default track', (tone, colour) => {
    const { container } = render(<ProgressRing value={50} tone={tone} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveClass(colour);
    expect(arc(container)).toHaveAttribute('stroke', 'currentColor');
    expect(container.querySelector('[data-part="track"]')).toHaveAttribute('stroke', 'var(--color-border-default)');
  });

  it('times the arc by the motion tokens (instant under reduced motion)', () => {
    const { container } = render(<ProgressRing value={50} />);
    expect((arc(container) as SVGElement).style.transition).toContain('var(--duration-travel)');
  });
});
