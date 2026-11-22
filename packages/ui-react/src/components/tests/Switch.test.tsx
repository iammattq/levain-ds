import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Switch from '../Switch';

describe('Switch Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-switch',
    checked: false,
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly', () => {
    render(<Switch {...defaultProps} />);

    // Check that the input exists and is a checkbox
    const switchInput = screen.getByRole('checkbox');
    expect(switchInput).toBeInTheDocument();
    expect(switchInput).toHaveAttribute('type', 'checkbox');
    expect(switchInput).toHaveAttribute('id', 'test-switch');
  });

  // Test label rendering
  test('renders with label when provided', () => {
    const label = 'Test Switch Label';
    render(<Switch {...defaultProps} label={label} />);

    const labelElement = screen.getByText(label);
    expect(labelElement).toBeInTheDocument();
  });

  // Test no label rendering
  test('renders without label when not provided', () => {
    render(<Switch {...defaultProps} />);

    // There should be no text elements other than potential aria labels
    expect(screen.queryByText(/./i)).not.toBeInTheDocument();
  });

  // Test checked state
  test('reflects checked state correctly', () => {
    const { rerender } = render(<Switch {...defaultProps} checked={false} />);

    // Check the initial unchecked state
    const switchInput = screen.getByRole('checkbox');
    expect(switchInput).not.toBeChecked();

    // Rerender with checked=true
    rerender(<Switch {...defaultProps} checked={true} />);
    expect(switchInput).toBeChecked();
  });

  // Test onChange callback
  test('calls onChange when clicked', () => {
    const onChange = jest.fn();
    render(<Switch {...defaultProps} onChange={onChange} />);

    const switchInput = screen.getByRole('checkbox');
    fireEvent.click(switchInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  // Test disabled state
  test('disables the switch when disabled prop is true', () => {
    render(<Switch {...defaultProps} disabled={true} />);

    const switchInput = screen.getByRole('checkbox');
    expect(switchInput).toBeDisabled();

    // The label should have a cursor-not-allowed class
    const label = switchInput.closest('label');
    expect(label).toHaveClass('cursor-not-allowed');
    expect(label).toHaveClass('opacity-50');
  });

  // Test different sizes
  test.each(['sm', 'md', 'lg'] as const)(
    'renders in %s size correctly',
    (size) => {
      const { container } = render(<Switch {...defaultProps} size={size} />);

      // Different sizes should have different width and height classes
      const switchTrack = container.querySelector('div[class*="rounded-full"]');

      if (size === 'sm') {
        expect(switchTrack).toHaveClass('w-[30px]');
        expect(switchTrack).toHaveClass('h-4');
      } else if (size === 'md') {
        expect(switchTrack).toHaveClass('w-11');
        expect(switchTrack).toHaveClass('h-6');
      } else if (size === 'lg') {
        expect(switchTrack).toHaveClass('w-14');
        expect(switchTrack).toHaveClass('h-7');
      }
    }
  );

  // Test default size
  test('uses medium size by default', () => {
    const { container } = render(<Switch {...defaultProps} />);

    const switchTrack = container.querySelector('div[class*="rounded-full"]');
    expect(switchTrack).toHaveClass('w-11');
    expect(switchTrack).toHaveClass('h-6');
  });

  // Test switch track color change based on checked state
  test('changes background color based on checked state', () => {
    const { container, rerender } = render(
      <Switch {...defaultProps} checked={false} />
    );

    const switchTrack = container.querySelector('div[class*="rounded-full"]');
    expect(switchTrack).toHaveClass('bg-[var(--color-surface-card)]');

    rerender(<Switch {...defaultProps} checked={true} />);
    expect(switchTrack).toHaveClass('bg-[var(--color-accent)]');
  });

  // Test switch dot position change based on checked state
  test('changes dot position based on checked state', () => {
    const { container, rerender } = render(
      <Switch {...defaultProps} checked={false} />
    );

    const switchDot = container.querySelector('div[class*="absolute"]');
    expect(switchDot).not.toHaveClass('translate-x-5.5'); // Default md size checked position

    rerender(<Switch {...defaultProps} checked={true} />);
    expect(switchDot).toHaveClass('translate-x-5.5'); // Default md size checked position
  });

  // Test accessibility features
  test('has proper accessibility attributes', () => {
    render(<Switch {...defaultProps} label="Accessible Switch" />);

    const switchInput = screen.getByRole('checkbox');
    expect(switchInput).toHaveAttribute('id', 'test-switch');

    // Label should be connected to input via htmlFor
    const label = screen.getByText('Accessible Switch');
    expect(label.closest('label')).toHaveAttribute('for', 'test-switch');

    // Should have focus styles
    const switchTrack = switchInput.nextElementSibling;
    expect(switchTrack).toHaveClass('peer-focus:ring-2');
  });
});
