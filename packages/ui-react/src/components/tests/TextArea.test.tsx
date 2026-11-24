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

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T35)
describe('TextArea: form-input convention', () => {
  test('value and change: controlled, the native onChange(event)', () => {
    const onChange = jest.fn();
    render(<TextArea label="Notes" value="a" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ab' } });
    expect(onChange.mock.calls[0][0].target).toBe(screen.getByRole('textbox'));
  });

  test('uncontrolled: defaultValue, the field keeps what is typed', () => {
    render(<TextArea label="Notes" defaultValue="hi" />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.value).toBe('hi');
    fireEvent.change(box, { target: { value: 'hello' } });
    expect(box.value).toBe('hello');
  });

  test('error: shown when touched is left out (the board passes no touched)', () => {
    render(
      <TextArea label="Notes" value="" onChange={() => {}} error="Too long" />
    );
    expect(screen.getByText('Too long')).toBeInTheDocument();
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('-error')
    );
    expect(box).toHaveAccessibleDescription('Too long');
  });

  test('error: one border colour per state (error, normal, disabled)', () => {
    const { rerender } = render(<TextArea label="N" error="Bad" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveClass('border-[var(--color-error)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    rerender(<TextArea label="N" />);
    expect(box).toHaveClass('border-[var(--color-border-subtle)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    rerender(<TextArea label="N" disabled />);
    expect(box).toHaveClass('border-[var(--color-border-emphasis)]');
  });

  test('size: xs draws the compact type; compact is its deprecated alias; size wins', () => {
    const { rerender } = render(<TextArea label="N" size="xs" />);
    expect(screen.getByText('N')).toHaveClass('type-label-sm');
    expect(screen.getByRole('textbox')).toHaveClass('px-2', 'py-1.5');
    rerender(<TextArea label="N" compact size="md" />);
    expect(screen.getByText('N')).toHaveClass('type-label');
    expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-2');
  });

  test('ref: the native textarea', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<TextArea ref={ref} label="N" />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  test('disabled: native disabled; the error waits, not invalid', () => {
    render(<TextArea label="N" disabled error="Bad" helperText="Help" />);
    const box = screen.getByRole('textbox');
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  test('id: optional, generated, and the label still names the field', () => {
    render(<TextArea label="Notes" />);
    expect(screen.getByLabelText('Notes').id).toBeTruthy();
  });

  test('label: optional; aria-label and other unnamed props reach the textarea', () => {
    const onKeyDown = jest.fn();
    render(
      <TextArea
        aria-label="Comment"
        name="c"
        data-x="1"
        onKeyDown={onKeyDown}
      />
    );
    const box = screen.getByRole('textbox', { name: 'Comment' });
    expect(box).toHaveAttribute('name', 'c');
    expect(box).toHaveAttribute('data-x', '1');
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(document.querySelector('label')).toBeNull();
  });

  test("aria-describedby: the app's own id is kept beside the helper", () => {
    render(<TextArea label="N" helperText="Help" aria-describedby="extra" />);
    expect(
      screen.getByRole('textbox').getAttribute('aria-describedby')
    ).toMatch(/-helper extra$/);
  });

  test("className: merged on the root; the app's textarea class wins a conflict", () => {
    const { container } = render(
      <TextArea label="N" className="mt-4" textareaClassName="px-6" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
    const box = screen.getByRole('textbox');
    expect(box).toHaveClass('px-6');
    expect(box).not.toHaveClass('px-3');
  });

  test('focus: a text field shows focus however it came (focus:, ring-1)', () => {
    expect(render(<TextArea label="N" />).getByRole('textbox')).toHaveClass(
      'focus:ring-1',
      'focus:border-[var(--color-primary)]'
    );
  });
});
