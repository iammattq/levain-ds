// T29: one dialog behaviour across levain's card dialogs (useDialogFocus): StatusCardDialog and StatusCardDialogStack
// hold focus (Tab and Shift+Tab wrap inside), give it back on close, and with a dialog over them only the top one
// closes on Escape. Desktop width (nothing in matchMedia matches).
import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StatusCard, StatusCardDialog } from '../StatusCard';
import { StatusCardDialogStack, type StatusCardStackDialog } from '../StatusCardDialogStack';
import { Modal } from '../../components/Modal';

const LOOK: StatusCardStackDialog = { id: 'L8', number: 'L8', title: 'The strip', children: <textarea aria-label="look notes" /> };
const DECIDE: StatusCardStackDialog = { id: 'D14', number: 'D14', title: 'Strip or arc', children: <button type="button">Send</button> };

function Single() {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  return (
    <>
      <button type="button">Before</button>
      <StatusCard id="T4" number="T4" title="Strip or arc" open={open} onOpen={() => setOpen(true)} />
      <button type="button">After</button>
      <StatusCardDialog id="T4" number="T4" title="Strip or arc" open={open} onClose={() => setOpen(false)}>
        <textarea aria-label="answer" />
        <button type="button" onClick={() => setSure(true)}>Archive</button>
      </StatusCardDialog>
      <Modal isOpen={sure} onClose={() => setSure(false)} title="Archive it?">
        {close => <button type="button" onClick={close}>Yes</button>}
      </Modal>
    </>
  );
}

/** As a board does it: one dialog for the column, its id the open card's, cleared as it closes. */
function Column() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {['T4', 'T5'].map(id => <StatusCard key={id} id={id} number={id} title={'Card ' + id} open={open === id} onOpen={() => setOpen(id)} />)}
      <StatusCardDialog id={open ?? ''} number={open ?? ''} title={'Card ' + open} open={!!open} onClose={() => setOpen(null)}>
        <button type="button">Send</button>
      </StatusCardDialog>
    </>
  );
}

function Pair() {
  const [open, setOpen] = useState<string[]>([]);
  const dialogs = [LOOK, DECIDE].filter(d => open.includes(d.id));
  return (
    <>
      <StatusCard id="L8" title="The strip card" onOpen={() => setOpen(['L8', 'D14'])} open={open.length > 0} />
      <button type="button">Behind</button>
      <StatusCardDialogStack dialogs={dialogs} cardId="L8" onClose={id => setOpen(o => o.filter(x => x !== id))} />
    </>
  );
}

const card = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('StatusCardDialog focus', () => {
  it('Tab and Shift+Tab stay inside; Escape closes; focus goes back to the card that opened it', async () => {
    const user = userEvent.setup();
    render(<Single />);
    await user.click(card('Strip or arc'));
    const dialog = screen.getByRole('dialog', { name: 'Strip or arc' });
    expect(dialog).toHaveFocus();
    const close = screen.getByRole('button', { name: 'Close' });
    const answer = screen.getByRole('textbox', { name: 'answer' });
    const archive = screen.getByRole('button', { name: 'Archive' });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(answer).toHaveFocus();
    await user.tab();
    expect(archive).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(archive).toHaveFocus();
    await user.keyboard('{Escape}');
    // (the dialog collapses back into the card: in jsdom that exit never ends, so the card's return is the sign)
    // the card left the page while it was the dialog, and came back: focus is on it, not lost to the body
    await waitFor(() => expect(card('Strip or arc')).toHaveFocus());
  });

  it('a Modal over it: Escape closes only the Modal, focus back on its opener in the dialog; the next Escape the dialog', async () => {
    const user = userEvent.setup();
    render(<Single />);
    await user.click(card('Strip or arc'));
    const archive = screen.getByRole('button', { name: 'Archive' });
    await user.click(archive);
    expect(screen.getByRole('dialog', { name: 'Archive it?' })).toHaveFocus();
    // the Modal's trap, not the dialog's below it
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('dialog', { name: 'Archive it?' })).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Archive it?' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Strip or arc' })).toBeInTheDocument();
    expect(archive).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(card('Strip or arc')).toHaveFocus());
  });

  it('focus goes back to the card even when the dialog\'s id is cleared as it closes', async () => {
    const user = userEvent.setup();
    render(<Column />);
    await user.click(card('Card T5'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(card('Card T5')).toHaveFocus());
  });
});

describe('StatusCardDialogStack focus', () => {
  it('Tab stays in the front: never into the ones behind or the page; focus goes back to the card when the last closes', async () => {
    const user = userEvent.setup();
    render(<Pair />);
    await user.click(card('The strip card'));
    const front = screen.getByRole('dialog', { name: 'The strip' });
    expect(front).toHaveFocus();
    const close = screen.getByRole('button', { name: 'Close' });
    const notes = screen.getByRole('textbox', { name: 'look notes' });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(notes).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(notes).toHaveFocus();
    // Escape: the front goes, the next comes forward with focus, and holds Tab in turn
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Strip or arc'));
    expect(screen.getByRole('dialog')).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(card('The strip card')).toHaveFocus());
  });
});
