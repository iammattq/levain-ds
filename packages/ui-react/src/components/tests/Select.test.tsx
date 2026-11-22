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
