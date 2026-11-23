import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

const part = (c: HTMLElement, name: string) => c.querySelector(`[data-part="${name}"]`) as HTMLElement | null;

describe('ProgressBar', () => {
  it('is a meter with min, max, now and a percentage valuetext by default', () => {
    render(<ProgressBar value={40} label="Upload" />);
    const m = screen.getByRole('meter', { name: 'Upload' });
    expect(m).toHaveAttribute('aria-valuemin', '0');
    expect(m).toHaveAttribute('aria-valuemax', '100');
    expect(m).toHaveAttribute('aria-valuenow', '40');
    expect(m).toHaveAttribute('aria-valuetext', '40%');
  });

  it('fills to the clamped percentage', () => {
    const w = (v: number, max?: number) => part(render(<ProgressBar value={v} max={max} />).container, 'fill')!.style.width;
    expect(w(372, 500)).toBe('74.4%');
    expect(w(-3)).toBe('0%');
    expect(w(900, 500)).toBe('100%');
  });

  it('reports the clamped value to assistive tech', () => {
    render(<ProgressBar value={620} max={500} label="PM context" />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '500');
  });

  it('shows value text beside the bar in tabular numerals, and a string label becomes the valuetext', () => {
    const { container } = render(<ProgressBar value={372} max={500} label="PM context" valueLabel="372k of 500k" />);
    const v = part(container, 'value')!;
    expect(v).toHaveTextContent('372k of 500k');
    expect(v).toHaveClass('tabular-nums');
    expect(v).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '372k of 500k');
  });

  it('aria-valuetext wins over the visible label; a node label is shown but not used as valuetext', () => {
    render(<ProgressBar value={1} label="a" valueLabel="1 of 100" aria-valuetext="one of a hundred" />);
    expect(screen.getByRole('meter', { name: 'a' })).toHaveAttribute('aria-valuetext', 'one of a hundred');
    const { container } = render(<ProgressBar value={2} label="b" valueLabel={<b>2</b>} />);
    expect(part(container, 'value')).toHaveTextContent('2');
    expect(screen.getByRole('meter', { name: 'b' })).toHaveAttribute('aria-valuetext', '2%');
  });

  it('shows no value text unless asked', () => {
    expect(part(render(<ProgressBar value={5} />).container, 'value')).toBeNull();
  });

  it.each([
    ['xs', 'h-1', 'type-caption'],
    ['sm', 'h-1.5', 'type-caption'],
    ['md', 'h-2', 'type-body-sm'],
    ['lg', 'h-3', 'type-body'],
  ] as const)('size %s: track %s, value text %s', (size, track, text) => {
    const { container } = render(<ProgressBar value={5} size={size} valueLabel="5%" />);
    expect(part(container, 'track')).toHaveClass(track);
    expect(part(container, 'value')).toHaveClass(text);
  });

  it('defaults to md', () => {
    expect(render(<ProgressBar value={1} />).container.firstChild).toHaveAttribute('data-size', 'md');
  });

  it.each([
    ['default', 'text-[var(--color-text-muted)]'],
    ['caution', 'text-[var(--color-caution-fg)]'],
    ['danger', 'text-[var(--color-error-fg)]'],
  ] as const)('tone %s colours the fill and the value text with %s over the border-default track', (tone, cls) => {
    const { container } = render(<ProgressBar value={50} tone={tone} valueLabel="50%" />);
    expect(container.firstChild).toHaveClass(cls);
    expect(part(container, 'fill')).toHaveClass('bg-current');
    expect(part(container, 'track')).toHaveClass('bg-[var(--color-border-default)]');
  });

  it('times the fill by the motion tokens (instant under reduced motion)', () => {
    expect(part(render(<ProgressBar value={5} />).container, 'fill')!.style.transition).toContain('var(--duration-travel)');
  });
});
