// StatusCardDialogStack below md: a pile of bottom sheets (T24). The desktop stack's own tests stay in
// StatusCardDialogStack.test.tsx, untouched.
import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PHONE_QUERY } from '../Sheet';
import { StatusCard } from '../StatusCard';
import { BEHIND_EDGE, PHONE_ORIGIN, phonePose, PILE, pose, StatusCardDialogStack, type StatusCardStackDialog } from '../StatusCardDialogStack';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ matches: query === PHONE_QUERY, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.hasAttribute('data-sheet') ? 800 : 0; } });
});
afterAll(() => { delete (window as { matchMedia?: unknown }).matchMedia; delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight; });

const LOOK: StatusCardStackDialog = { id: 'L8', number: 'L8', title: 'The strip', children: <p data-testid="look-body">Look</p> };
const DECIDE: StatusCardStackDialog = { id: 'D14', number: 'D14', title: 'Strip or arc', children: <button type="button">Send</button> };
const panel = (depth: number) => document.querySelector<HTMLElement>(`[data-stack-depth="${depth}"]`)!;

/** The demo's pair: one card, a look over its decide; Next and Back step through; onClose removes the one it names. */
function Pair({ onClose }: { onClose: (id: string) => void }) {
  const [open, setOpen] = useState<string[]>([]);
  const dialogs = [LOOK, DECIDE].filter(d => open.includes(d.id));
  return (
    <>
      <StatusCard id="L8" title="The strip card" onOpen={() => setOpen(['L8', 'D14'])} open={open.length > 0} />
      <button type="button" onClick={() => setOpen(o => o.slice(1))}>Next</button>
      <StatusCardDialogStack dialogs={dialogs} cardId="L8" onClose={id => { onClose(id); setOpen(o => o.filter(x => x !== id)); }} />
    </>
  );
}

const ptr = (type: string, y: number) => Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: y }), { pointerId: 1, pointerType: 'touch', isPrimary: true, pageX: 100, pageY: y });
const frame = (ms = 40) => act(() => new Promise(r => setTimeout(r, ms)));
const drag = async (from: Element, dy: number) => {
  act(() => { from.dispatchEvent(ptr('pointerdown', 100)); });
  for (let i = 1; i <= 8; i++) { act(() => { window.dispatchEvent(ptr('pointermove', 100 + (dy * i) / 8)); }); await frame(); }
  await frame(); await frame();
  act(() => { window.dispatchEvent(ptr('pointerup', 100 + dy)); });
  await frame();
};

describe('StatusCardDialogStack below md', () => {
  it('is a pile of sheets docked to the bottom over a scrim: the front the one modal dialog, the rest inert behind it', () => {
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={() => {}} />);
    expect(document.querySelector('[data-sheet-scrim]')).toBeInTheDocument();
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toBe(panel(0));
    expect(panel(0)).toHaveAttribute('data-sheet');
    expect(panel(0)).toHaveAttribute('aria-modal', 'true');
    expect(panel(0)).toHaveFocus();
    expect(panel(0).className).toContain('rounded-t-[var(--radius-2xl)]');
    expect(panel(0).parentElement!.className).toContain('bottom-0');
    const behind = panel(1);
    expect(behind).toHaveAttribute('data-sheet');
    expect(behind).toHaveAttribute('inert');
    expect(behind).toHaveAttribute('aria-hidden', 'true');
    expect(behind).not.toHaveAttribute('role');
    // the board's pile look: the hairline in light, the front's size, its words hidden
    expect(behind.className).toContain(BEHIND_EDGE);
    expect(behind.className).toContain('[contain:size]');
    // a handle on each; only the front's can be dragged (checked below)
    expect(panel(0).querySelector('[data-sheet-handle]')).toBeInTheDocument();
  });

  it('the pile peeks above the front (Q41 A): each step PILE.y px higher and PILE.scale narrower from the top edge, three at most', () => {
    expect(phonePose(0)).toEqual({ y: 0, scale: 1, opacity: 1 });
    expect(phonePose(1)).toEqual({ y: -PILE.y, scale: 1 - PILE.scale, opacity: 1 });
    expect(phonePose(3)).toEqual({ y: -3 * PILE.y, scale: 1 - 3 * PILE.scale, opacity: 1 });
    expect(phonePose(4)).toEqual({ ...phonePose(3), opacity: 0 });
    // the desktop's pile is unchanged: below
    expect(pose(1).y).toBe(PILE.y);
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={() => {}} />);
    for (const d of [0, 1]) expect(panel(d).style.transformOrigin).toBe('50% 0% 0');
    expect(PHONE_ORIGIN).toEqual({ originX: 0.5, originY: 0 });
  });

  it('rises from the bottom when it opens; never grows out of the card, which stays where it is', () => {
    render(<Pair onClose={() => {}} />);
    fireEvent.click(screen.getByText('The strip card'));
    expect(panel(0).style.transform).toContain('translateY(100%)');
    // the card is still drawn (its title), not held as an empty slot
    expect(screen.getByText('The strip card')).toBeInTheDocument();
    expect(document.querySelector('[data-stack-surface]')).toBeNull();
  });

  it('Escape, a tap outside and the ✕ close the front only', () => {
    const onClose = jest.fn();
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(document.querySelector('[data-sheet-scrim]')!);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose.mock.calls).toEqual([['L8'], ['L8'], ['L8']]);
  });

  it('a tap inside the front sheet closes nothing', () => {
    const onClose = jest.fn();
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('look-body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Next brings the one behind forward: it becomes the dialog, takes focus, and is no longer inert', () => {
    render(<Pair onClose={() => {}} />);
    fireEvent.click(screen.getByText('The strip card'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // the look is still going away (its exit), so the front is found by its name
    const front = screen.getByRole('dialog', { name: 'Strip or arc' });
    expect(front).toHaveAttribute('data-stack-depth', '0');
    expect(front).not.toHaveAttribute('inert');
    expect(front).toHaveFocus();
  });

  it('swiping the front sheet down by its handle closes the whole stack: onClose for each dialog, front first', async () => {
    const onClose = jest.fn();
    render(<Pair onClose={onClose} />);
    fireEvent.click(screen.getByText('The strip card'));
    await drag(panel(0).querySelector('[data-sheet-handle]')!, 300);
    expect(onClose.mock.calls).toEqual([['L8'], ['D14']]);
  });

  it('a short swipe springs back and closes nothing; the sheets behind never drag', async () => {
    const onClose = jest.fn();
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={onClose} />);
    await drag(panel(0).querySelector('[data-sheet-handle]')!, 60);
    await drag(panel(1).querySelector('[data-sheet-handle]')!, 400);
    expect(onClose).not.toHaveBeenCalled();
  });
});
