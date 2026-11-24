import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Checkbox from '../Checkbox';

// the shared lucide mock has no Minus
jest.mock('lucide-react', () => ({
  Check: () => <svg data-testid="icon-check" />,
  Minus: () => <svg data-testid="icon-minus" />,
}));

describe('Checkbox Component', () => {
  test('renders a native checkbox named by its label', () => {
    render(<Checkbox id="c" label="Email me" checked={false} onChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'Email me' });
    expect(box).toHaveAttribute('type', 'checkbox');
    expect(box).toHaveAttribute('id', 'c');
    expect(box).not.toBeChecked();
  });

  test('a ReactNode label', () => {
    render(<Checkbox label={<b>Bold</b>} />);
    expect(screen.getByRole('checkbox', { name: 'Bold' })).toBeInTheDocument();
  });

  test('checked draws the tick; indeterminate draws the dash and sets the DOM property', () => {
    const { rerender } = render(<Checkbox label="A" checked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.queryByTestId('icon-check')).toBeInTheDocument();
    rerender(<Checkbox label="A" checked="indeterminate" />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box).not.toBeChecked();
    expect(screen.queryByTestId('icon-minus')).toBeInTheDocument();
    rerender(<Checkbox label="A" checked={false} />);
    expect(box.indeterminate).toBe(false);
  });

  test('sizes: box and label type per size', () => {
    const { rerender } = render(<Checkbox label="A" size="sm" />);
    const box = () => screen.getByRole('checkbox').nextElementSibling;
    expect(box()).toHaveClass('w-3.5', 'h-3.5');
    expect(screen.getByText('A')).toHaveClass('type-label-sm');
    rerender(<Checkbox label="A" />);
    expect(box()).toHaveClass('w-5', 'h-5');
    expect(screen.getByText('A')).toHaveClass('type-label');
    rerender(<Checkbox label="A" size="lg" />);
    expect(box()).toHaveClass('w-6', 'h-6');
    // the scale's label type for lg (Q-labelsize): type-label, not type-body
    expect(screen.getByText('A')).toHaveClass('type-label');
    expect(screen.getByText('A')).not.toHaveClass('type-body');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T53)
describe('Checkbox: form-input convention', () => {
  test('value and change: controlled, onChange(checked) value first; shows only `checked`', () => {
    const onChange = jest.fn();
    render(<Checkbox label="A" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(box).not.toBeChecked();
  });

  test('controlled: a parent that keeps the state toggles it both ways', () => {
    function Parent() {
      const [on, setOn] = useState(false);
      return <Checkbox label="A" checked={on} onChange={setOn} />;
    }
    render(<Parent />);
    const box = screen.getByRole('checkbox');
    fireEvent.click(box);
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
  });

  test('controlled indeterminate: a click asks for true', () => {
    const onChange = jest.fn();
    render(<Checkbox label="A" checked="indeterminate" onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('uncontrolled: defaultChecked, keeps its own state, onChange still fires', () => {
    const onChange = jest.fn();
    render(<Checkbox label="A" defaultChecked onChange={onChange} />);
    const box = screen.getByRole('checkbox');
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test('uncontrolled: defaultChecked="indeterminate" becomes a boolean on click', () => {
    render(<Checkbox label="A" defaultChecked="indeterminate" />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    fireEvent.click(box);
    expect(box.indeterminate).toBe(false);
    expect(box).toBeChecked();
  });

  test('ref: the native input (A4: it was not forwarded); indeterminate still set', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="A" checked="indeterminate" />);
    expect(ref.current).toBe(screen.getByRole('checkbox'));
    expect(ref.current?.indeterminate).toBe(true);
  });

  test('disabled: native disabled, no callback, dimmed', () => {
    const onChange = jest.fn();
    const { container } = render(<Checkbox label="A" disabled onChange={onChange} />);
    const box = screen.getByRole('checkbox');
    expect(box).toBeDisabled();
    fireEvent.click(box);
    expect(onChange).not.toHaveBeenCalled();
    expect(container.firstChild).toHaveClass('cursor-not-allowed', 'opacity-50');
  });

  test('id: optional, generated, and the label still names the box', () => {
    render(<Checkbox label="Email me" />);
    expect(screen.getByLabelText('Email me').id).toBeTruthy();
  });

  test('label: optional; aria-label, outside <label htmlFor> and other unnamed props reach the input', () => {
    const onBlur = jest.fn();
    render(
      <>
        <Checkbox aria-label="Select row" name="row" data-x="1" value="r1" onBlur={onBlur} />
        <label htmlFor="outside">Outside</label>
        <Checkbox id="outside" />
      </>
    );
    const box = screen.getByRole('checkbox', { name: 'Select row' });
    expect(box).toHaveAttribute('name', 'row');
    expect(box).toHaveAttribute('data-x', '1');
    expect(box).toHaveAttribute('value', 'r1');
    fireEvent.blur(box);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: 'Outside' })).toBeInTheDocument();
  });

  test("className: merged with cn on the root; the app's class wins a conflict", () => {
    const { container } = render(<Checkbox label="A" className="mt-4 flex" />);
    expect(container.firstChild).toHaveClass('mt-4', 'flex');
    expect(container.firstChild).not.toHaveClass('inline-flex');
  });

  test('keyboard and focus: a native checkbox (Space); keyboard ring in --color-border-focus with offset', () => {
    render(<Checkbox label="A" />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveClass('peer');
    expect(box.nextElementSibling).toHaveClass(
      'peer-focus-visible:ring-2',
      'peer-focus-visible:ring-[var(--color-border-focus)]',
      'peer-focus-visible:ring-offset-2',
      'peer-focus-visible:ring-offset-[var(--color-surface-canvas)]'
    );
    expect(box.nextElementSibling).not.toHaveClass('peer-focus-visible:ring-[var(--color-primary)]');
  });
});
