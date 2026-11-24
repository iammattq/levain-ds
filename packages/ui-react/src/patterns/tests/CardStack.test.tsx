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

describe('CardStack row geometry', () => {
  // 1054 px: 1000 of content plus a pile's room (3 × 9 px) each side; four cards near 232 wide share it
  const g = rowGeometry(1054, 232);
  it('a whole number of cards near cardWidth share the content width', () => {
    expect(g).toMatchObject({ left: ROW.depth * ROW.peek, count: 4, W: 241, STEP: 241 + ROW.gap });
    expect(g.right + g.W).toBe(1054 - g.left);
  });

  it('at rest the cards sit side by side and the rest pile at the right, words showing only on the open ones', () => {
    const at = (i: number) => rowPlace(i, 0, 7, g);
    for (const i of [0, 1, 2, 3]) expect(at(i)).toMatchObject({ x: g.left + i * g.STEP, scale: 1, live: true });
    expect(at(3).content).toBe(1);
    // behind the right pile's top: each further right by PEEK, smaller, under it, no words, no taps
    expect(at(4)).toMatchObject({ x: g.right + ROW.peek, live: false, content: 0 });
    expect(at(4).scale).toBeLessThan(1);
    expect(at(4).z).toBeLessThan(at(3).z);
    expect(at(6).x).toBe(g.right + 3 * ROW.peek);
  });

  it('scrolled a card, the first piles at the left and the next peels off the right pile; continuous between', () => {
    const at = (i: number, o: number) => rowPlace(i, o, 7, g);
    expect(at(0, g.STEP)).toMatchObject({ x: g.left - ROW.peek, live: false, origin: '0% 50%' });
    expect(at(1, g.STEP)).toMatchObject({ x: g.left, live: true, content: 1 });
    expect(at(4, g.STEP)).toMatchObject({ x: g.right, live: true, content: 1 });
    expect(at(1, g.STEP).z).toBeGreaterThan(at(0, g.STEP).z);
    // halfway, card 4 is between the pile and its slot
    const mid = at(4, g.STEP / 2).x;
    expect(mid).toBeGreaterThan(g.right);
    expect(mid).toBeLessThan(g.right + ROW.peek);
  });
});

describe('CardStack row', () => {
  const ownWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  beforeAll(() => { Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.hasAttribute('data-stack-row') ? 1054 : 0; } }); });
  afterAll(() => { if (ownWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', ownWidth); });
  const STEP = rowGeometry(1054, 232).STEP;
  const row = () => document.querySelector('[data-stack-row]')!;
  const wheel = (deltaX: number, deltaY: number) => { const e = new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true }); act(() => { row().dispatchEvent(e); }); return e; };
  const Row = (p: Partial<CardStackProps<Card>>) => <Stack variant="row" items={cards('a', 'b', 'c', 'd', 'e', 'f')} {...p} />;
  const restingAt = (onEvent: jest.Mock) => onEvent.mock.calls.map(c => c[0]).filter((w: string) => w.startsWith('row at ')).at(-1);

  it('a vertical wheel is left to the page; a sideways one scrolls the row', () => {
    render(<Row />);
    expect(wheel(0, 120).defaultPrevented).toBe(false);
    expect(wheel(30, 120).defaultPrevented).toBe(false);
    // at the start, scrolling back past it is the page's too
    expect(wheel(-120, 0).defaultPrevented).toBe(false);
    expect(wheel(120, 10).defaultPrevented).toBe(true);
  });

  it('dragging the row scrolls it and it settles on a whole card', async () => {
    const onEvent = jest.fn();
    render(<Row onEvent={onEvent} />);
    act(() => { row().dispatchEvent(ptr('pointerdown', 600)); });
    act(() => { window.dispatchEvent(ptr('pointermove', 600 - STEP * 0.7)); });
    act(() => { window.dispatchEvent(ptr('pointerup', 600 - STEP * 0.7)); });
    expect(restingAt(onEvent)).toBe(`row at ${STEP}`);
    // past the end it stops at the last card in the open (6 cards, 4 shown: 2 steps)
    act(() => { row().dispatchEvent(ptr('pointerdown', 900)); });
    act(() => { window.dispatchEvent(ptr('pointermove', 900 - STEP * 5)); });
    act(() => { window.dispatchEvent(ptr('pointerup', 900 - STEP * 5)); });
    expect(restingAt(onEvent)).toBe(`row at ${STEP * 2}`);
  });

  it('a sideways wheel settles on a whole card once it stops', async () => {
    const onEvent = jest.fn();
    render(<Row onEvent={onEvent} />);
    wheel(STEP * 0.6, 0);
    await frame(200);
    // settled: one more drag of nothing reports where it rests
    act(() => { row().dispatchEvent(ptr('pointerdown', 500)); window.dispatchEvent(ptr('pointerup', 500)); });
    expect(restingAt(onEvent)).toBe(`row at ${STEP}`);
  });

  it('a tap opens a card; dragging the row from a card does not', async () => {
    const onOpen = jest.fn();
    render(<Row onOpen={onOpen} />);
    await tap(card('b'), TAP_SLOP + 20);
    expect(onOpen).not.toHaveBeenCalled();
    await tap(card('b'));
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('openKey: the open card\'s place keeps its size, empty, and the card is gone from it', () => {
    const { rerender } = render(<Row />);
    rerender(<Row openKey="b" />);
    expect(document.querySelector('[data-stack-card="b"]')).toBeNull();
    const place = document.querySelector('[data-stack-open="b"]') as HTMLElement;
    expect(place).toHaveAttribute('aria-hidden', 'true');
    expect(place.style.height).toBe('96px');
    rerender(<Row />);
    expect(card('b')).toBeInTheDocument();
  });

  it('expanded: every card in a wrapping grid, each the row\'s card width', () => {
    render(<Row />);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 6' }));
    expect(screen.getByRole('list').className).toContain('flex-wrap');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    for (const it of items) expect(it.style.width).toBe('241px');
  });

  it('empty renders in its place', () => {
    render(<Row items={[]} empty={<p>No tasks for you right now</p>} />);
    expect(screen.getByText('No tasks for you right now')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
