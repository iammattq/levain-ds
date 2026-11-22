import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusCard, StatusCardDialog } from '../StatusCard';

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
});
