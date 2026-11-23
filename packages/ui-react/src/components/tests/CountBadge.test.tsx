import { render, screen } from '@testing-library/react';
import { CountBadge } from '../CountBadge';

const badge = (c: HTMLElement) => c.querySelector('[data-count-badge]') as HTMLElement;

describe('CountBadge', () => {
  it('plain is the default: inline, faint, regular weight, tabular numbers', () => {
    const { container } = render(<CountBadge count={4} />);
    const el = badge(container);
    expect(el).toHaveTextContent('4');
    expect(el).toHaveClass('inline', 'font-normal', 'tabular-nums', 'text-[var(--color-text-faint)]');
    expect(el).not.toHaveClass('rounded-full');
  });

  it('filled is the board pill: 1.25rem min-width and height, 0 0.375rem padding, full radius, 11px, weight 600', () => {
    const { container } = render(<CountBadge count={2} variant="filled" />);
    const el = badge(container);
    expect(el).toHaveClass(
      'inline-flex', 'h-[1.25rem]', 'min-w-[1.25rem]', 'px-[0.375rem]', 'rounded-full', 'text-[11px]', 'font-semibold', 'tabular-nums',
      'bg-[var(--color-text-default)]', 'text-[var(--color-surface-canvas)]',
    );
  });

  it('caution turns plain text to the caution colour', () => {
    const { container } = render(<CountBadge count={1} tone="caution" />);
    const el = badge(container);
    expect(el).toHaveClass('text-[var(--color-caution-fg)]');
    expect(el).not.toHaveClass('text-[var(--color-text-faint)]');
  });

  it('caution on filled is the fill, with canvas text', () => {
    const { container } = render(<CountBadge count={1} variant="filled" tone="caution" />);
    const el = badge(container);
    expect(el).toHaveClass('bg-[var(--color-caution-fg)]', 'text-[var(--color-surface-canvas)]', 'text-[11px]');
    expect(el).not.toHaveClass('bg-[var(--color-text-default)]');
  });

  it('0 still renders "0"', () => {
    const { container } = render(<CountBadge count={0} />);
    expect(badge(container)).toHaveTextContent(/^0$/);
  });

  it('without a label the number is read as it is', () => {
    render(<button type="button">Queued <CountBadge count={3} /></button>);
    expect(screen.getByRole('button', { name: 'Queued 3' })).toBeInTheDocument();
  });

  it('a label becomes the accessible name; the bare number is hidden from screen readers', () => {
    render(<button type="button">Questions <CountBadge count={3} tone="caution" label="3 waiting on you" /></button>);
    expect(screen.getByRole('button', { name: 'Questions 3 waiting on you' })).toBeInTheDocument();
    expect(screen.getByText('3', { selector: '[aria-hidden="true"]' })).toBeVisible();
    expect(screen.getByText('3 waiting on you')).toHaveClass('sr-only');
  });

  it('className is added', () => {
    const { container } = render(<CountBadge count={5} className="ml-2" />);
    expect(badge(container)).toHaveClass('ml-2');
  });
});
