import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useReducedMotion } from 'framer-motion';
import { duration, recipe } from '@levain/tokens';
import { DIALOG_PANEL } from '../StatusCard';
import { AWAY_LIFT, away, BEHIND_EDGE, CONTENT_AFTER_SURFACE, CONTENT_DELAY, PILE, PILE_ORIGIN, pose, StatusCardDialogStack, type StatusCardStackDialog } from '../StatusCardDialogStack';

jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: jest.fn(() => false) }));
const reduced = useReducedMotion as jest.Mock;

const LOOK: StatusCardStackDialog = { id: 'L8', number: 'L8', title: 'The strip', children: <textarea aria-label="look notes" /> };
const DECIDE: StatusCardStackDialog = { id: 'D14', number: 'D14', title: 'Strip or arc', children: <button type="button">Send</button> };

const stack = (dialogs: StatusCardStackDialog[], onClose: (id: string) => void = () => {}) => <StatusCardDialogStack dialogs={dialogs} onClose={onClose} />;
const panel = (depth: number) => document.querySelector<HTMLElement>(`[data-stack-depth="${depth}"]`)!;

let opener: HTMLButtonElement;
beforeEach(() => {
  reduced.mockReturnValue(false);
  opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
});
afterEach(() => opener.remove());

describe('StatusCardDialogStack', () => {
  it('renders nothing while its list is empty', () => {
    render(stack([]));
    expect(document.querySelector('[data-dialog-stack]')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('takes its dialogs front first: the first is the one modal dialog, the rest are behind it in order', () => {
    render(stack([LOOK, DECIDE]));
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveAttribute('aria-modal', 'true');
    expect(dialogs[0]).toHaveAccessibleName('The strip');
    expect(panel(0)).toBe(dialogs[0]);
    expect(panel(1)).toHaveTextContent('Strip or arc');
    // one overlay for the whole stack
    expect(document.querySelectorAll('[data-dialog-stack]')).toHaveLength(1);
  });

  it('the ones behind are inert and aria-hidden, not dialogs, and nothing in them takes focus', () => {
    render(stack([LOOK, DECIDE]));
    const behind = panel(1);
    expect(behind).toHaveAttribute('inert');
    expect(behind).toHaveAttribute('aria-hidden', 'true');
    expect(behind).not.toHaveAttribute('role');
    expect(behind).not.toHaveAttribute('aria-modal');
    expect(behind).not.toHaveAttribute('tabindex');
    expect(panel(0)).not.toHaveAttribute('inert');
    expect(panel(0)).not.toHaveAttribute('aria-hidden');
  });

  it('draws the ones behind as the board pile: lower and smaller per step from the bottom edge, three at most', () => {
    expect(pose(0)).toEqual({ y: 0, scale: 1, opacity: 1 });
    expect(pose(1)).toEqual({ y: PILE.y, scale: 1 - PILE.scale, opacity: 1 });
    expect(pose(3)).toEqual({ y: 3 * PILE.y, scale: 1 - 3 * PILE.scale, opacity: 1 });
    expect(pose(4)).toEqual({ y: 3 * PILE.y, scale: 1 - 3 * PILE.scale, opacity: 0 });
    expect(PILE).toMatchObject({ y: 10, scale: 0.05, depth: 3, origin: '50% 100%' });
    render(stack([LOOK, DECIDE]));
    expect(panel(1).style.transformOrigin).toBe(PILE.origin + ' 0');
    // in the front's grid cell, filling it without sizing it
    expect(panel(1).className).toContain('[contain:size]');
    expect(panel(0).className).not.toContain('[contain:size]');
  });

  it('the ones behind carry the board light cards\' hairline under the shadow (dark: shadow only); the front keeps the dialog\'s surface', () => {
    render(stack([LOOK, DECIDE]));
    const behind = panel(1).className, front = panel(0).className;
    expect(behind).toContain('shadow-[inset_0_0_0_1px_var(--color-border-subtle),var(--elevation-3)]');
    expect(behind).toContain('dark:shadow-[var(--elevation-3)]');
    expect(behind).not.toMatch(/(^| )shadow-\[var\(--elevation-3\)\]/);
    expect(front).toContain('shadow-[var(--elevation-3)]');
    expect(front).not.toContain('border-subtle');
    expect(BEHIND_EDGE).toContain('--color-border-subtle');
  });

  it('focuses the front on opening and the next one when the front leaves', async () => {
    const { rerender } = render(stack([LOOK, DECIDE]));
    expect(panel(0)).toHaveFocus();
    rerender(stack([DECIDE]));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Strip or arc'));
    expect(screen.getByRole('dialog')).toHaveFocus();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('inert');
  });

  it('takes a leaving front out of flow at once, so the next one can take its place while it goes away', () => {
    const { rerender } = render(stack([LOOK, DECIDE]));
    const look = panel(0);
    // jsdom lays nothing out: give the panel a size for popLayout to measure
    Object.assign(look.style, { width: '600px', height: '400px' });
    rerender(stack([DECIDE]));
    // still leaving, and popped (AnimatePresence popLayout reaches it through Panel's forwarded ref)
    expect(look).toBeInTheDocument();
    expect(look).toHaveAttribute('data-motion-pop-id');
  });

  it('Escape asks to close only the front, through the latest onClose, and keeps focus where it was put (D258)', () => {
    const first = jest.fn();
    const { rerender } = render(stack([LOOK, DECIDE], first));
    const notes = screen.getByLabelText('look notes');
    notes.focus();
    const latest = jest.fn();
    rerender(stack([LOOK, DECIDE], latest));
    expect(notes).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest).toHaveBeenCalledTimes(1);
    expect(latest).toHaveBeenCalledWith('L8');
    expect(first).not.toHaveBeenCalled();
  });

  it('a click outside asks to close the front; a click in it does not; its ✕ does', () => {
    const onClose = jest.fn();
    render(stack([LOOK, DECIDE], onClose));
    fireEvent.click(panel(0));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('[data-dialog-stack]')!);
    expect(onClose).toHaveBeenCalledWith('L8');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenLastCalledWith('L8');
  });

  it('returns focus to what had it before the stack opened when the last one closes, not when the front changes', async () => {
    const { rerender } = render(stack([LOOK, DECIDE]));
    rerender(stack([DECIDE]));
    expect(opener).not.toHaveFocus();
    rerender(stack([]));
    expect(opener).toHaveFocus();
    // the overlay lets clicks through while the last one leaves, then goes
    await waitFor(() => expect(document.querySelector('[data-dialog-stack]')).toBeNull());
  });

  it('Escape does nothing once the stack is closed', () => {
    const onClose = jest.fn();
    const { rerender } = render(stack([LOOK], onClose));
    rerender(stack([], onClose));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the front goes away by lifting and fading on the travel recipe', () => {
    expect(away(false)).toEqual({ y: -AWAY_LIFT, opacity: 0, transition: recipe.travel });
  });

  describe('under Reduce Motion', () => {
    it('going away is only a fade: nothing moves', () => {
      expect(away(true)).toEqual({ opacity: 0, transition: recipe.travel });
      expect(away(true)).not.toHaveProperty('y');
    });

    it('the front still leaves and the next comes forward, focused, with the pile drawn the same', async () => {
      reduced.mockReturnValue(true);
      const { rerender } = render(stack([LOOK, DECIDE]));
      expect(panel(1).style.transformOrigin).toBe(PILE.origin + ' 0');
      expect(panel(1)).toHaveAttribute('inert');
      rerender(stack([DECIDE]));
      await waitFor(() => expect(screen.queryByText('The strip')).toBeNull());
      expect(screen.getByRole('dialog')).toHaveAccessibleName('Strip or arc');
      expect(screen.getByRole('dialog')).toHaveFocus();
    });
  });

  it("sets the pile's origin as framer's originX/originY, which survive a layout animation, not as a CSS transformOrigin", () => {
    // framer's projection writes transform-origin from originX/originY once a panel has had a layout animation (T23)
    expect(PILE_ORIGIN).toEqual({ originX: 0.5, originY: 1 });
    expect(`${PILE_ORIGIN.originX * 100}% ${PILE_ORIGIN.originY * 100}%`).toBe(PILE.origin);
    render(<StatusCardDialogStack dialogs={[LOOK, DECIDE]} onClose={() => {}} cardId="L8" />);
    expect(panel(1).style.transformOrigin).toBe(PILE.origin + ' 0');
  });

  describe('without a cardId', () => {
    it('is the panel as before: its own surface and no surface layer', () => {
      render(stack([LOOK, DECIDE]));
      expect(document.querySelector('[data-stack-surface]')).toBeNull();
      expect(panel(0).className).toContain(DIALOG_PANEL);
      expect(panel(1).className).toContain(BEHIND_EDGE);
    });
  });

  describe('with a cardId: one card for the pile', () => {
    const cardStack = (dialogs: StatusCardStackDialog[]) => <StatusCardDialogStack dialogs={dialogs} onClose={() => {}} cardId="P1" />;
    const surface = (depth: number) => panel(depth).querySelector<HTMLElement>('[data-stack-surface]')!;
    // how many surfaces hold the card's layoutId, at most, across every DOM change: never two at once
    let most = 0;
    let watch: MutationObserver;
    const holders = () => document.querySelectorAll('[data-stack-surface="card"]').length;
    beforeEach(() => {
      most = 0;
      watch = new MutationObserver(() => { most = Math.max(most, holders()); });
      watch.observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    afterEach(() => watch.disconnect());

    it("keeps today's content timing, as the single dialog (Q28): the words fade in while the box grows", () => {
      expect(CONTENT_AFTER_SURFACE).toBe(false);
    });

    it('with CONTENT_AFTER_SURFACE on, the content waiting for the surface would be fully in as the morph ends', () => {
      // starting at the end of the morph put the words in at ~690 ms, against ~310 ms for a single dialog
      expect(CONTENT_DELAY * 1000 + duration.contentIn).toBe(duration.morph);
      expect(CONTENT_DELAY).toBeGreaterThan(0);
    });

    it('the front when it opens holds the card (grows out of it), the ones behind keep their own', () => {
      render(cardStack([LOOK, DECIDE]));
      expect(surface(0)).toHaveAttribute('data-stack-surface', 'card');
      expect(surface(1)).toHaveAttribute('data-stack-surface', 'own');
      expect(holders()).toBe(1);
    });

    it('draws each surface as a layer behind the content: aria-hidden, no pointer events, the pile look on it', () => {
      render(cardStack([LOOK, DECIDE]));
      for (const d of [0, 1]) {
        const s = surface(d);
        expect(panel(d).firstElementChild).toBe(s);
        expect(s).toHaveAttribute('aria-hidden', 'true');
        expect(s.className).toContain('pointer-events-none');
        expect(s.className).toContain('absolute');
        expect(s).toBeEmptyDOMElement();
      }
      expect(surface(0).className).toContain('shadow-[var(--elevation-3)]');
      expect(surface(1).className).toContain(BEHIND_EDGE);
      // the pose is on the panel, which carries its surface
      expect(panel(1).style.transformOrigin).toBe(PILE.origin + ' 0');
    });

    it('hands the card to the next front once the one that left is gone, never two holding it', async () => {
      const { rerender } = render(cardStack([LOOK, DECIDE]));
      const decide = panel(1);
      rerender(cardStack([DECIDE]));
      await waitFor(() => expect(screen.queryByText('The strip')).toBeNull());
      await waitFor(() => expect(surface(0)).toHaveAttribute('data-stack-surface', 'card'));
      // the same panel, its content and focus kept: only the surface layer changed
      expect(panel(0)).toBe(decide);
      expect(document.activeElement).toBe(decide);
      expect(most).toBe(1);
    });

    it('takes the card back from a holder now behind it in two steps, the behind one first', async () => {
      const { rerender } = render(cardStack([LOOK, DECIDE]));
      rerender(cardStack([DECIDE]));
      await waitFor(() => expect(surface(0)).toHaveAttribute('data-stack-surface', 'card'));
      rerender(cardStack([LOOK, DECIDE]));
      await waitFor(() => expect(surface(0)).toHaveAttribute('data-stack-surface', 'card'));
      expect(surface(1)).toHaveAttribute('data-stack-surface', 'own');
      expect(most).toBe(1);
    });

    it('the last to close holds the card as it leaves, so it collapses into it', async () => {
      const { rerender } = render(cardStack([LOOK, DECIDE]));
      rerender(cardStack([DECIDE]));
      await waitFor(() => expect(surface(0)).toHaveAttribute('data-stack-surface', 'card'));
      rerender(cardStack([]));
      // still drawn while it leaves, holding the card
      expect(document.querySelector('[data-stack-surface="card"]')).not.toBeNull();
      await waitFor(() => expect(document.querySelector('[data-dialog-stack]')).toBeNull());
      expect(most).toBe(1);
    });

    it('opened again, the new front holds the card', async () => {
      const { rerender } = render(cardStack([LOOK, DECIDE]));
      rerender(cardStack([]));
      await waitFor(() => expect(document.querySelector('[data-dialog-stack]')).toBeNull());
      rerender(cardStack([DECIDE, LOOK]));
      expect(surface(0)).toHaveAttribute('data-stack-surface', 'card');
      expect(surface(1)).toHaveAttribute('data-stack-surface', 'own');
    });
  });
});
