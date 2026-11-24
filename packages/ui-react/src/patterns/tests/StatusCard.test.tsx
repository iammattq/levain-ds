import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StatusCard, StatusCardDialog } from '../StatusCard';
import { SortableGroup, SortableList } from '../../components/SortableList';

function Card() {
  const [open, setOpen] = useState(false);
  const markers = [{ label: 'eng1' }, { label: '2h', title: 'waiting 2 hours' }, { label: 'blocked', tone: 'error' as const }];
  return (
    <>
      <StatusCard id="T4" number="T4" kind={{ label: 'Decide', tone: 'accent' }} title="Strip or arc" markers={markers} open={open} onOpen={() => setOpen(true)} />
      <StatusCardDialog id="T4" number="T4" title="Strip or arc" markers={markers} open={open} onClose={() => setOpen(false)}>
        <p>The full question</p>
      </StatusCardDialog>
    </>
  );
}

describe('StatusCard', () => {
  it('shows its number, kind, title and every marker, with spelled-out titles for assistive technology', () => {
    render(<Card />);
    for (const t of ['T4', 'Decide', 'Strip or arc', 'eng1', '2h', 'blocked', 'waiting 2 hours']) expect(screen.getAllByText(t)[0]).toBeInTheDocument();
  });

  it('the caution tone is amber: its text on --color-caution-fg, its bar on --color-caution (T27)', () => {
    const { container } = render(
      <StatusCard id="T5" title="Held" accent="caution" kind={{ label: 'Waiting', tone: 'caution' }} markers={[{ label: 'stale', tone: 'caution' }]} />
    );
    expect(screen.getByText('Waiting').className).toContain('text-[var(--color-caution-fg)]');
    expect(screen.getByText('stale').closest('li')!.className).toContain('text-[var(--color-caution-fg)]');
    expect(container.querySelector('span.w-\\[3px\\]')!.className).toContain('bg-[var(--color-caution)]');
  });

  it('opens into its dialog and closes back with Escape; the card itself is in the dialog while open', () => {
    render(<Card />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('The full question')).toBeInTheDocument();
    // the card's slot is held (no second copy of the title outside the dialog)
    expect(screen.getAllByText('Strip or arc')).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('the dialog floats on the elevated surface, a step above the cards it grows out of', () => {
    render(<Card />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog').className).toContain('bg-[var(--color-surface-elevated)]');
  });

  it('keeps focus where it was put while open, even when re-rendered with a new onClose; Escape calls the latest onClose; closing returns focus', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const dialog = (open: boolean, onClose: () => void) => (
      <StatusCardDialog id="T5" number="T5" title="Notes" open={open} onClose={onClose}>
        <textarea aria-label="answer" />
      </StatusCardDialog>
    );
    const first = jest.fn();
    const { rerender } = render(dialog(true, first));
    const box = screen.getByLabelText('answer');
    box.focus();
    expect(box).toHaveFocus();
    // a live update hands the dialog a fresh inline onClose
    const latest = jest.fn();
    rerender(dialog(true, latest));
    expect(box).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    rerender(dialog(false, latest));
    expect(opener).toHaveFocus();
    opener.remove();
  });

  describe('actions', () => {
    const answers = (onPick: (w: string) => void) => (
      <>
        <button type="button" onClick={() => onPick('Strip')}>Strip</button>
        <button type="button" onClick={() => onPick('Arc')}>Arc</button>
      </>
    );

    it('a click, Enter, Space or pointerdown on an answer never opens the card; the answer still hears its press', () => {
      const onOpen = jest.fn(), onPick = jest.fn(), wrapper = jest.fn();
      render(
        <div onClick={wrapper} onKeyDown={wrapper} onPointerDown={wrapper}>
          <StatusCard id="T4" title="Strip or arc" onOpen={onOpen} actions={answers(onPick)} />
        </div>,
      );
      const strip = screen.getByRole('button', { name: 'Strip' });
      fireEvent.pointerDown(strip);
      fireEvent.click(strip);
      fireEvent.keyDown(strip, { key: 'Enter' });
      fireEvent.keyDown(strip, { key: ' ' });
      // and the row's own gaps
      fireEvent.click(strip.parentElement!);
      expect(onOpen).not.toHaveBeenCalled();
      expect(wrapper).not.toHaveBeenCalled();
      expect(onPick).toHaveBeenCalledWith('Strip');
      // the face still opens it
      fireEvent.click(screen.getByText('Strip or arc'));
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('only Enter and Space stop at the row: Escape and other keys still reach window-level shortcuts', () => {
      const keys: string[] = [];
      const onKey = (e: KeyboardEvent) => keys.push(e.key);
      window.addEventListener('keydown', onKey);
      render(<StatusCard id="T4" title="Strip or arc" onOpen={() => {}} actions={answers(() => {})} />);
      const strip = screen.getByRole('button', { name: 'Strip' });
      for (const key of ['Escape', 'ArrowDown', 'k', 'Enter', ' ']) fireEvent.keyDown(strip, { key });
      window.removeEventListener('keydown', onKey);
      expect(keys).toEqual(['Escape', 'ArrowDown', 'k']);
    });

    it('sits outside the open target, under the markers and children', () => {
      render(<StatusCard id="T4" title="Strip or arc" markers={[{ label: 'eng1' }]} onOpen={() => {}} actions={answers(() => {})}><p>More</p></StatusCard>);
      const target = screen.getByText('Strip or arc').closest('[role="button"]')!;
      const row = screen.getByRole('button', { name: 'Strip' }).closest('[data-status-card-actions]')!;
      expect(target.contains(row)).toBe(false);
      expect(target.contains(screen.getByText('More'))).toBe(true);
      expect(target.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Tab reaches the answers, though the card\'s own target takes no Tab stop', async () => {
      const user = userEvent.setup();
      render(<StatusCard id="T4" title="Strip or arc" onOpen={() => {}} actions={answers(() => {})} />);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Strip' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Arc' })).toHaveFocus();
    });

    it('the row is gone while open (the placeholder holds the place)', () => {
      const { rerender } = render(<StatusCard id="T4" title="Strip or arc" onOpen={() => {}} actions={answers(() => {})} />);
      rerender(<StatusCard id="T4" title="Strip or arc" open onOpen={() => {}} actions={answers(() => {})} />);
      expect(screen.queryByRole('button', { name: 'Strip' })).toBeNull();
    });

    it('without actions the card renders exactly as before: no row', () => {
      const { container } = render(<StatusCard id="T4" title="Strip or arc" onOpen={() => {}}><p>More</p></StatusCard>);
      expect(container.querySelector('[data-status-card-actions]')).toBeNull();
      const card = container.firstElementChild!;
      expect(card.children).toHaveLength(1);
      expect(card.firstElementChild!.getAttribute('role')).toBe('button');
    });

    describe('in a SortableGroup', () => {
      let dragging: boolean[] = [];
      const onMove = jest.fn();
      beforeEach(() => { dragging = []; onMove.mockClear(); });
      const board = () => render(
        <SortableGroup onMove={onMove} onDragChange={d => dragging.push(d)}>
          <SortableList id="decide" label="Decide" items={['T4']} getKey={t => t}
            renderItem={t => <StatusCard id={t} title="Strip or arc" onOpen={() => {}} actions={answers(() => {})} />} />
        </SortableGroup>,
      );
      const item = () => screen.getByText('Strip or arc').closest('[role="listitem"]') as HTMLElement;

      // jsdom has no PointerEvent and drops a pointer's fields, so the gesture is built by hand
      const ptr = (type: string, pointerId: number, x: number) => {
        const e = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: x });
        return Object.assign(e, { pointerId, pointerType: 'mouse' });
      };
      const gesture = (from: Element, id: number) => {
        act(() => { from.dispatchEvent(ptr('pointerdown', id, 10)); });
        act(() => { window.dispatchEvent(ptr('pointermove', id, 60)); });
      };

      it('a mouse press and move from an answer starts no drag; from the face it does', () => {
        board();
        gesture(screen.getByRole('button', { name: 'Strip' }), 1);
        act(() => { window.dispatchEvent(ptr('pointerup', 1, 60)); });
        expect(dragging).not.toContain(true);
        // control: the same gesture from the face lifts it
        gesture(screen.getByText('Strip or arc'), 2);
        expect(dragging).toContain(true);
        act(() => { window.dispatchEvent(ptr('pointercancel', 2, 60)); });
      });

      it('Space on an answer presses it and picks nothing up; Space on the item still does', () => {
        board();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Strip' }), { key: ' ' });
        expect(screen.queryByText(/Picked up/)).toBeNull();
        fireEvent.keyDown(item(), { key: ' ' });
        expect(screen.getByText(/Picked up/)).toBeInTheDocument();
      });

      it('a touch in the row (between the answers) starts no hold', () => {
        jest.useFakeTimers();
        board();
        const row = screen.getByRole('button', { name: 'Strip' }).parentElement!;
        const pt = [{ identifier: 1, clientX: 10, clientY: 10 }];
        act(() => { fireEvent.touchStart(row, { touches: pt, changedTouches: pt }); });
        act(() => { jest.advanceTimersByTime(600); });
        expect(dragging).not.toContain(true);
        jest.useRealTimers();
      });
    });
  });
});
