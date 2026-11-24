import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

const box = (c: HTMLElement) => c.querySelector('[data-empty-state]') as HTMLElement;

describe('EmptyState', () => {
  it('shows its message', () => {
    render(<EmptyState message="No tasks for you right now" />);
    expect(screen.getByText('No tasks for you right now')).toBeInTheDocument();
  });

  it('takes children in place of message; children win when both are given', () => {
    const { container } = render(
      <EmptyState message="ignored">
        Nothing queued. <strong>Drag an idea here</strong>
      </EmptyState>,
    );
    expect(screen.queryByText('ignored')).toBeNull();
    expect(container.querySelector('[data-empty-state-message] strong')).toHaveTextContent('Drag an idea here');
  });

  it('the board\'s look: dashed 1px emphasis outline, radius-lg, no fill or shadow, muted centred type-body-sm', () => {
    const el = box(render(<EmptyState message="x" />).container);
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass(
      'border',
      'border-dashed',
      'border-[var(--color-border-emphasis)]',
      'rounded-[var(--radius-lg)]',
      'type-body-sm',
      'text-[var(--color-text-muted)]',
      'text-center',
      'items-center',
      'justify-center',
      'p-md',
    );
    expect(el.className).not.toMatch(/\bbg-|shadow/);
  });

  it('renders an action under the message, in the Tab order', () => {
    const { container } = render(<EmptyState message="Nothing yet" action={<button type="button">New task</button>} />);
    const action = container.querySelector('[data-empty-state-action]')!;
    expect(action).toContainElement(screen.getByRole('button', { name: 'New task' }));
    expect(container.querySelector('[data-empty-state-message]')!.compareDocumentPosition(action)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders no action or icon wrapper without them', () => {
    const { container } = render(<EmptyState message="x" />);
    expect(container.querySelector('[data-empty-state-action]')).toBeNull();
    expect(container.querySelector('[data-empty-state-icon]')).toBeNull();
  });

  it('the icon sits above the message, hidden from screen readers', () => {
    const { container } = render(<EmptyState message="x" icon={<svg data-testid="glyph" />} />);
    const icon = container.querySelector('[data-empty-state-icon]')!;
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toContainElement(screen.getByTestId('glyph'));
    expect(icon.compareDocumentPosition(container.querySelector('[data-empty-state-message]')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('is not a live region unless asked: no role by default, role passes through', () => {
    expect(box(render(<EmptyState message="x" />).container)).not.toHaveAttribute('role');
    expect(screen.queryByRole('status')).toBeNull();
    render(<EmptyState message="All done" role="status" />);
    expect(screen.getByRole('status')).toHaveTextContent('All done');
  });

  it('minHeight: none by default, px for a number, any length for a string', () => {
    expect(box(render(<EmptyState message="x" />).container).style.minHeight).toBe('');
    expect(box(render(<EmptyState message="x" minHeight={147} />).container).style.minHeight).toBe('147px');
    expect(box(render(<EmptyState message="x" minHeight="9.1875rem" />).container).style.minHeight).toBe('9.1875rem');
  });

  it('className, style and other props pass through', () => {
    const el = box(render(<EmptyState message="x" className="w-64" style={{ marginTop: 4 }} data-empty-stack="" />).container);
    expect(el).toHaveClass('w-64', 'border-dashed');
    expect(el.style.marginTop).toBe('4px');
    expect(el).toHaveAttribute('data-empty-stack');
  });
});
