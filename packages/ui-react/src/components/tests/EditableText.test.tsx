import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableText } from '../EditableText';

const root = () => screen.getByText('Sage', { selector: '.inline-block' }).closest('[id]') as HTMLElement;
const icon = () => document.querySelector('button[aria-label="Edit"]') as HTMLElement;

describe('EditableText', () => {
  test('shows the value, or the placeholder when empty', () => {
    const { rerender } = render(<EditableText value="Sage" />);
    expect(screen.getByText('Sage')).toBeInTheDocument();
    rerender(<EditableText value="" placeholder="Name it" />);
    expect(screen.getByText('Name it')).toBeInTheDocument();
  });

  test('double-click starts editing; Enter saves with onSave and onChange', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onChange = jest.fn();
    render(<EditableText value="Sage" onSave={onSave} onChange={onChange} />);
    await user.dblClick(screen.getByText('Sage'));
    const box = screen.getByRole('textbox');
    expect(box).toHaveValue('Sage');
    await user.clear(box);
    await user.type(box, 'Moss{Enter}');
    expect(onSave).toHaveBeenCalledWith('Moss');
    expect(onChange).toHaveBeenCalledWith('Moss');
    expect(onChange).toHaveBeenCalledTimes(1); // at the commit, not per keystroke
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  test('the Save and Cancel buttons; Cancel keeps the old value', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Sage" showEditIcon onSave={onSave} />);
    await user.click(icon());
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Sage')).toBeInTheDocument();
    await user.click(icon());
    expect(screen.getByRole('textbox')).toHaveValue('Sage'); // the draft starts again from the value
    await user.type(screen.getByRole('textbox'), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('Sage!');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 fix (T55)
describe('EditableText: form-input convention', () => {
  test('value and change: controlled; it shows only value after a save', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<EditableText value="Sage" onChange={onChange} />);
    await user.dblClick(screen.getByText('Sage'));
    await user.type(screen.getByRole('textbox'), '2{Enter}');
    expect(onChange).toHaveBeenCalledWith('Sage2');
    expect(screen.getByText('Sage')).toBeInTheDocument();
  });

  test('uncontrolled: defaultValue, it keeps the saved text', async () => {
    const user = userEvent.setup();
    render(<EditableText defaultValue="Sage" />);
    await user.dblClick(screen.getByText('Sage'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Moss{Enter}');
    expect(screen.getByText('Moss', { selector: '.inline-block' })).toBeInTheDocument();
  });

  test('a new value from outside is shown, and the next edit starts from it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<EditableText value="Sage" />);
    rerender(<EditableText value="Cobalt" />);
    await user.dblClick(screen.getByText('Cobalt'));
    expect(screen.getByRole('textbox')).toHaveValue('Cobalt');
  });

  test('ref and id: on the focusable root; the field gets id-input', async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLDivElement>();
    render(<EditableText ref={ref} id="title" value="Sage" />);
    expect(ref.current).toBe(root());
    expect(ref.current).toHaveAttribute('id', 'title');
    expect(ref.current).toHaveAttribute('tabindex', '0');
    await user.dblClick(screen.getByText('Sage'));
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'title-input');
  });

  test('id: optional, generated', () => {
    render(<EditableText value="Sage" />);
    expect(root().id).toBeTruthy();
  });

  test('disabled: no Tab stop, no edit by double-click, Enter or the icon', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" disabled showEditIcon />);
    const el = screen.getByRole('button', { name: 'Sage, edit' });
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(icon()).toBeNull();
    await user.dblClick(screen.getByText('Sage'));
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  test('unnamed props reach the root; aria-label names the field, not the root', async () => {
    const user = userEvent.setup();
    const onKeyDown = jest.fn();
    render(<EditableText value="Sage" aria-label="Theme name" data-x="1" onKeyDown={onKeyDown} />);
    expect(screen.getByRole('button', { name: 'Sage, edit' })).toBe(root()); // not 'Theme name'
    expect(root()).toHaveAttribute('data-x', '1');
    root().focus();
    await user.keyboard('{Enter}');
    expect(onKeyDown).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Theme name' })).toBeInTheDocument();
  });

  test("the field's name falls back to 'Edit text'", async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" />);
    await user.dblClick(screen.getByText('Sage'));
    expect(screen.getByRole('textbox', { name: 'Edit text' })).toBeInTheDocument();
  });

  test("className: merged with cn on the root; the app's class wins", () => {
    render(<EditableText value="Sage" className="flex" />);
    expect(root()).toHaveClass('flex');
    expect(root()).not.toHaveClass('inline-flex');
  });

  test('focus: the root shows a keyboard ring (focus-visible, --color-border-focus)', () => {
    render(<EditableText value="Sage" />);
    expect(root()).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-[var(--color-border-focus)]', 'focus-visible:ring-offset-2');
  });

  // A3: editing started by double-click only (EditableText.tsx:183)
  test('A3: Tab reaches it; Enter starts editing; Enter saves and focus returns to the root', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Sage" onSave={onSave} />);
    await user.tab();
    expect(root()).toHaveFocus();
    await user.keyboard('{Enter}');
    const box = screen.getByRole('textbox');
    expect(box).toHaveFocus();
    await user.type(box, '!{Enter}');
    expect(onSave).toHaveBeenCalledWith('Sage!');
    expect(root()).toHaveFocus();
  });

  test('A3: F2 starts editing; Escape cancels and focus returns to the root', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" />);
    root().focus();
    await user.keyboard('{F2}');
    await user.type(screen.getByRole('textbox'), 'x{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Sage')).toBeInTheDocument();
    expect(root()).toHaveFocus();
  });

  test('the edit icon: a mouse target only (no Tab stop, hidden from the tree); a click starts editing', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" showEditIcon />);
    expect(icon()).toHaveAttribute('tabindex', '-1');
    expect(icon()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('button')).toEqual([root()]);
    await user.tab();
    expect(root()).toHaveFocus();
    await user.tab();
    expect(icon()).not.toHaveFocus();
    await user.click(icon());
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  test('role: a button named by its text and ", edit" at rest; no role while editing', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" />);
    const el = screen.getByRole('button', { name: 'Sage, edit' });
    expect(el).toBe(root());
    await user.dblClick(screen.getByText('Sage'));
    expect(el).not.toHaveAttribute('role');
    expect(el).not.toHaveAttribute('aria-label');
    expect(screen.queryByRole('button', { name: /edit/ })).toBeNull();
  });

  test('Space starts editing; a click with no mouse (a screen reader, detail 0) starts editing; one mouse click does not', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Sage" />);
    await user.click(root());
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(root(), { detail: 0 });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    root().focus();
    await user.keyboard(' ');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  test('blur neither saves nor cancels: the draft stays open', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <>
        <EditableText value="Sage" onSave={onSave} />
        <button>elsewhere</button>
      </>
    );
    await user.dblClick(screen.getByText('Sage'));
    await user.type(screen.getByRole('textbox'), '!');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Sage!');
  });

  test('an Enter that ends an IME composition does not save', () => {
    const onSave = jest.fn();
    render(<EditableText value="Sage" onSave={onSave} />);
    fireEvent.doubleClick(screen.getByText('Sage'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', isComposing: true });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', keyCode: 229 });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
