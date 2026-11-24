import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, type MenuOption } from '../Menu';

// framer-motion as plain elements: no animation, its props dropped
jest.mock('framer-motion', () => {
  const R = jest.requireActual('react') as typeof React;
  const strip = ({ initial, animate, exit, transition, layout, ...rest }: Record<string, unknown>) => rest;
  const div = R.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) =>
    R.createElement('div', { ...strip(props), ref })
  );
  return {
    motion: { div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

const PROJECTS: MenuOption[] = [
  { value: 'levain', label: 'levain' },
  { value: 'portfolio', label: 'portfolio', end: <span data-testid="ring">ring</span> },
  { value: 'ringmaster', label: 'ringmaster' },
];

function Switcher({ items = PROJECTS, initial = 'portfolio' as string | null, onSelect = (_: string) => {} }) {
  const [current, setCurrent] = useState(initial ?? undefined);
  return (
    <>
      <Menu
        label="Project"
        items={items}
        value={current}
        onSelect={(v) => {
          setCurrent(v);
          onSelect(v);
        }}
        trigger={(p) => (
          <button type="button" data-testid="trigger" {...p}>
            {current ?? 'Actions'}
          </button>
        )}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByTestId('trigger');
const row = (name: string) => screen.getByText(name, { selector: '.truncate' }).closest('button')!;
const menu = () => screen.queryByRole('menu');

async function openByKey() {
  trigger().focus();
  await userEvent.keyboard('{ArrowDown}');
}

describe('Menu', () => {
  it('is a Popover with role="menu": the trigger says so, and the rows are menuitemradio with the chosen one checked', async () => {
    render(<Switcher />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(trigger());
    expect(screen.getByRole('menu', { name: 'Project' })).toBeInTheDocument();
    const rows = screen.getAllByRole('menuitemradio');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    rows.forEach((r) => expect(r).toHaveAttribute('tabindex', '-1'));
    // the end slot is part of the row, before the check
    expect(rows[1]).toContainElement(screen.getByTestId('ring'));
  });

  it('without a value the rows are plain menuitems and nothing is checked', async () => {
    render(<Switcher initial={null} />);
    await userEvent.click(trigger());
    const rows = screen.getAllByRole('menuitem');
    expect(rows).toHaveLength(3);
    rows.forEach((r) => expect(r).not.toHaveAttribute('aria-checked'));
    expect(screen.queryAllByRole('menuitemradio')).toHaveLength(0);
    // focus starts on the first
    expect(rows[0]).toHaveFocus();
  });

  it('ArrowDown on the trigger opens it, with focus on the chosen row', async () => {
    render(<Switcher />);
    await openByKey();
    expect(menu()).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(row('portfolio')).toHaveFocus();
  });

  it('focus starts on the first enabled row when the chosen one is missing or disabled', async () => {
    render(
      <Switcher
        initial="ringmaster"
        items={[
          { value: 'a', label: 'a', disabled: true },
          { value: 'b', label: 'b' },
          { value: 'ringmaster', label: 'ringmaster', disabled: true },
        ]}
      />
    );
    await openByKey();
    expect(row('b')).toHaveFocus();
  });

  it('ArrowDown and ArrowUp move through the rows and wrap at both ends', async () => {
    render(<Switcher />);
    await openByKey();
    await userEvent.keyboard('{ArrowDown}');
    expect(row('ringmaster')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(row('levain')).toHaveFocus(); // wrapped to the first
    await userEvent.keyboard('{ArrowUp}');
    expect(row('ringmaster')).toHaveFocus(); // wrapped to the last
    await userEvent.keyboard('{ArrowUp}');
    expect(row('portfolio')).toHaveFocus();
  });

  it('Home and End go to the first and last rows', async () => {
    render(<Switcher />);
    await openByKey();
    await userEvent.keyboard('{End}');
    expect(row('ringmaster')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(row('levain')).toHaveFocus();
  });

  it('disabled rows are skipped by every key and do nothing when pressed', async () => {
    const onSelect = jest.fn();
    render(
      <Switcher
        initial="b"
        onSelect={onSelect}
        items={[
          { value: 'a', label: 'a', disabled: true },
          { value: 'b', label: 'b' },
          { value: 'c', label: 'c', disabled: true },
          { value: 'd', label: 'd' },
          { value: 'e', label: 'e', disabled: true },
        ]}
      />
    );
    await openByKey();
    expect(row('a')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(row('d')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(row('b')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(row('d')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(row('b')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(row('d')).toHaveFocus();
    await userEvent.click(row('c'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(menu()).toBeInTheDocument();
  });

  it.each(['{Enter}', ' '])('%s selects the focused row, closes, and gives focus back to the trigger', async (key) => {
    const onSelect = jest.fn();
    render(<Switcher onSelect={onSelect} />);
    await openByKey();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(key);
    expect(onSelect).toHaveBeenCalledWith('ringmaster');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(trigger()).toHaveTextContent('ringmaster');
    expect(trigger()).toHaveFocus();
  });

  it('a click on a row, its end slot included, selects it and closes', async () => {
    const onSelect = jest.fn();
    render(<Switcher initial="levain" onSelect={onSelect} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByTestId('ring'));
    expect(onSelect).toHaveBeenCalledWith('portfolio');
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('Escape closes it and gives focus back to the trigger (Popover)', async () => {
    render(<Switcher />);
    await openByKey();
    await userEvent.keyboard('{Escape}');
    expect(menu()).toBeNull();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
  });

  it('Tab or Shift+Tab from any row closes it, focus back on the trigger', async () => {
    render(<Switcher />);
    await openByKey(); // focus on the middle row
    await userEvent.tab();
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();

    await openByKey();
    await userEvent.tab({ shift: true });
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('a press outside closes it (Popover)', async () => {
    render(<Switcher />);
    await userEvent.click(trigger());
    expect(menu()).toBeInTheDocument();
    await userEvent.click(screen.getByText('Elsewhere'));
    expect(menu()).toBeNull();
  });

  it('controlled: open and onOpenChange', async () => {
    const onOpenChange = jest.fn();
    const { rerender } = render(
      <Menu label="Actions" items={PROJECTS} open={false} onOpenChange={onOpenChange}
        trigger={(p) => <button type="button" data-testid="trigger" {...p}>Actions</button>} />
    );
    await openByKey();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(menu()).toBeNull();
    rerender(
      <Menu label="Actions" items={PROJECTS} open onOpenChange={onOpenChange}
        trigger={(p) => <button type="button" data-testid="trigger" {...p}>Actions</button>} />
    );
    expect(menu()).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
