import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextArea from '../TextArea';

describe('TextArea Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-textarea',
    label: 'Test Label',
    value: '',
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly with label and textarea', () => {
    render(<TextArea {...defaultProps} />);

    // Check for the label element
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName.toLowerCase()).toBe('label');
    expect(labelElement).toHaveAttribute('for', 'test-textarea');

    // Check for the textarea element
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toBeInTheDocument();
    expect(textareaElement).toHaveAttribute('id', 'test-textarea');
    expect(textareaElement.tagName.toLowerCase()).toBe('textarea');
  });

  // Test rows property
  test('applies the rows attribute correctly', () => {
    render(<TextArea {...defaultProps} rows={6} />);

    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('rows', '6');
  });

  // Test default rows value
  test('uses default rows value when not provided', () => {
    render(<TextArea {...defaultProps} />);

    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('rows', '4'); // Default is 4
  });

  // Test value binding
  test('displays the provided value', () => {
    const value = 'Test value with multiple\nlines of text';
    render(<TextArea {...defaultProps} value={value} />);

    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveValue(value);
  });

  // Test onChange callback
  test('calls onChange when textarea value changes', () => {
    const onChange = jest.fn();
    render(<TextArea {...defaultProps} onChange={onChange} />);

    const textareaElement = screen.getByRole('textbox');
    fireEvent.change(textareaElement, { target: { value: 'New text' } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // Test disabled state
  test('renders in disabled state correctly', () => {
    render(<TextArea {...defaultProps} disabled />);

    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toBeDisabled();

    // Label should have disabled styling
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test required state
  test('shows required indicator when required is true', () => {
    render(<TextArea {...defaultProps} required />);

    // The label should contain the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');

    // Textarea should have required attribute
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('required');
  });

  // Test helper text
  // Note: Uses .type-caption which includes muted color semantically
  test('displays helper text when provided', () => {
    const helperText = 'This is a helpful message';
    render(<TextArea {...defaultProps} helperText={helperText} />);

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();
    expect(helperElement).toHaveClass('type-caption');

    // Check for the correct aria description binding
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-helper`
    );
  });

  // Test error message
  test('displays error message when error prop is provided and touched is true', () => {
    const errorMessage = 'This field is required';
    render(<TextArea {...defaultProps} error={errorMessage} touched={true} />);

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('text-[var(--color-error)]');

    // Textarea should have invalid state
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('aria-invalid', 'true');
    expect(textareaElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-error`
    );
  });

  // Test that error is not shown if touched is false
  test('does not display error message when touched is false', () => {
    const errorMessage = 'This field is required';
    render(<TextArea {...defaultProps} error={errorMessage} touched={false} />);

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test that error message has appropriate classes for styling
  // Note: Uses .type-body-sm for error messages with color override
  test('error message has the correct styling', () => {
    const errorMessage = 'This field is required';
    render(<TextArea {...defaultProps} error={errorMessage} touched={true} />);

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toHaveClass('mt-1');
    expect(errorElement).toHaveClass('type-body-sm');
    expect(errorElement).toHaveClass('text-[var(--color-error)]');
  });

  // Test that helper text is hidden when error is shown
  test('hides helper text when error is shown', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <TextArea
        {...defaultProps}
        helperText={helperText}
        error={errorMessage}
        touched={true}
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
      <TextArea
        {...defaultProps}
        helperText={helperText}
        error={errorMessage}
        touched={true}
        disabled
      />
    );

    // Error should not be visible
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();

    // Helper text should be visible
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  // Test custom class names
  test('applies custom class names', () => {
    const { container } = render(
      <TextArea
        {...defaultProps}
        className="custom-container-class"
        textareaClassName="custom-textarea-class"
      />
    );

    // Container should have the custom class
    expect(container.firstChild).toHaveClass('custom-container-class');

    // Textarea should have the custom class
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveClass('custom-textarea-class');
  });

  // Test ref forwarding
  test('forwards ref to textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<TextArea {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('textarea');
    expect(ref.current?.id).toBe('test-textarea');
  });

  // Test compact mode
  describe('compact mode', () => {
    test('applies compact typography to label', () => {
      render(<TextArea {...defaultProps} compact />);

      const labelElement = screen.getByText('Test Label');
      expect(labelElement).toHaveClass('type-label-sm');
    });

    test('applies compact typography and padding to textarea', () => {
      render(<TextArea {...defaultProps} compact />);

      const textareaElement = screen.getByRole('textbox');
      expect(textareaElement).toHaveClass('type-body-sm');
      expect(textareaElement).toHaveClass('px-2');
      expect(textareaElement).toHaveClass('py-1.5');
    });

    test('applies compact typography to error message', () => {
      render(
        <TextArea {...defaultProps} error="Error message" touched compact />
      );

      const errorElement = screen.getByText('Error message');
      expect(errorElement).toHaveClass('type-caption');
    });

    test('applies compact typography to helper text', () => {
      render(<TextArea {...defaultProps} helperText="Helper text" compact />);

      const helperElement = screen.getByText('Helper text');
      expect(helperElement).toHaveClass('type-caption-compact');
    });

    test('applies default typography when compact is false', () => {
      render(<TextArea {...defaultProps} compact={false} />);

      const labelElement = screen.getByText('Test Label');
      expect(labelElement).toHaveClass('type-label');
      expect(labelElement).not.toHaveClass('type-label-sm');

      const textareaElement = screen.getByRole('textbox');
      expect(textareaElement).toHaveClass('px-3');
      expect(textareaElement).toHaveClass('py-2');
    });
  });
});
