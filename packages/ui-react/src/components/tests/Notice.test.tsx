import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notice, type NoticeTone } from '../Notice';
import { Button } from '../Button';

const box = (c: HTMLElement) => c.querySelector('[data-notice]') as HTMLElement;

describe('Notice', () => {
  it('shows its message', () => {
    render(<Notice>Offline, reconnecting…</Notice>);
    expect(screen.getByText('Offline, reconnecting…')).toBeInTheDocument();
  });

  it('the look: a small radius box with a border, body-small text that wraps, no shadow', () => {
    const el = box(render(<Notice>x</Notice>).container);
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('rounded-[var(--radius-md)]', 'border', 'type-body-sm', 'flex', 'flex-wrap');
    expect(el.className).not.toMatch(/shadow/);
  });

  const tones: [NoticeTone, string, string][] = [
    ['muted', 'text-[var(--color-text-muted)]', 'bg-[var(--color-surface-subtle)]'],
    ['info', 'text-[var(--color-info-fg)]', 'bg-[var(--color-info-bg)]'],
    ['caution', 'text-[var(--color-caution-fg)]', 'bg-[var(--color-caution-bg)]'],
    ['error', 'text-[var(--color-error-fg)]', 'bg-[var(--color-error-bg)]'],
  ];

  it.each(tones)('tone %s takes its text and background tokens', (tone, fg, bg) => {
    const el = box(render(<Notice tone={tone}>x</Notice>).container);
    expect(el).toHaveClass(fg, bg);
    expect(el).toHaveAttribute('data-tone', tone);
  });

  it('is muted by default', () => {
    const el = box(render(<Notice>x</Notice>).container);
    expect(el).toHaveAttribute('data-tone', 'muted');
    expect(el).toHaveClass('text-[var(--color-text-muted)]', 'bg-[var(--color-surface-subtle)]');
  });

  it('is a polite status with no action or dismiss', () => {
    render(<Notice>Offline, reconnecting…</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Offline, reconnecting…');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is an alert with an action', () => {
    render(<Notice tone="error" action={<Button size="sm" variant="ghost">Retry</Button>}>Your idea wasn't sent</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent("Your idea wasn't sent");
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is an alert with dismiss', () => {
    render(<Notice onDismiss={() => {}}>x</Notice>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('a role passed in wins', () => {
    render(<Notice role="note" onDismiss={() => {}}>x</Notice>);
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('changing the text keeps the same region', () => {
    const { container, rerender } = render(<Notice>Offline, reconnecting…</Notice>);
    const first = box(container);
    rerender(<Notice>Back online</Notice>);
    expect(box(container)).toBe(first);
    expect(screen.getByRole('status')).toHaveTextContent('Back online');
  });

  it('renders the action and it works', async () => {
    const retry = jest.fn();
    render(<Notice action={<Button size="sm" variant="ghost" onClick={retry}>Retry</Button>}>x</Notice>);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('dismiss: a ghost button that calls onDismiss on click', async () => {
    const onDismiss = jest.fn();
    render(<Notice onDismiss={onDismiss}>x</Notice>);
    const b = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(b);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss from the keyboard: Tab to it, Enter and Space', async () => {
    const onDismiss = jest.fn();
    render(<Notice onDismiss={onDismiss}>x</Notice>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('the dismiss label can be overridden', () => {
    render(<Notice onDismiss={() => {}} dismissLabel="Hide">x</Notice>);
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('the action comes before dismiss when both are given', () => {
    render(<Notice action={<Button size="sm" variant="ghost">Retry</Button>} onDismiss={() => {}}>x</Notice>);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Retry', 'Dismiss']);
  });

  it('the icon is decorative and before the message', () => {
    const { container } = render(<Notice icon={<svg data-testid="glyph" />}>x</Notice>);
    const icon = container.querySelector('[data-notice-icon]') as HTMLElement;
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toContainElement(screen.getByTestId('glyph'));
    expect(icon.nextElementSibling).toHaveAttribute('data-notice-message');
  });

  it('no icon slot without an icon', () => {
    const { container } = render(<Notice>x</Notice>);
    expect(container.querySelector('[data-notice-icon]')).toBeNull();
  });

  // cn is mocked in the tests (a plain join), so this checks the classes are added, not twMerge's conflict resolution
  it('adds className to its own', () => {
    const el = box(render(<Notice className="mt-2">x</Notice>).container);
    expect(el).toHaveClass('mt-2', 'border', 'type-body-sm');
  });

  it('forwards ref and rest props to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Notice ref={ref} id="net" data-testid="n" aria-label="Connection">x</Notice>);
    expect(ref.current).toBe(box(container));
    expect(ref.current).toHaveAttribute('id', 'net');
    expect(ref.current).toHaveAttribute('aria-label', 'Connection');
  });
});
