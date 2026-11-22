import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ColorInput from '../ColorInput';

// Mock cn utility since it's imported from outside the component
jest.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock ColorPickerPanel
jest.mock('../ColorPickerPanel', () => {
  return function MockColorPickerPanel({
    onChange,
  }: {
    onChange: (color: { hex: string; alpha: number }) => void;
  }) {
    return (
      <div data-testid="color-picker-panel">
        <button
          data-testid="mock-color-select"
          onClick={() => onChange({ hex: '#00FF00', alpha: 100 })}
        >
          Select Green
        </button>
      </div>
    );
  };
});

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('ColorInput Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-color',
    label: 'Brand Color',
    value: '#FF5733',
    onChange: jest.fn(),
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic rendering
  test('renders with label and input fields', () => {
    render(<ColorInput {...defaultProps} />);

    // Check for the label element
    const labelElement = screen.getByText('Brand Color');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName.toLowerCase()).toBe('label');
    expect(labelElement).toHaveAttribute('for', 'test-color');

    // Check for the text input
    const textInput = screen.getByRole('textbox');
    expect(textInput).toBeInTheDocument();
    expect(textInput).toHaveAttribute('id', 'test-color');
    expect(textInput).toHaveValue('#FF5733');

    // Check for the color chip button
    const colorChip = screen.getByRole('button');
    expect(colorChip).toBeInTheDocument();
    expect(colorChip).toHaveAttribute('aria-label', 'Choose Brand Color color');
    expect(colorChip).toHaveStyle('background-color: #FF5733');

    // Popover should not be visible initially
    expect(screen.queryByTestId('color-picker-panel')).not.toBeInTheDocument();
  });

  // Test value binding
  test('displays the provided color value', () => {
    render(<ColorInput {...defaultProps} value="#00FF00" />);

    // Text input should have the color value
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveValue('#00FF00');

    // Color chip should have the color as its background
    const colorChip = screen.getByRole('button');
    expect(colorChip).toHaveStyle('background-color: #00FF00');
  });

  // Test onChange callback from text input
  test('calls onChange when text input value changes', () => {
    render(<ColorInput {...defaultProps} />);

    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: '#00FF00' } });

    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    // Check that the value string is passed to the onChange handler
    expect(defaultProps.onChange).toHaveBeenCalledWith('#00FF00');
  });

  // Test clicking on the color chip opens popover
  test('clicking on color chip opens the color picker popover', () => {
    render(<ColorInput {...defaultProps} />);

    // Click the color chip
    const colorChip = screen.getByRole('button');
    fireEvent.click(colorChip);

    // Popover should now be visible
    expect(screen.getByTestId('color-picker-panel')).toBeInTheDocument();
  });

  // Test selecting a color from the picker
  test('selecting a color from picker calls onChange with the new color', () => {
    render(<ColorInput {...defaultProps} />);

    // Open the popover
    const colorChip = screen.getByRole('button');
    fireEvent.click(colorChip);

    // Click the mock color select button
    const selectButton = screen.getByTestId('mock-color-select');
    fireEvent.click(selectButton);

    // onChange should be called with the new color (uppercase)
    expect(defaultProps.onChange).toHaveBeenCalledWith('#00FF00');
  });

  // Test clicking chip again closes popover
  test('clicking on color chip again closes the popover', () => {
    render(<ColorInput {...defaultProps} />);

    const colorChip = screen.getByRole('button');

    // Open the popover
    fireEvent.click(colorChip);
    expect(screen.getByTestId('color-picker-panel')).toBeInTheDocument();

    // Close the popover
    fireEvent.click(colorChip);
    expect(screen.queryByTestId('color-picker-panel')).not.toBeInTheDocument();
  });

  // Test escape key closes popover
  test('pressing escape closes the popover', () => {
    render(<ColorInput {...defaultProps} />);

    // Open the popover
    const colorChip = screen.getByRole('button');
    fireEvent.click(colorChip);
    expect(screen.getByTestId('color-picker-panel')).toBeInTheDocument();

    // Press escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('color-picker-panel')).not.toBeInTheDocument();
  });

  // Test invalid color format
  test('shows validation error for invalid color format', () => {
    // First, render with valid color
    const { rerender } = render(
      <ColorInput {...defaultProps} touched={true} />
    );

    // No error should be shown initially
    expect(
      screen.queryByText('Invalid hex color format.')
    ).not.toBeInTheDocument();

    // Now rerender with invalid color
    rerender(
      <ColorInput {...defaultProps} value="invalid-color" touched={true} />
    );

    // Error should now be visible
    expect(screen.getByText('Invalid hex color format.')).toBeInTheDocument();

    // Input should have invalid state
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute('aria-invalid', 'true');
  });

  // Test custom validation function
  test('uses custom validation function', () => {
    const validateMock = jest.fn().mockReturnValue('Custom validation error');

    render(
      <ColorInput {...defaultProps} validate={validateMock} touched={true} />
    );

    // Validation function should be called with the current value
    expect(validateMock).toHaveBeenCalledWith('#FF5733');

    // Custom error should be displayed
    expect(screen.getByText('Custom validation error')).toBeInTheDocument();
  });

  // Test external error message
  test('displays external error message when provided and touched is true', () => {
    const errorMessage = 'This color is not in our palette';
    render(
      <ColorInput {...defaultProps} error={errorMessage} touched={true} />
    );

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();

    // Input should have invalid state
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute('aria-invalid', 'true');
    expect(textInput).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-error`
    );
  });

  // Test that error is not shown if touched is false
  test('does not display error message when touched is false', () => {
    const errorMessage = 'This color is not in our palette';
    render(
      <ColorInput {...defaultProps} error={errorMessage} touched={false} />
    );

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test helper text
  test('displays helper text when provided', () => {
    const helperText = 'Enter a hex color code (e.g., #FF5733)';
    render(<ColorInput {...defaultProps} helperText={helperText} />);

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();

    // Check for the correct aria description binding
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-helper`
    );
  });

  // Test disabled state
  test('renders in disabled state correctly', () => {
    render(<ColorInput {...defaultProps} disabled />);

    // Text input should be disabled
    const textInput = screen.getByRole('textbox');
    expect(textInput).toBeDisabled();

    // Color chip button should be disabled
    const colorChip = screen.getByRole('button');
    expect(colorChip).toBeDisabled();

    // Label should have disabled styling
    const labelElement = screen.getByText('Brand Color');
    expect(labelElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test disabled state prevents opening popover
  test('clicking on disabled color chip does not open popover', () => {
    render(<ColorInput {...defaultProps} disabled />);

    const colorChip = screen.getByRole('button');
    fireEvent.click(colorChip);

    // Popover should not open
    expect(screen.queryByTestId('color-picker-panel')).not.toBeInTheDocument();
  });

  // Test color chip with invalid color
  test('color chip is transparent for invalid color values', () => {
    render(<ColorInput {...defaultProps} value="not-a-color" />);

    // Color chip should be transparent
    const colorChip = screen.getByRole('button');
    expect(colorChip).toHaveStyle('background-color: transparent');
  });

  // Test required state
  test('shows required indicator when required is true', () => {
    render(<ColorInput {...defaultProps} required />);

    // The label should contain the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');

    // Input should have required attribute
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute('required');
  });

  // Test custom class names
  test('applies custom class names', () => {
    const { container } = render(
      <ColorInput
        {...defaultProps}
        className="custom-container-class"
        inputClassName="custom-input-class"
        chipClassName="custom-chip-class"
      />
    );

    // Container should have the custom class
    expect(container.firstChild).toHaveClass('custom-container-class');

    // Text input should have the custom class
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveClass('custom-input-class');

    // Color chip should have the custom class
    const colorChip = screen.getByRole('button');
    expect(colorChip).toHaveClass('custom-chip-class');
  });

  // Test that helper text is hidden when error is shown
  test('hides helper text when error is shown', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <ColorInput
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
      <ColorInput
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

    // Helper text should have disabled styling
    expect(screen.getByText(helperText)).toHaveClass(
      'text-[var(--color-text-disabled)]'
    );
  });

  // Test ref forwarding (now forwards to button)
  test('forwards ref to color chip button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<ColorInput {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('button');
  });

  // Test aria-expanded attribute
  test('color chip has correct aria-expanded attribute', () => {
    render(<ColorInput {...defaultProps} />);

    const colorChip = screen.getByRole('button');

    // Initially not expanded
    expect(colorChip).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(colorChip);
    expect(colorChip).toHaveAttribute('aria-expanded', 'true');

    // Click to close
    fireEvent.click(colorChip);
    expect(colorChip).toHaveAttribute('aria-expanded', 'false');
  });

  // Test auto-prepend # for text input
  test('auto-prepends # to text input value if missing', () => {
    render(<ColorInput {...defaultProps} />);

    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: 'FF5733' } });

    // Should be called with # prepended and uppercase
    expect(defaultProps.onChange).toHaveBeenCalledWith('#FF5733');
  });

  // Test compact sizing
  test('applies compact sizing when compact prop is true', () => {
    render(<ColorInput {...defaultProps} compact />);

    const colorChip = screen.getByRole('button');
    expect(colorChip).toHaveClass('h-7');
    expect(colorChip).toHaveClass('w-7');

    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveClass('h-7');
  });
});
