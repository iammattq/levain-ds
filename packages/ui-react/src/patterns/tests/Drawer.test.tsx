import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Drawer, closesDrawer } from '../Drawer';

// no Reduce Motion; put back as it was
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  // jsdom lays nothing out: the drawer is 320 px wide, so a quarter is 80
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.hasAttribute('data-drawer') ? 320 : 0; } });
});
afterAll(() => {
  if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia;
  delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
});

function Demo({ onClose, inner, surface }: { onClose?: () => void; inner?: React.ReactNode; surface?: 'elevated' | 'canvas' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Menu</button>
      <Drawer open={open} label="Main menu" surface={surface} onClose={() => { onClose?.(); setOpen(false); }}>
        <a href="#releases">Releases</a>
        <p data-testid="body">Version 1.2.3</p>
        {inner}
        <button type="button">Theme</button>
      </Drawer>
    </>
  );
}
const frame = (ms = 40) => act(() => new Promise(r => setTimeout(r, ms)));
const drawer = () => screen.getByRole('dialog');
const gone = async () => { await frame(500); expect(screen.queryByRole('dialog')).toBeNull(); };

// jsdom has no PointerEvent and drops a pointer's fields (pageX too, which framer's drag reads): built by hand, as in
// BottomSheet.test.tsx
const ptr = (type: string, x: number) => Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: 100 }), { pointerId: 1, pointerType: 'touch', isPrimary: true, pageX: x, pageY: 100 });
const drag = async (from: Element, dx: number, stepMs = 40, steps = 8) => {
  act(() => { from.dispatchEvent(ptr('pointerdown', 300)); });
  for (let i = 1; i <= steps; i++) { act(() => { window.dispatchEvent(ptr('pointermove', 300 + (dx * i) / steps)); }); await frame(stepMs); }
  if (stepMs >= 40) { await frame(); await frame(); }
  act(() => { window.dispatchEvent(ptr('pointerup', 300 + dx)); });
  await frame();
};

describe('Drawer', () => {
  it('opens from the left over a scrim, portalled to the body, named by label; closes', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const d = drawer();
    expect(d).toHaveAccessibleName('Main menu');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAttribute('data-side', 'left');
    for (const c of ['absolute', 'inset-y-0', 'left-0', 'w-[min(20rem,85vw)]', 'rounded-r-[var(--radius-2xl)]']) expect(d.className.split(' ')).toContain(c);
    expect(d.parentElement?.parentElement).toBe(document.body);
    expect(document.querySelector('[data-sheet-scrim]')).toBeInTheDocument();
    // sliding in from off the left edge (user-event's click lets a frame or two pass)
    expect(d.style.transform).toMatch(/translateX\(-(100|9\d(\.\d+)?)%\)/);
    await user.keyboard('{Escape}');
    await gone();
  });

  it('on the elevated surface by default; surface="canvas" puts it on the canvas surface, the shadow kept (T51)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    let cls = drawer().className.split(' ');
    expect(drawer()).toHaveAttribute('data-surface', 'elevated');
    expect(cls).toContain('bg-[var(--color-surface-elevated)]');
    expect(cls).not.toContain('bg-[var(--color-surface-canvas)]');
    expect(cls).toContain('shadow-[var(--elevation-3)]');
    unmount();
    render(<Demo surface="canvas" />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    cls = drawer().className.split(' ');
    expect(drawer()).toHaveAttribute('data-surface', 'canvas');
    expect(cls).toContain('bg-[var(--color-surface-canvas)]');
    expect(cls).not.toContain('bg-[var(--color-surface-elevated)]');
    expect(cls).toContain('shadow-[var(--elevation-3)]');
  });

  it('the contents scroll inside it, inside the safe-area insets', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const body = drawer().querySelector('[data-drawer-body]')!;
    expect(body).toContainElement(screen.getByTestId('body'));
    for (const c of ['overflow-y-auto', 'overscroll-contain', 'pt-safe-md', 'pb-safe-md', 'pl-safe-md']) expect(body.className.split(' ')).toContain(c);
  });

  it('a tap on the scrim closes it; a tap inside does not', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Demo onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByTestId('body'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(document.querySelector('[data-sheet-scrim]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    await gone();
  });

  it('Escape closes it, but not an Escape a widget inside claimed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const claim = (e: React.KeyboardEvent) => { if (e.key === 'Escape') e.preventDefault(); };
    render(<Demo onClose={onClose} inner={<input aria-label="Search" onKeyDown={claim} />} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('textbox', { name: 'Search' }));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Theme' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('only the top dialog answers Escape: a dialog over it closes alone', async () => {
    const user = userEvent.setup();
    const under = jest.fn();
    const over = jest.fn();
    render(
      <>
        <Drawer open label="Menu" onClose={under}><button type="button">A</button></Drawer>
        <Drawer open label="Over" onClose={over}><button type="button">B</button></Drawer>
      </>,
    );
    await user.keyboard('{Escape}');
    expect(over).toHaveBeenCalledTimes(1);
    expect(under).not.toHaveBeenCalled();
  });

  it('focus moves in, Tab and Shift+Tab wrap inside it, and focus goes back to the opener on close', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const opener = screen.getByRole('button', { name: 'Menu' });
    await user.click(opener);
    expect(drawer()).toHaveFocus();
    const first = screen.getByRole('link', { name: 'Releases' });
    const last = screen.getByRole('button', { name: 'Theme' });
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  it('locks the page scroll while open and gives it back on close', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

  it('a swipe left past a quarter of its width closes it', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Demo onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await drag(screen.getByTestId('body'), -120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a short slow swipe springs back and leaves it open', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Demo onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await drag(screen.getByTestId('body'), -40);
    expect(onClose).not.toHaveBeenCalled();
    expect(drawer()).toBeInTheDocument();
  });

  it('a swipe that starts on a link or a button never moves or closes it; a tap on the link still fires', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Demo onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const link = screen.getByRole('link', { name: 'Releases' });
    const clicked = jest.fn((e: MouseEvent) => e.preventDefault());
    link.addEventListener('click', clicked);
    await drag(link, -200);
    await drag(screen.getByRole('button', { name: 'Theme' }), -200);
    expect(onClose).not.toHaveBeenCalled();
    expect(drawer().style.transform).not.toMatch(/translateX\(-[1-9]/);
    await user.click(link);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('leaves vertical scroll and pinch-zoom to the browser, and text selectable', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const d = drawer();
    for (const c of ['touch-pan-y', 'touch-pinch-zoom']) expect(d.className.split(' ')).toContain(c);
    // framer's own listener would have set these inline (none and pan-y); the drag runs through controls instead
    expect(d.getAttribute('style') ?? '').not.toMatch(/user-select|touch-action/);
  });

  it('two drawers closed out of order leave the page unlocked', () => {
    document.body.style.overflow = 'auto';
    const one = (a: boolean, b: boolean) => (
      <>
        <Drawer open={a} label="A" onClose={() => {}}><button type="button">A</button></Drawer>
        <Drawer open={b} label="B" onClose={() => {}}><button type="button">B</button></Drawer>
      </>
    );
    const { rerender } = render(one(true, false));
    rerender(one(true, true));
    expect(document.body.style.overflow).toBe('hidden');
    rerender(one(false, true)); // the first closes first
    expect(document.body.style.overflow).toBe('hidden');
    rerender(one(false, false));
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

  it('closesDrawer: past a quarter of the width leftward, or a left flick; never rightward', () => {
    expect(closesDrawer(-81, 0, 320)).toBe(true);
    expect(closesDrawer(-79, 0, 320)).toBe(false);
    expect(closesDrawer(-10, -600, 320)).toBe(true);
    expect(closesDrawer(200, 900, 320)).toBe(false);
  });
});
