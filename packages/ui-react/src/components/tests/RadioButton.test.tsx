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

    // When checked, the dot should be visible
    const radioContainer = radioInput.nextElementSibling;
    const dot = radioContainer?.querySelector('span');
    expect(dot).toBeInTheDocument();
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

  // Test checked state styling
  test('applies correct styling for checked state', () => {
    const { container } = render(
      <RadioButton {...defaultProps} checked={true} />
    );

    const radioContainer = container.querySelector(
      'div[class*="rounded-full"]'
    );
    expect(radioContainer).toHaveClass('border-[var(--color-accent)]');
    expect(radioContainer).toHaveClass('bg-[var(--color-accent)]/10');

    // Dot should be present and styled correctly
    const dot = container.querySelector('span');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-[var(--color-accent)]');
  });

  // Test unchecked state styling
  test('applies correct styling for unchecked state', () => {
    const { container } = render(
      <RadioButton {...defaultProps} checked={false} />
    );

    const radioContainer = container.querySelector(
      'div[class*="rounded-full"]'
    );
    expect(radioContainer).toHaveClass('border-[var(--color-border-default)]');
    expect(radioContainer).toHaveClass('bg-[var(--color-surface-card)]');

    // Dot should not be present
    const dot = container.querySelector('span');
    expect(dot).not.toBeInTheDocument();
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
