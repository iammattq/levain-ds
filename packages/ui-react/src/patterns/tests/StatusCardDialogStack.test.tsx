import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useReducedMotion } from 'framer-motion';
import { recipe } from '@levain/tokens';
import { AWAY_LIFT, away, PILE, pose, StatusCardDialogStack, type StatusCardStackDialog } from '../StatusCardDialogStack';

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
    expect(panel(1).style.transformOrigin).toBe('50% 100%');
    expect(panel(1).className).toContain('absolute inset-0');
  });

  it('focuses the front on opening and the next one when the front leaves', async () => {
    const { rerender } = render(stack([LOOK, DECIDE]));
    expect(panel(0)).toHaveFocus();
    rerender(stack([DECIDE]));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Strip or arc'));
    expect(screen.getByRole('dialog')).toHaveFocus();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('inert');
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
      expect(panel(1).style.transformOrigin).toBe('50% 100%');
      expect(panel(1)).toHaveAttribute('inert');
      rerender(stack([DECIDE]));
      await waitFor(() => expect(screen.queryByText('The strip')).toBeNull());
      expect(screen.getByRole('dialog')).toHaveAccessibleName('Strip or arc');
      expect(screen.getByRole('dialog')).toHaveFocus();
    });
  });
});
