import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextInput from '../TextInput';

describe('TextInput Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-input',
    label: 'Test Label',
    value: '',
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly with label and input', () => {
    render(<TextInput {...defaultProps} />);

    // Check for the label element
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName.toLowerCase()).toBe('label');
    expect(labelElement).toHaveAttribute('for', 'test-input');

    // Check for the input element
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('id', 'test-input');
    expect(inputElement).toHaveAttribute('type', 'text');
    expect(inputElement).toHaveValue('');
  });

  // Test types
  test.each(['text', 'password', 'email', 'number', 'tel', 'url'] as const)(
    'renders with %s type correctly',
    (type) => {
      render(<TextInput {...defaultProps} type={type} />);

      const inputElement = screen.getByLabelText('Test Label');
      expect(inputElement).toHaveAttribute('type', type);
    }
  );

  // Test value binding
  test('displays the provided value', () => {
    render(<TextInput {...defaultProps} value="Test Value" />);

    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toHaveValue('Test Value');
  });

  // Test onChange callback
  test('calls onChange when input value changes', () => {
    const onChange = jest.fn();
    render(<TextInput {...defaultProps} onChange={onChange} />);

    const inputElement = screen.getByLabelText('Test Label');
    fireEvent.change(inputElement, { target: { value: 'New Value' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    // We just check that onChange was called, without inspecting the exact content
    // since the event is a synthetic event and may behave differently in testing environment
  });

  // Test onBlur callback
  test('calls onBlur when input loses focus', () => {
    const onBlur = jest.fn();
    render(<TextInput {...defaultProps} onBlur={onBlur} />);

    const inputElement = screen.getByLabelText('Test Label');
    fireEvent.blur(inputElement);

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  // Test disabled state
  test('renders in disabled state correctly', () => {
    render(<TextInput {...defaultProps} disabled />);

    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toBeDisabled();

    // Label should have disabled styling
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test required state
  test('shows required indicator when required is true', () => {
    render(<TextInput {...defaultProps} required />);

    // The label should contain the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');

    // Input should have required attribute
    const inputElement = screen.getByLabelText(/Test Label/);
    expect(inputElement).toHaveAttribute('required');
  });

  // Test helper text
  // Note: Uses .type-caption which includes muted color semantically
  test('displays helper text when provided', () => {
    const helperText = 'This is a helpful message';
    render(<TextInput {...defaultProps} helperText={helperText} />);

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();
    expect(helperElement).toHaveClass('type-caption');

    // Check for the correct aria description binding
    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-helper`
    );
  });

  // Test external error message
  test('displays external error message when error prop is provided and touched is true', () => {
    const errorMessage = 'This field is required';
    render(<TextInput {...defaultProps} error={errorMessage} touched />);

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('text-[var(--color-error)]');

    // Input should have invalid state
    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toHaveAttribute('aria-invalid', 'true');
    expect(inputElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-error`
    );
  });

  // Test that error is not shown if touched is false
  test('does not display error message when touched is false', () => {
    const errorMessage = 'This field is required';
    render(
      <TextInput {...defaultProps} error={errorMessage} touched={false} />
    );

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test internal validation function
  test('uses validate prop to validate input value', () => {
    const validateMock = jest.fn().mockReturnValue('Invalid input');
    render(
      <TextInput
        {...defaultProps}
        validate={validateMock}
        touched
        value="test"
      />
    );

    // The validation function should be called with the current value
    expect(validateMock).toHaveBeenCalledWith('test');

    // The error message should be displayed
    const errorElement = screen.getByText('Invalid input');
    expect(errorElement).toBeInTheDocument();
  });

  // Test that validation runs on value change
  test('reruns validation when input value changes', () => {
    const validateMock = jest
      .fn()
      .mockReturnValueOnce('Invalid input') // First validation result
      .mockReturnValueOnce(null); // Second validation result

    const { rerender } = render(
      <TextInput
        {...defaultProps}
        validate={validateMock}
        touched
        value="invalid"
      />
    );

    // Initial validation should show error
    expect(screen.getByText('Invalid input')).toBeInTheDocument();

    // Change the value and rerender
    rerender(
      <TextInput
        {...defaultProps}
        validate={validateMock}
        touched
        value="valid"
      />
    );

    // Validation should be called with the new value
    expect(validateMock).toHaveBeenCalledWith('valid');

    // Error should no longer be displayed
    expect(screen.queryByText('Invalid input')).not.toBeInTheDocument();
  });

  // Test custom class names
  test('applies custom class names', () => {
    const { container } = render(
      <TextInput
        {...defaultProps}
        className="custom-container-class"
        inputClassName="custom-input-class"
      />
    );

    // Container should have the custom class
    expect(container.firstChild).toHaveClass('custom-container-class');

    // Input should have the custom class
    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toHaveClass('custom-input-class');
  });

  // Test that helper text is hidden when error is shown
  test('hides helper text when error is shown', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <TextInput
        {...defaultProps}
        helperText={helperText}
        error={errorMessage}
        touched
      />
    );

    // Error should be visible
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Helper text should not be visible
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
  });

  // Test that helper text is still shown when disabled, even with error
  test('shows helper text when disabled, even with error', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <TextInput
        {...defaultProps}
        helperText={helperText}
        error={errorMessage}
        touched
        disabled
      />
    );

    // Error should not be visible
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();

    // Helper text should be visible with caption styling and disabled color override
    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();
    expect(helperElement).toHaveClass('type-caption');
    expect(helperElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test ref forwarding
  test('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<TextInput {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('input');
    expect(ref.current?.id).toBe('test-input');
  });

  test('hideLabel hides the label visually but keeps it as the field\'s name for screen readers', () => {
    render(<TextInput {...defaultProps} hideLabel />);
    expect(screen.getByText('Test Label')).toHaveClass('sr-only');
    expect(screen.getByRole('textbox', { name: 'Test Label' })).toBeInTheDocument();
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T53)
describe('TextInput: form-input convention', () => {
  test('value and change: controlled, the native onChange(event); the field shows only value', () => {
    const onChange = jest.fn();
    render(<TextInput label="Name" value="a" onChange={onChange} />);
    const box = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'ab' } });
    expect(onChange.mock.calls[0][0].target).toBe(box);
    expect(box.value).toBe('a');
  });

  test('uncontrolled: defaultValue, the field keeps what is typed, onChange still fires', () => {
    const onChange = jest.fn();
    render(<TextInput label="Name" defaultValue="hi" onChange={onChange} />);
    const box = screen.getByRole('textbox') as HTMLInputElement;
    expect(box.value).toBe('hi');
    fireEvent.change(box, { target: { value: 'hello' } });
    expect(box.value).toBe('hello');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('uncontrolled: validate reads what is typed', () => {
    render(
      <TextInput
        label="Name"
        validate={(v) => (v.length < 3 ? 'Too short' : null)}
        touched
      />
    );
    const box = screen.getByRole('textbox');
    expect(screen.getByText('Too short')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'long enough' } });
    expect(screen.queryByText('Too short')).not.toBeInTheDocument();
  });

  test('error: shown at once when touched is left out (before, it was hidden until touched)', () => {
    render(<TextInput label="Name" value="" onChange={() => {}} error="Taken" />);
    const box = screen.getByRole('textbox');
    expect(screen.getByText('Taken')).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Taken');
  });

  test('error: touched={false} holds it back', () => {
    render(<TextInput label="Name" error="Taken" touched={false} />);
    expect(screen.queryByText('Taken')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  test("validate: its message waits for the first blur when touched is left out", () => {
    render(<TextInput label="Name" validate={() => 'Required'} />);
    const box = screen.getByRole('textbox');
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    fireEvent.blur(box);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  test('validate: touched={false} holds it back even after blur; the app error wins over it', () => {
    const { rerender } = render(
      <TextInput label="Name" validate={() => 'Required'} touched={false} />
    );
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    rerender(<TextInput label="Name" validate={() => 'Required'} error="Server says no" touched />);
    expect(screen.getByText('Server says no')).toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  test('error: one border colour per state (error, normal, disabled)', () => {
    const { rerender } = render(<TextInput label="N" error="Bad" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveClass('border', 'border-[var(--color-error)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    expect(box).not.toHaveClass('border-[var(--color-border-subtle)]');
    rerender(<TextInput label="N" />);
    expect(box).toHaveClass('border', 'border-[var(--color-border-subtle)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    rerender(<TextInput label="N" disabled error="Bad" />);
    expect(box).toHaveClass('border', 'border-[var(--color-border-emphasis)]');
    expect(box).not.toHaveClass('border-[var(--color-error)]');
    expect(box).not.toHaveClass('text-[var(--color-text-default)]');
  });

  test('size: scale names; compact is the deprecated alias of xs; size wins', () => {
    const { rerender } = render(<TextInput label="N" size="2xs" />);
    expect(screen.getByText('N')).toHaveClass('type-label-compact');
    expect(screen.getByRole('textbox')).toHaveClass('h-6');
    rerender(<TextInput label="N" compact />);
    expect(screen.getByText('N')).toHaveClass('type-label-sm');
    expect(screen.getByRole('textbox')).toHaveClass('h-7');
    rerender(<TextInput label="N" compact size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-12');
  });

  test('ref: the native input', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<TextInput ref={ref} label="N" />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  test('disabled: native disabled; the error waits, the helper shows greyed', () => {
    render(<TextInput label="N" disabled error="Bad" helperText="Help" />);
    const box = screen.getByRole('textbox');
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    expect(screen.getByText('Help')).toHaveClass('text-[var(--color-text-disabled)]');
    expect(screen.getByText('N')).toHaveClass('text-[var(--color-text-disabled)]');
  });

  test('id: optional, generated, and the label still names the field', () => {
    render(<TextInput label="Name" />);
    expect(screen.getByLabelText('Name').id).toBeTruthy();
  });

  test('label: optional; aria-label and other unnamed props reach the input', () => {
    const onKeyDown = jest.fn();
    const onFocus = jest.fn();
    render(
      <TextInput aria-label="Search" name="q" data-x="1" autoComplete="off" onKeyDown={onKeyDown} onFocus={onFocus} />
    );
    const box = screen.getByRole('textbox', { name: 'Search' });
    expect(box).toHaveAttribute('name', 'q');
    expect(box).toHaveAttribute('data-x', '1');
    expect(box).toHaveAttribute('autocomplete', 'off');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.focus(box);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(document.querySelector('label')).toBeNull();
  });

  test("aria-describedby: the app's own id is kept beside the helper", () => {
    render(<TextInput label="N" helperText="Help" aria-describedby="extra" />);
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toMatch(
      /-helper extra$/
    );
  });

  test("className: merged with cn on the root; the app's input class wins a conflict", () => {
    const { container } = render(
      <TextInput label="N" className="mt-4" inputClassName="px-6 h-20" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
    const box = screen.getByRole('textbox');
    expect(box).toHaveClass('px-6', 'h-20');
    expect(box).not.toHaveClass('px-3');
    expect(box).not.toHaveClass('h-10');
  });

  test('keyboard and focus: a text field shows focus however it came (focus:, ring-1)', () => {
    expect(render(<TextInput label="N" />).getByRole('textbox')).toHaveClass(
      'focus:ring-1',
      'focus:border-[var(--color-primary)]'
    );
  });

  test('number: the spinner steps the value and calls onChange', () => {
    const onChange = jest.fn();
    render(<TextInput label="Count" type="number" defaultValue="4" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
