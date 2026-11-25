import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RadioButton from '../RadioButton';

describe('RadioButton Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-radio',
    name: 'test-radio-group',
    value: 'test-value',
    checked: false,
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly', () => {
    render(<RadioButton {...defaultProps} />);

    // Check that the input exists and is a radio button
    const radioInput = screen.getByRole('radio');
    expect(radioInput).toBeInTheDocument();
    expect(radioInput).toHaveAttribute('type', 'radio');
    expect(radioInput).toHaveAttribute('id', 'test-radio');
    expect(radioInput).toHaveAttribute('name', 'test-radio-group');
    expect(radioInput).toHaveAttribute('value', 'test-value');
  });

  // Test label rendering with string
  test('renders with string label when provided', () => {
    const label = 'Test Radio Label';
    render(<RadioButton {...defaultProps} label={label} />);

    const labelElement = screen.getByText(label);
    expect(labelElement).toBeInTheDocument();
  });

  // Test label rendering with ReactNode
  test('renders with ReactNode label when provided', () => {
    render(
      <RadioButton
        {...defaultProps}
        label={
          <div data-testid="complex-label">
            Complex <strong>Label</strong>
          </div>
        }
      />
    );

    const labelElement = screen.getByTestId('complex-label');
    expect(labelElement).toBeInTheDocument();
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  // Test no label rendering
  test('renders without label when not provided', () => {
    render(<RadioButton {...defaultProps} />);

    // Should not contain any visible text
    expect(screen.queryByText(/./i)).not.toBeInTheDocument();
  });

  // Test checked state
  test('reflects checked state correctly', () => {
    const { rerender } = render(
      <RadioButton {...defaultProps} checked={false} />
    );

    // Check the initial unchecked state
    const radioInput = screen.getByRole('radio');
    expect(radioInput).not.toBeChecked();

    // Rerender with checked=true
    rerender(<RadioButton {...defaultProps} checked={true} />);
    expect(radioInput).toBeChecked();

    // The ring and dot follow the input's :checked (peer-checked), so they come after it
    expect(radioInput).toHaveClass('peer');
  });

  // Test onChange callback
  test('calls onChange with value when clicked', () => {
    const onChange = jest.fn();
    render(<RadioButton {...defaultProps} onChange={onChange} />);

    const radioInput = screen.getByRole('radio');
    fireEvent.click(radioInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('test-value');
  });

  // Test disabled state
  test('disables the radio button when disabled prop is true', () => {
    render(<RadioButton {...defaultProps} disabled={true} />);

    const radioInput = screen.getByRole('radio');
    expect(radioInput).toBeDisabled();

    // The label should have disabled styling
    const label = radioInput.closest('label');
    expect(label).toHaveClass('cursor-not-allowed');
    expect(label).toHaveClass('opacity-50');
  });

  // Test different sizes
  test.each(['sm', 'md', 'lg'] as const)(
    'renders in %s size correctly',
    (size) => {
      const { container } = render(
        <RadioButton {...defaultProps} size={size} />
      );

      // Different sizes should have different classes
      const radioContainer = container.querySelector(
        'div[class*="rounded-full"]'
      );

      if (size === 'sm') {
        expect(radioContainer).toHaveClass('w-3.5');
        expect(radioContainer).toHaveClass('h-3.5');
      } else if (size === 'md') {
        expect(radioContainer).toHaveClass('w-5');
        expect(radioContainer).toHaveClass('h-5');
      } else if (size === 'lg') {
        expect(radioContainer).toHaveClass('w-6');
        expect(radioContainer).toHaveClass('h-6');
      }
    }
  );

  // Test default size
  test('uses medium size by default', () => {
    const { container } = render(<RadioButton {...defaultProps} />);

    const radioContainer = container.querySelector(
      'div[class*="rounded-full"]'
    );
    expect(radioContainer).toHaveClass('w-5');
    expect(radioContainer).toHaveClass('h-5');
  });

  // Checked styling is drawn from the input's :checked (T53), so it is the same markup checked or not
  test('draws the checked ring and dot from :checked (peer-checked)', () => {
    const { container } = render(
      <RadioButton {...defaultProps} checked={true} />
    );

    const radioContainer = container.querySelector(
      'div[class*="rounded-full"]'
    );
    expect(radioContainer).toHaveClass(
      'border-[var(--color-border-default)]',
      'bg-[var(--color-surface-card)]',
      'peer-checked:border-[var(--color-accent)]',
      'peer-checked:bg-[var(--color-accent)]/10'
    );

    const dot = radioContainer?.nextElementSibling;
    expect(dot).toHaveClass('hidden', 'peer-checked:block', 'bg-[var(--color-accent)]');
  });

  // Test accessibility features
  test('has proper accessibility attributes', () => {
    render(<RadioButton {...defaultProps} label="Accessible Radio" />);

    const radioInput = screen.getByRole('radio');
    expect(radioInput).toHaveAttribute('id', 'test-radio');

    // Label should be connected to input via htmlFor
    const label = screen.getByText('Accessible Radio').closest('label');
    expect(label).toHaveAttribute('for', 'test-radio');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T53)
describe('RadioButton: form-input convention', () => {
  const Group = (p: { onChange?: (v: string) => void; defaultValue?: string; disabledValue?: string }) => (
    <div>
      {['a', 'b', 'c'].map((v) => (
        <RadioButton
          key={v}
          name="g"
          value={v}
          label={v.toUpperCase()}
          defaultChecked={p.defaultValue === v}
          disabled={p.disabledValue === v}
          onChange={p.onChange}
        />
      ))}
    </div>
  );

  test('value and change: controlled, onChange(value) value first; shows only `checked`', () => {
    const onChange = jest.fn();
    render(<RadioButton name="g" value="a" label="A" checked={false} onChange={onChange} />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith('a');
    expect(radio).not.toBeChecked();
  });

  test("uncontrolled: defaultChecked; choosing a sibling clears this one's :checked, so its dot (peer-checked) goes", () => {
    const onChange = jest.fn();
    render(<Group defaultValue="a" onChange={onChange} />);
    const [a, b] = screen.getAllByRole('radio');
    expect(a).toBeChecked();
    fireEvent.click(b);
    expect(onChange).toHaveBeenCalledWith('b');
    expect(b).toBeChecked();
    // the dot and ring are drawn only from :checked, and a no longer matches it
    expect(a).not.toBeChecked();
    expect(a.matches(':checked')).toBe(false);
    expect(a.nextElementSibling?.nextElementSibling).toHaveClass('hidden', 'peer-checked:block');
  });

  test('ref: the native input (A4: it was not forwarded)', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<RadioButton ref={ref} name="g" value="a" label="A" />);
    expect(ref.current).toBe(screen.getByRole('radio'));
  });

  test('disabled: native disabled, no callback, dimmed', () => {
    const onChange = jest.fn();
    render(<Group disabledValue="b" onChange={onChange} />);
    const b = screen.getByRole('radio', { name: 'B' });
    expect(b).toBeDisabled();
    fireEvent.click(b);
    expect(onChange).not.toHaveBeenCalled();
    expect(b.closest('label')).toHaveClass('cursor-not-allowed', 'opacity-50');
  });

  test('id: optional, generated, and the label still names the radio', () => {
    render(<RadioButton name="g" value="a" label="Weekly" />);
    expect(screen.getByLabelText('Weekly').id).toBeTruthy();
  });

  test('label: optional; aria-label and other unnamed props reach the input', () => {
    const onFocus = jest.fn();
    render(<RadioButton name="g" value="a" aria-label="Weekly" data-x="1" required onFocus={onFocus} />);
    const radio = screen.getByRole('radio', { name: 'Weekly' });
    expect(radio).toHaveAttribute('data-x', '1');
    expect(radio).toBeRequired();
    fireEvent.focus(radio);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  test("className: on the root, merged with cn (A4: it had none); the app's class wins", () => {
    const { container } = render(<RadioButton name="g" value="a" label="A" className="mt-4 flex" />);
    expect(container.firstChild).toHaveClass('mt-4', 'flex');
    expect(container.firstChild).not.toHaveClass('inline-flex');
  });

  test('size: the label keeps the scale type (sm: type-label-sm, per Q-labelsize; md, lg: type-label)', () => {
    const { rerender } = render(<RadioButton name="g" value="a" label="A" size="sm" />);
    expect(screen.getByText('A')).toHaveClass('type-label-sm');
    expect(screen.getByText('A')).not.toHaveClass('type-label');
    rerender(<RadioButton name="g" value="a" label="A" size="lg" />);
    expect(screen.getByText('A')).toHaveClass('type-label');
  });

  test('keyboard and focus (A3): a keyboard ring in --color-border-focus with offset', () => {
    render(<RadioButton name="g" value="a" label="A" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveClass('peer');
    expect(radio.nextElementSibling).toHaveClass(
      'peer-focus-visible:ring-2',
      'peer-focus-visible:ring-[var(--color-border-focus)]',
      'peer-focus-visible:ring-offset-2',
      'peer-focus-visible:ring-offset-[var(--color-surface-canvas)]'
    );
  });

  test('keyboard: radios sharing a name are one native group (arrow keys are the browser\'s; checked in the PC capture)', () => {
    render(<Group defaultValue="b" />);
    screen.getAllByRole('radio').forEach((r) => expect(r).toHaveAttribute('name', 'g'));
  });
});
