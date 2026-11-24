import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardStack, PILE_FLING, ROW, TAP_SLOP, rowGeometry, rowPlace, type CardStackProps } from '../CardStack';

// jsdom has no ResizeObserver and lays nothing out: a stand-in that observes nothing, and every card 96 px tall
const ownRO = (window as { ResizeObserver?: unknown }).ResizeObserver;
beforeAll(() => {
  (window as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.hasAttribute('data-stack-card') ? 96 : 0; } });
});
afterAll(() => {
  (window as { ResizeObserver?: unknown }).ResizeObserver = ownRO;
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
});

type Card = { id: string; title: string };
const cards = (...ids: string[]): Card[] => ids.map(id => ({ id, title: 'Card ' + id }));
const face = (c: Card) => <div className="face"><p>{c.title}</p></div>;

function Stack(p: Partial<CardStackProps<Card>> & { items: Card[] }) {
  return <CardStack getKey={c => c.id} renderItem={face} variant="pile" label="Your work" {...p} />;
}

// jsdom has no PointerEvent and drops a pointer's fields (pageX too, which framer reads), so the gesture is built by hand
const ptr = (type: string, x: number, y = 100) => Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }), { pointerId: 1, pointerType: 'touch', isPrimary: true, pageX: x, pageY: y });
const frame = (ms = 40) => act(() => new Promise(r => setTimeout(r, ms)));
/** A press at x 100 on `from`, moved sideways by dx in steps (framer reads a move on the next frame), then released. */
const swipe = async (from: Element, dx: number, steps = 6) => {
  act(() => { from.dispatchEvent(ptr('pointerdown', 100)); });
  for (let i = 1; i <= steps; i++) { act(() => { window.dispatchEvent(ptr('pointermove', 100 + (dx * i) / steps)); }); await frame(); }
  act(() => { window.dispatchEvent(ptr('pointerup', 100 + dx)); });
  await frame();
};
const tap = async (el: Element, dx = 0) => {
  act(() => { el.dispatchEvent(ptr('pointerdown', 100)); });
  if (dx) { act(() => { window.dispatchEvent(ptr('pointermove', 100 + dx)); }); await frame(); }
  act(() => { el.dispatchEvent(ptr('pointerup', 100 + dx)); window.dispatchEvent(ptr('pointerup', 100 + dx)); });
  await frame();
};
const card = (id: string) => document.querySelector(`[data-stack-card="${id}"]`)!;
const top = () => screen.getByRole('list').getAttribute('data-top');

describe('CardStack header', () => {
  it('shows the label, the icon, the head slot and the count', () => {
    render(<Stack items={cards('a', 'b', 'c')} icon={<span data-testid="icon" />} headExtra={<button type="button">Bell</button>} />);
    expect(screen.getByRole('region', { name: 'Your work' })).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Your work 3');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bell' })).toBeInTheDocument();
  });

  it('Show all ⇄ Stack toggles the stack, with its label and aria-expanded', () => {
    const onEvent = jest.fn();
    render(<Stack items={cards('a', 'b', 'c')} onEvent={onEvent} />);
    const b = screen.getByRole('button', { name: 'Show all 3' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(b);
    expect(screen.getByRole('region')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Stack' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Stack' }));
    expect(screen.getByRole('button', { name: 'Show all 3' })).toBeInTheDocument();
    expect(onEvent.mock.calls.map(c => c[0])).toEqual(['shown all', 'stacked']);
  });

  it('no toggle for one card or none', () => {
    const { rerender } = render(<Stack items={cards('a')} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<Stack items={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('CardStack pile', () => {
  it('stacked: the first card on top, the ones behind hidden from assistive tech and taking no taps', () => {
    render(<Stack items={cards('a', 'b', 'c', 'd', 'e')} />);
    expect(top()).toBe('a');
    const items = screen.getAllByRole('listitem', { hidden: true });
    expect(items[0]).not.toHaveAttribute('aria-hidden');
    expect(items[0]!.style.pointerEvents).toBe('auto');
    for (const it of items.slice(1)) { expect(it).toHaveAttribute('aria-hidden', 'true'); expect(it.style.pointerEvents).toBe('none'); }
  });

  it('a tap opens the top card; a press that travelled past TAP_SLOP does not', async () => {
    const onOpen = jest.fn();
    render(<Stack items={cards('a', 'b')} onOpen={onOpen} />);
    await tap(card('a'), TAP_SLOP + 4);
    expect(onOpen).not.toHaveBeenCalled();
    await tap(card('a'));
    expect(onOpen).toHaveBeenCalledWith('a');
  });

  it('a swipe past the fling distance steps the pile (either way); a short one does not', async () => {
    const onEvent = jest.fn();
    render(<Stack items={cards('a', 'b', 'c')} onEvent={onEvent} />);
    await swipe(card('a'), -(PILE_FLING.distance / 3), 6);
    expect(top()).toBe('a');
    await swipe(card('a'), -(PILE_FLING.distance + 40));
    expect(top()).toBe('b');
    await swipe(card('b'), PILE_FLING.distance + 40);
    expect(top()).toBe('a');
    expect(onEvent.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['stepped on', 'stepped back']));
    expect(onEvent.mock.calls.map(c => c[0])).not.toContain('a opened');
  });

  it('keeps its top card by key as items change; a card new at the head takes the top', async () => {
    const { rerender } = render(<Stack items={cards('a', 'b', 'c')} />);
    await swipe(card('a'), -(PILE_FLING.distance + 40));
    expect(top()).toBe('b');
    rerender(<Stack items={cards('a', 'c', 'b')} />);
    expect(top()).toBe('b');
    rerender(<Stack items={cards('c', 'b')} />);
    expect(top()).toBe('b');
    rerender(<Stack items={cards('n', 'c', 'b')} />);
    expect(top()).toBe('n');
  });

  it('empty renders in its place, and the pile can fill afterwards', () => {
    const { rerender } = render(<Stack items={[]} empty={<p>Nothing for you</p>} />);
    expect(screen.getByText('Nothing for you')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Your work 0');
    rerender(<Stack items={cards('a', 'b')} empty={<p>Nothing for you</p>} />);
    expect(screen.queryByText('Nothing for you')).not.toBeInTheDocument();
    expect(top()).toBe('a');
  });

  it('expanded: the full list, every card live, the same elements (a morph, not a swap)', () => {
    render(<Stack items={cards('a', 'b', 'c')} />);
    const before = card('b');
    fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }));
    expect(screen.getByRole('list').className).toContain('flex-col');
    for (const it of screen.getAllByRole('listitem')) { expect(it).not.toHaveAttribute('aria-hidden'); expect(it.style.pointerEvents).toBe('auto'); }
    expect(card('b')).toBe(before);
  });
});
