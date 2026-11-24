import React, { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useDialogFocus } from '../useDialogFocus';

function Dialog({ name, open, onClose, children }: { name: string; open: boolean; onClose: () => void; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, ref, onClose);
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
      <button type="button">{name} first</button>
      <button type="button" disabled>{name} disabled</button>
      <button type="button">{name} last</button>
      {children}
      {/* after the last: the trap's ends skip it (jsdom's own Tab doesn't know inert, so it sits at an end) */}
      <div inert><button type="button">{name} inert</button></div>
    </div>
  );
}

function Page() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setA(true)}>Open A</button>
      <Dialog name="A" open={a} onClose={() => setA(false)}>
        <button type="button" onClick={() => setB(true)}>Open B</button>
        <Dialog name="B" open={b} onClose={() => setB(false)} />
      </Dialog>
      <button type="button">Behind</button>
    </>
  );
}

const btn = (name: string) => screen.getByRole('button', { name });

describe('useDialogFocus', () => {
  it('moves focus in, and Tab and Shift+Tab wrap inside, skipping disabled and inert', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(btn('Open A'));
    expect(screen.getByRole('dialog', { name: 'A' })).toHaveFocus();
    await user.tab();
    expect(btn('A first')).toHaveFocus();
    await user.tab();
    expect(btn('A last')).toHaveFocus();
    await user.tab();
    expect(btn('Open B')).toHaveFocus();
    await user.tab();
    expect(btn('A first')).toHaveFocus();
    await user.tab({ shift: true });
    expect(btn('Open B')).toHaveFocus();
    expect(btn('Behind')).not.toHaveFocus();
  });

  it('Shift+Tab from the container itself goes to the last', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(btn('Open A'));
    await user.tab({ shift: true });
    expect(btn('Open B')).toHaveFocus();
  });

  it('Escape closes it and focus returns to the opener', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(btn('Open A'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(btn('Open A')).toHaveFocus();
  });

  it('stacked: only the top answers Escape and Tab; closing it gives focus back inside the one below', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(btn('Open A'));
    await user.click(btn('Open B'));
    expect(screen.getByRole('dialog', { name: 'B' })).toHaveFocus();
    await user.tab();
    expect(btn('B first')).toHaveFocus();
    await user.tab();
    expect(btn('B last')).toHaveFocus();
    await user.tab();
    // B's trap wraps: A's buttons around it are out of reach
    expect(btn('B first')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'B' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'A' })).toBeInTheDocument();
    expect(btn('Open B')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(btn('Open A')).toHaveFocus();
  });

  it('claims Escape, so a listener around it can tell it was answered', async () => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    const around = (e: KeyboardEvent) => { if (e.key === 'Escape') seen.push(e.defaultPrevented); };
    render(<Page />);
    await user.click(btn('Open A'));
    window.addEventListener('keydown', around);
    await user.keyboard('{Escape}');
    window.removeEventListener('keydown', around);
    expect(seen).toEqual([true]);
  });

  it('a widget inside that claims Escape hears it first, and the dialog stays open; unclaimed, the page sees the dialog took it', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    const onDoc = (e: KeyboardEvent) => { if (e.key === 'Escape') seen.push('document ' + e.defaultPrevented); };
    render(<Page />);
    await user.click(btn('Open A'));
    await user.tab();
    let claim = true;
    btn('A first').addEventListener('keydown', e => { if (e.key === 'Escape') { seen.push('inside ' + e.defaultPrevented); if (claim) e.preventDefault(); } });
    document.addEventListener('keydown', onDoc);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'A' })).toBeInTheDocument();
    claim = false;
    await user.keyboard('{Escape}');
    document.removeEventListener('keydown', onDoc);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(seen).toEqual(['inside false', 'document true', 'inside false', 'document true']);
  });

  it('leaves focus where it is when something inside already has it', async () => {
    function Auto() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus(true, () => ref.current, () => {});
      return <div ref={ref} tabIndex={-1}><input aria-label="Name" autoFocus /></div>;
    }
    render(<Auto />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });
});
