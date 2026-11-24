import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomSheet } from '../BottomSheet';
import { SCROLLED_EDGE, SHEET_MAX_HEIGHT } from '../Sheet';

// configurable, and put back as it was; nothing matches (a desktop width, no Reduce Motion): BottomSheet is a sheet at
// every width
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  // jsdom lays nothing out: the sheet is 800 px tall, so a quarter is 200
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.hasAttribute('data-sheet') ? 800 : 0; } });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight; });

function Demo({ onClose, ...props }: { onClose?: () => void } & Partial<React.ComponentProps<typeof BottomSheet>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Filters</button>
      <BottomSheet title="Filters" {...props} open={open} onClose={() => { onClose?.(); setOpen(false); }}>
        <p data-testid="body">Pick some</p>
        <button type="button">Apply</button>
      </BottomSheet>
    </>
  );
}
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
const sheet = () => screen.getByRole('dialog');

// jsdom has no PointerEvent and drops a pointer's fields (pageY too, which framer's drag reads), so the gesture is built
// by hand, as in Sheet.test.tsx
const ptr = (type: string, y: number) => Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: y }), { pointerId: 1, pointerType: 'touch', isPrimary: true, pageX: 100, pageY: y });
const frame = (ms = 40) => act(() => new Promise(r => setTimeout(r, ms)));
const drag = async (from: Element, dy: number, stepMs = 40, steps = 8) => {
  act(() => { from.dispatchEvent(ptr('pointerdown', 100)); });
  for (let i = 1; i <= steps; i++) { act(() => { window.dispatchEvent(ptr('pointermove', 100 + (dy * i) / steps)); }); await frame(stepMs); }
  if (stepMs >= 40) { await frame(); await frame(); }
  act(() => { window.dispatchEvent(ptr('pointerup', 100 + dy)); });
  await frame();
};

describe('BottomSheet', () => {
  it('opens as the T24 sheet over a scrim, and closes', async () => {
    render(<Demo />);
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    const s = sheet();
    expect(s).toHaveAttribute('data-sheet');
    expect(s).toHaveAttribute('aria-modal', 'true');
    for (const c of ['absolute', 'inset-x-0', 'bottom-0', 'rounded-t-[var(--radius-2xl)]', SHEET_MAX_HEIGHT]) expect(s.className).toContain(c);
    expect(s.style.transform).toContain('translateY(100%)');
    expect(document.querySelector('[data-sheet-scrim]')).toBeInTheDocument();
    // portalled to the body, outside the caller's tree
    expect(s.parentElement?.parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await frame(400);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the head (handle, title, ✕) stays put; the body scrolls with the hairline only while scrolled', () => {
    render(<Demo />);
    open();
    const grab = sheet().querySelector('[data-sheet-grab]')!;
    const head = sheet().querySelector('[data-sheet-head]')!;
    const body = sheet().querySelector('[data-sheet-body]')! as HTMLElement;
    expect(grab.querySelector('[data-sheet-handle]')).toBeInTheDocument();
    expect(head).toHaveTextContent('Filters');
    expect(head.querySelector('p')!.className).toContain('type-body-sm');
    expect(body).toContainElement(screen.getByTestId('body'));
    for (const c of ['overflow-y-auto', 'pb-safe-md', 'px-safe-md']) expect(body.className.split(' ')).toContain(c);
    expect(head.className).toContain('border-transparent');
    body.scrollTop = 80;
    fireEvent.scroll(body);
    expect(head.className).toContain(SCROLLED_EDGE);
  });

  it('a head of its own replaces the title and ✕', () => {
    render(<Demo title={undefined} label="Sort" head={<p data-testid="own-head">Sort by</p>} />);
    open();
    expect(sheet().querySelector('[data-sheet-head]')).toContainElement(screen.getByTestId('own-head'));
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(sheet()).toHaveAccessibleName('Sort');
  });

  it('is named by a string title, or by label (which wins)', () => {
    const { unmount } = render(<Demo />);
    open();
    expect(sheet()).toHaveAccessibleName('Filters');
    unmount();
    render(<Demo title={<strong>Filters</strong>} label="Filter the list" />);
    open();
    expect(sheet()).toHaveAccessibleName('Filter the list');
  });

  it('Escape and a tap on the scrim close it; a tap inside does not', () => {
    const onClose = jest.fn();
    render(<Demo onClose={onClose} />);
    open();
    fireEvent.click(screen.getByTestId('body'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    open();
    fireEvent.click(document.querySelector('[data-sheet-scrim]')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('focus moves in, Tab wraps inside it, and focus goes back on close', () => {
    render(<Demo />);
    const trigger = screen.getByRole('button', { name: 'Filters' });
    trigger.focus();
    open();
    expect(sheet()).toHaveFocus();
    const close = screen.getByRole('button', { name: 'Close' });
    const apply = screen.getByRole('button', { name: 'Apply' });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    apply.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(apply).toHaveFocus();
    // focus that slipped out comes back in
    trigger.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it('a drag down the handle past a quarter of its height closes it', async () => {
    const onClose = jest.fn();
    render(<Demo onClose={onClose} />);
    open();
    await drag(sheet().querySelector('[data-sheet-handle]')!, 300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a short fast flick down closes it', async () => {
    const onClose = jest.fn();
    render(<Demo onClose={onClose} />);
    open();
    // 150 px, under the 200 px a quarter needs, in two big steps: past a flick's 500 px/s
    await drag(sheet().querySelector('[data-sheet-handle]')!, 150, 10, 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a short slow drag springs back and leaves it open; the body never starts a drag', async () => {
    const onClose = jest.fn();
    render(<Demo onClose={onClose} />);
    open();
    await drag(sheet().querySelector('[data-sheet-handle]')!, 60);
    await drag(screen.getByTestId('body'), 400);
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet()).toBeInTheDocument();
  });
});
