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
