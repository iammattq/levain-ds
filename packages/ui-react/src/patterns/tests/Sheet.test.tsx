import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusCard, StatusCardDialog } from '../StatusCard';
import { closesSheet, PHONE_QUERY, SCROLLED_EDGE, SHEET_CLOSE, SHEET_MAX_HEIGHT } from '../Sheet';

/** matchMedia as a phone (below md) or a desktop; nothing else matches (so no Reduce Motion here). */
let phone = true;
// configurable, and put back as it was: a non-configurable stub can't be removed, and strict mode throws on the delete
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query === PHONE_QUERY && phone, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  // jsdom lays nothing out: the sheet is 800 px tall, so a quarter is 200
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.hasAttribute('data-sheet') ? 800 : 0; } });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight; });
beforeEach(() => { phone = true; });

function Card({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <StatusCard id="T50" number="T50" title="Restart words" onOpen={() => setOpen(true)} open={open} />
      <StatusCardDialog id="T50" number="T50" title="Restart words" open={open} onClose={() => { onClose?.(); setOpen(false); }}>
        <p data-testid="body">The full question</p>
      </StatusCardDialog>
    </>
  );
}
// the card is first in the document (the sheet is portalled after it), and a closed sheet lingers while it leaves
const open = () => fireEvent.click(screen.getAllByText('Restart words')[0]!);
const sheet = () => screen.getByRole('dialog');

// jsdom has no PointerEvent and drops a pointer's fields (pageY too, which framer's drag reads), so the gesture is built by hand
const ptr = (type: string, y: number) => Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: y }), { pointerId: 1, pointerType: 'touch', isPrimary: true, pageX: 100, pageY: y });
const frame = (ms = 40) => act(() => new Promise(r => setTimeout(r, ms)));
/** A press at y 100 on `from`, moved down to 100 + dy in steps (framer reads a move on the next frame), then released.
 *  Slow (40 ms a step): a velocity well under a flick's, so only the distance decides. */
const drag = async (from: Element, dy: number, stepMs = 40, steps = 8) => {
  act(() => { from.dispatchEvent(ptr('pointerdown', 100)); });
  for (let i = 1; i <= steps; i++) { act(() => { window.dispatchEvent(ptr('pointermove', 100 + (dy * i) / steps)); }); await frame(stepMs); }
  if (stepMs >= 40) { await frame(); await frame(); }
  act(() => { window.dispatchEvent(ptr('pointerup', 100 + dy)); });
  await frame(); // framer calls onDragEnd after the next render
};

describe('closesSheet', () => {
  it('closes past a quarter of the height or on a downward flick; not on a short slow drag or an upward one', () => {
    expect(SHEET_CLOSE).toEqual({ distance: 0.25, velocity: 500 });
    expect(closesSheet(201, 0, 800)).toBe(true);
    expect(closesSheet(199, 0, 800)).toBe(false);
    expect(closesSheet(40, 900, 800)).toBe(true);
    expect(closesSheet(40, 100, 800)).toBe(false);
    expect(closesSheet(-300, -900, 800)).toBe(false);
  });
});

describe('StatusCardDialog below md: a bottom sheet', () => {
  it('is a full-width sheet docked to the bottom, top corners rounded, capped below the notch, over a scrim', () => {
    render(<Card />);
    open();
    const s = sheet();
    expect(s).toHaveAttribute('data-sheet');
    expect(s).toHaveAttribute('aria-modal', 'true');
    for (const c of ['absolute', 'inset-x-0', 'bottom-0', 'rounded-t-[var(--radius-2xl)]', SHEET_MAX_HEIGHT, 'bg-[var(--color-surface-elevated)]']) expect(s.className).toContain(c);
    expect(s.className).not.toContain('rounded-[');
    expect(document.querySelector('[data-sheet-scrim]')).toBeInTheDocument();
    // it rises from the bottom edge: it starts a full height down
    expect(s.style.transform).toContain('translateY(100%)');
  });

  it('the head stays put and the body scrolls, clear of the home bar', () => {
    render(<Card />);
    open();
    const grab = sheet().querySelector('[data-sheet-grab]')!;
    const body = sheet().querySelector('[data-sheet-body]')!;
    expect(grab.querySelector('[data-sheet-handle]')).toBeInTheDocument();
    expect(grab).toHaveTextContent('Restart words');
    expect(grab.className).toContain('shrink-0');
    expect(body).toContainElement(screen.getByTestId('body'));
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).toContain('env(safe-area-inset-bottom,0px)');
  });

  it('a hairline under the head only while the body is scrolled', () => {
    render(<Card />);
    open();
    const head = sheet().querySelector('[data-sheet-head]')!;
    const body = sheet().querySelector('[data-sheet-body]')! as HTMLElement;
    expect(head.className).toContain('border-transparent');
    body.scrollTop = 120;
    fireEvent.scroll(body);
    expect(head.className).toContain(SCROLLED_EDGE);
    expect(head).toHaveAttribute('data-scrolled');
    body.scrollTop = 0;
    fireEvent.scroll(body);
    expect(head.className).toContain('border-transparent');
  });

  it('the card stays where it is (on a desktop its place is held empty)', () => {
    render(<Card />);
    open();
    // the card's title and the sheet's
    expect(screen.getAllByText('Restart words')).toHaveLength(2);
  });

  it('the ✕, a tap outside and Escape still close it; focus is in the sheet while open', () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    expect(sheet()).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    open();
    fireEvent.click(document.querySelector('[data-sheet-scrim]')!);
    open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('a tap inside the sheet does not close it', () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    fireEvent.click(screen.getByTestId('body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a drag down the handle past a quarter of its height closes it', async () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    await drag(sheet().querySelector('[data-sheet-handle]')!, 300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a drag from the head closes it too', async () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    await drag(sheet().querySelector('[data-sheet-grab] p')!, 300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a short fast flick down closes it', async () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    // 150 px (under the 200 px a quarter needs) in two big steps: 75 px a step is past a flick's 500 px/s even if a
    // loaded machine stretches a step to 100 ms
    await drag(sheet().querySelector('[data-sheet-handle]')!, 150, 10, 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a short drag springs back and leaves it open', async () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    await drag(sheet().querySelector('[data-sheet-handle]')!, 60);
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet()).toBeInTheDocument();
  });

  it('a drag from the body never moves the sheet, nor from the ✕', async () => {
    const onClose = jest.fn();
    render(<Card onClose={onClose} />);
    open();
    await drag(screen.getByTestId('body'), 400);
    await drag(screen.getByRole('button', { name: 'Close' }), 400);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('StatusCardDialog at md and up: unchanged', () => {
  it('no sheet, no scrim, no handle; the card grows into the dialog as before', () => {
    phone = false;
    render(<Card />);
    open();
    expect(sheet()).not.toHaveAttribute('data-sheet');
    expect(document.querySelector('[data-sheet-scrim], [data-sheet-handle]')).toBeNull();
    // the card's place is held empty: one title, the dialog's
    expect(screen.getAllByText('Restart words')).toHaveLength(1);
  });
});
