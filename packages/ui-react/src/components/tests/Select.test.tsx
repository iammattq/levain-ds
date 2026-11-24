import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Select from '../Select';

describe('Select Component', () => {
  // Define common props for testing
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps = {
    id: 'test-select',
    label: 'Test Label',
    options: defaultOptions,
    value: '',
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly with label and select', () => {
    render(<Select {...defaultProps} />);

    // Check for the label element
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName.toLowerCase()).toBe('label');
    expect(labelElement).toHaveAttribute('for', 'test-select');

    // Check for the select element
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toBeInTheDocument();
    expect(selectElement).toHaveAttribute('id', 'test-select');
  });

  // Test options rendering
  test('renders all provided options', () => {
    render(<Select {...defaultProps} />);

    // Check that all options are rendered
    defaultOptions.forEach((option) => {
      const optionElement = screen.getByText(option.label);
      expect(optionElement).toBeInTheDocument();
      expect(optionElement.tagName.toLowerCase()).toBe('option');
      expect(optionElement).toHaveAttribute('value', option.value);
    });
  });

  // Test placeholder
  test('renders placeholder option when provided', () => {
    const placeholder = 'Select an option';
    render(<Select {...defaultProps} placeholder={placeholder} />);

    const placeholderOption = screen.getByText(placeholder);
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption.tagName.toLowerCase()).toBe('option');
    expect(placeholderOption).toHaveAttribute('value', '');
  });

  // Test value binding
  test('sets the selected value correctly', () => {
    render(<Select {...defaultProps} value="option2" />);

    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveValue('option2');

    // The selected option should correspond to the value
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const selectedOption = options.find((option) => option.selected);
    expect(selectedOption).toHaveTextContent('Option 2');
  });

  // Test onChange callback
  test('calls onChange when selection changes', () => {
    const onChange = jest.fn();
    render(<Select {...defaultProps} onChange={onChange} />);

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'option3' } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // Test disabled state
  test('renders in disabled state correctly', () => {
    render(<Select {...defaultProps} disabled />);

    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toBeDisabled();

    // Label should have disabled styling
    const labelElement = screen.getByText('Test Label');
    expect(labelElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test required state
  test('shows required indicator when required is true', () => {
    render(<Select {...defaultProps} required />);

    // The label should contain the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');

    // Select should have required attribute
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveAttribute('required');
  });

  // Test disabled option
  test('renders disabled option correctly', () => {
    const optionsWithDisabled = [
      ...defaultOptions,
      { value: 'disabled-option', label: 'Disabled Option', disabled: true },
    ];

    render(<Select {...defaultProps} options={optionsWithDisabled} />);

    const disabledOption = screen.getByText('Disabled Option');
    expect(disabledOption).toBeInTheDocument();
    expect(disabledOption).toHaveAttribute('disabled');
  });

  // Test option with description
  test('adds title attribute for options with descriptions', () => {
    const optionsWithDescription = [
      ...defaultOptions,
      {
        value: 'option-with-description',
        label: 'Option with Description',
        description: 'This is a helpful description',
      },
    ];

    render(<Select {...defaultProps} options={optionsWithDescription} />);

    const optionWithDescription = screen.getByText('Option with Description');
    expect(optionWithDescription).toBeInTheDocument();
    expect(optionWithDescription).toHaveAttribute(
      'title',
      'This is a helpful description'
    );
  });

  // Test helper text
  // Note: Uses .type-caption which includes muted color semantically
  test('displays helper text when provided', () => {
    const helperText = 'This is a helpful message';
    render(<Select {...defaultProps} helperText={helperText} />);

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();
    expect(helperElement).toHaveClass('type-caption');

    // Check for the correct aria description binding
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-helper`
    );
  });

  // Test error message
  test('displays error message when error prop is provided and touched is true', () => {
    const errorMessage = 'This field is required';
    render(<Select {...defaultProps} error={errorMessage} touched={true} />);

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('text-[var(--color-error)]');

    // Select should have invalid state
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveAttribute('aria-invalid', 'true');
    expect(selectElement).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-error`
    );
  });

  // Test that error is not shown if touched is false
  test('does not display error message when touched is false', () => {
    const errorMessage = 'This field is required';
    render(<Select {...defaultProps} error={errorMessage} touched={false} />);

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test that helper text is hidden when error is shown
  test('hides helper text when error is shown', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <Select
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
      <Select
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
      <Select
        {...defaultProps}
        className="custom-container-class"
        selectClassName="custom-select-class"
      />
    );

    // Container should have the custom class
    expect(container.firstChild).toHaveClass('custom-container-class');

    // Select should have the custom class
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveClass('custom-select-class');
  });

  // Test dropdown arrow rendering
  test('renders custom dropdown arrow', () => {
    const { container } = render(<Select {...defaultProps} />);

    // Should have the arrow container div
    const arrowContainer = container.querySelector(
      '.pointer-events-none.absolute.inset-y-0.right-0'
    );
    expect(arrowContainer).toBeInTheDocument();

    // Should contain an SVG element for the arrow
    const arrowSvg = arrowContainer?.querySelector('svg');
    expect(arrowSvg).toBeInTheDocument();
  });

  // Test ref forwarding
  test('forwards ref to select element', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('select');
    expect(ref.current?.id).toBe('test-select');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T53)
describe('Select: form-input convention', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma', disabled: true },
  ];

  test('value and change: controlled, the native onChange(event); the field shows only value', () => {
    const onChange = jest.fn();
    render(<Select label="Plan" options={options} value="a" onChange={onChange} />);
    const box = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(box, { target: { value: 'b' } });
    expect(onChange.mock.calls[0][0].target).toBe(box);
    expect(box.value).toBe('a');
  });

  test('uncontrolled: defaultValue, the select keeps the choice, onChange still fires', () => {
    const onChange = jest.fn();
    render(<Select label="Plan" options={options} defaultValue="b" onChange={onChange} />);
    const box = screen.getByRole('combobox') as HTMLSelectElement;
    expect(box.value).toBe('b');
    fireEvent.change(box, { target: { value: 'a' } });
    expect(box.value).toBe('a');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('error: shown when touched is left out; touched={false} holds it back', () => {
    const { rerender } = render(<Select label="Plan" options={options} error="Choose one" />);
    const box = screen.getByRole('combobox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Choose one');
    rerender(<Select label="Plan" options={options} error="Choose one" touched={false} />);
    expect(screen.queryByText('Choose one')).not.toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'false');
  });

  test('error: one border colour per state (error, normal, disabled)', () => {
    const { rerender } = render(<Select label="N" options={options} error="Bad" />);
    const box = screen.getByRole('combobox');
    expect(box).toHaveClass('border', 'border-[var(--color-error)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    expect(box).not.toHaveClass('border-[var(--color-border-subtle)]');
    rerender(<Select label="N" options={options} />);
    expect(box).toHaveClass('border', 'border-[var(--color-border-subtle)]');
    expect(box).not.toHaveClass('border-[var(--color-border-emphasis)]');
    rerender(<Select label="N" options={options} disabled error="Bad" />);
    expect(box).toHaveClass('border', 'border-[var(--color-border-emphasis)]');
    expect(box).not.toHaveClass('border-[var(--color-error)]');
    expect(box).not.toHaveClass('text-[var(--color-text-default)]');
  });

  test('size: scale names; compact is the deprecated alias of xs; size wins', () => {
    const { rerender } = render(<Select label="N" options={options} size="sm" />);
    expect(screen.getByText('N')).toHaveClass('type-label-sm');
    expect(screen.getByRole('combobox')).toHaveClass('h-8');
    rerender(<Select label="N" options={options} compact />);
    expect(screen.getByRole('combobox')).toHaveClass('h-7');
    rerender(<Select label="N" options={options} compact size="lg" />);
    expect(screen.getByRole('combobox')).toHaveClass('h-12');
  });

  test('disabled: native disabled; the error waits, not invalid; label and helper greyed', () => {
    render(<Select label="N" options={options} disabled error="Bad" helperText="Help" />);
    const box = screen.getByRole('combobox');
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText('Help')).toHaveClass('text-[var(--color-text-disabled)]');
    expect(screen.getByText('N')).toHaveClass('text-[var(--color-text-disabled)]');
  });

  test('id: optional, generated, and the label still names the field', () => {
    render(<Select label="Plan" options={options} />);
    expect(screen.getByLabelText('Plan').id).toBeTruthy();
  });

  test('label: optional; aria-label and other unnamed props reach the select', () => {
    const onBlur = jest.fn();
    render(<Select aria-label="Plan" name="plan" data-x="1" onBlur={onBlur} options={options} />);
    const box = screen.getByRole('combobox', { name: 'Plan' });
    expect(box).toHaveAttribute('name', 'plan');
    expect(box).toHaveAttribute('data-x', '1');
    fireEvent.blur(box);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(document.querySelector('label')).toBeNull();
  });

  test("inline: the label names the select; an app's aria-label wins", () => {
    const { rerender } = render(<Select inline label="Plan" options={options} />);
    expect(screen.getByRole('combobox', { name: 'Plan' })).toBeInTheDocument();
    expect(document.querySelector('label')).toBeNull();
    rerender(<Select inline label="Plan" aria-label="Billing plan" options={options} />);
    expect(screen.getByRole('combobox', { name: 'Billing plan' })).toBeInTheDocument();
  });

  test("aria-describedby: the app's own id is kept beside the helper", () => {
    render(<Select label="N" options={options} helperText="Help" aria-describedby="extra" />);
    expect(screen.getByRole('combobox').getAttribute('aria-describedby')).toMatch(
      /-helper extra$/
    );
  });

  test("className: merged with cn on the root; the app's select class wins a conflict", () => {
    const { container } = render(
      <Select label="N" options={options} inline className="mt-4 flex" selectClassName="h-20" />
    );
    expect(container.firstChild).toHaveClass('mt-4', 'flex');
    expect(container.firstChild).not.toHaveClass('inline-flex');
    const box = screen.getByRole('combobox');
    expect(box).toHaveClass('h-20');
    expect(box).not.toHaveClass('h-10');
  });

  test('keyboard and focus: a text field shows focus however it came (focus:, ring-1)', () => {
    expect(render(<Select label="N" options={options} />).getByRole('combobox')).toHaveClass(
      'focus:ring-1',
      'focus:border-[var(--color-primary)]'
    );
  });
});
