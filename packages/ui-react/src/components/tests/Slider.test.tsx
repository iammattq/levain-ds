import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Slider from '../Slider';

describe('Slider Component', () => {
  // Define common props for testing
  const defaultProps = {
    value: 50,
    min: 0,
    max: 100,
    onChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly', () => {
    render(<Slider {...defaultProps} />);

    // Check that the input exists and is a range slider
    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toBeInTheDocument();
    expect(sliderInput).toHaveAttribute('type', 'range');
    expect(sliderInput).toHaveAttribute('min', '0');
    expect(sliderInput).toHaveAttribute('max', '100');
    expect(sliderInput).toHaveValue('50');
  });

  test('draws its fill: a primary gradient up to --slider-percentage, over the track surface (T27)', () => {
    render(<Slider {...defaultProps} value={30} />);
    const input = screen.getByRole('slider');
    expect(input.style.getPropertyValue('--slider-percentage')).toBe('30%');
    // both kept by tailwind-merge: the gradient is a background image, the surface the colour under it
    expect(input).toHaveClass(
      'bg-[linear-gradient(to_right,var(--color-primary)_var(--slider-percentage,0%),transparent_var(--slider-percentage,0%))]',
      'bg-[var(--color-surface-canvas)]'
    );
  });

  test('themes its thumb on the primary token, sized 16px at md and 14px at sm (T27)', () => {
    const { rerender } = render(<Slider {...defaultProps} />);
    const input = screen.getByRole('slider');
    expect(input).toHaveClass(
      '[&::-webkit-slider-thumb]:appearance-none',
      '[&::-webkit-slider-thumb]:bg-[var(--color-primary)]',
      '[&::-moz-range-thumb]:bg-[var(--color-primary)]',
      '[&::-webkit-slider-thumb]:h-4',
      '[&::-moz-range-thumb]:w-4'
    );
    rerender(<Slider {...defaultProps} size="sm" />);
    expect(screen.getByRole('slider')).toHaveClass('[&::-webkit-slider-thumb]:h-3.5', '[&::-moz-range-thumb]:w-3.5');
    expect(screen.getByRole('slider')).not.toHaveClass('[&::-webkit-slider-thumb]:h-4');
  });

  // Test label rendering
  test('renders with label when provided', () => {
    const label = 'Test Slider Label';
    render(<Slider {...defaultProps} label={label} />);

    const labelElement = screen.getByText(label);
    expect(labelElement).toBeInTheDocument();
  });

  // Test value display
  test('renders value when showValue is true (default)', () => {
    render(<Slider {...defaultProps} />);

    const valueElement = screen.getByText('50');
    expect(valueElement).toBeInTheDocument();
  });

  // Test hiding value display
  test('does not render value when showValue is false', () => {
    render(<Slider {...defaultProps} showValue={false} />);

    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });

  // Test value formatter
  test('formats value using valueFormatter', () => {
    render(
      <Slider {...defaultProps} valueFormatter={(value) => `${value}%`} />
    );

    const valueElement = screen.getByText('50%');
    expect(valueElement).toBeInTheDocument();
  });

  // Test onChange callback
  test('calls onChange when input value changes', () => {
    const onChange = jest.fn();
    render(<Slider {...defaultProps} onChange={onChange} />);

    const sliderInput = screen.getByRole('slider');
    fireEvent.change(sliderInput, { target: { value: '75' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(75);
  });

  // Test step property
  test('sets step attribute correctly', () => {
    render(<Slider {...defaultProps} step={0.5} />);

    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toHaveAttribute('step', '0.5');
  });

  // Test custom class names
  test('applies custom class names to elements', () => {
    const { container } = render(
      <Slider
        {...defaultProps}
        label="Custom Classes"
        className="custom-container"
        labelClassName="custom-label"
        valueClassName="custom-value"
        sliderClassName="custom-slider"
      />
    );

    // Container has custom class
    const sliderContainer = container.firstChild;
    expect(sliderContainer).toHaveClass('custom-container');

    // Label has custom class
    const labelElement = screen.getByText('Custom Classes');
    expect(labelElement).toHaveClass('custom-label');

    // Value has custom class
    const valueElement = screen.getByText('50');
    expect(valueElement).toHaveClass('custom-value');

    // Slider has custom class
    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toHaveClass('custom-slider');
  });

  // Test both label and value are shown together correctly
  test('shows both label and value when provided', () => {
    render(<Slider {...defaultProps} label="Brightness" />);

    const labelElement = screen.getByText('Brightness');
    const valueElement = screen.getByText('50');

    expect(labelElement).toBeInTheDocument();
    expect(valueElement).toBeInTheDocument();

    // Label is wrapped in a span for tooltip support, so check the row container (grandparent)
    const labelWrapper = labelElement.parentElement;
    const rowContainer = labelWrapper?.parentElement;
    expect(rowContainer).toHaveClass('flex');
    expect(rowContainer).toHaveClass('justify-between');
  });

  // Test absence of label and value elements when both are not provided/disabled
  test('does not render label section when label is not provided and showValue is false', () => {
    const { container } = render(
      <Slider {...defaultProps} label={undefined} showValue={false} />
    );

    // There should be no label/value row (the flex justify-between div)
    const labelRow = container.querySelector('.justify-between');
    expect(labelRow).not.toBeInTheDocument();

    // Still should render the slider input
    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toBeInTheDocument();
  });

  // Test size variants
  test('applies compact size classes when size="sm"', () => {
    const { container } = render(<Slider {...defaultProps} size="sm" />);

    // Container should have no bottom margin for sm size
    const sliderContainer = container.firstChild;
    expect(sliderContainer).not.toHaveClass('mb-4');
  });

  test('applies default size classes when size="md"', () => {
    const { container } = render(<Slider {...defaultProps} size="md" />);

    // Container should have default margin
    const sliderContainer = container.firstChild;
    expect(sliderContainer).toHaveClass('mb-4');
  });

  // Test helperText
  test('renders helperText when provided', () => {
    render(<Slider {...defaultProps} helperText="This is helper text" />);

    const helperElement = screen.getByText('This is helper text');
    expect(helperElement).toBeInTheDocument();
  });

  // Test showMinMax
  test('renders min/max labels when showMinMax is true', () => {
    render(<Slider {...defaultProps} showMinMax />);

    // Should show min and max values
    const minLabel = screen.getByText('0');
    const maxLabel = screen.getByText('100');
    expect(minLabel).toBeInTheDocument();
    expect(maxLabel).toBeInTheDocument();
  });

  test('does not render min/max labels when showMinMax is false', () => {
    render(<Slider {...defaultProps} showMinMax={false} />);

    // Should only show the current value (50), not the min/max
    const allZeros = screen.queryAllByText('0');
    const allHundreds = screen.queryAllByText('100');
    expect(allZeros).toHaveLength(0);
    expect(allHundreds).toHaveLength(0);
  });

  // Test disabled state
  test('disables slider when disabled prop is true', () => {
    render(<Slider {...defaultProps} disabled />);

    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toBeDisabled();
  });

  test('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    render(<Slider {...defaultProps} onChange={onChange} disabled />);

    const sliderInput = screen.getByRole('slider');
    fireEvent.change(sliderInput, { target: { value: '75' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  // Test ARIA attributes
  test('has correct aria attributes', () => {
    render(
      <Slider
        {...defaultProps}
        label="Volume"
        valueFormatter={(v) => `${v}%`}
      />
    );

    const sliderInput = screen.getByRole('slider');
    expect(sliderInput).toHaveAttribute('aria-valuemin', '0');
    expect(sliderInput).toHaveAttribute('aria-valuemax', '100');
    expect(sliderInput).toHaveAttribute('aria-valuenow', '50');
    expect(sliderInput).toHaveAttribute('aria-valuetext', '50%');
    expect(sliderInput).toHaveAttribute('aria-label', 'Volume');
  });

  // Test labelTooltip
  test('renders labelTooltip with info icon when provided', () => {
    render(
      <Slider
        {...defaultProps}
        label="Chroma"
        labelTooltip="Controls color saturation"
      />
    );

    // Tooltip text should be in the document
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Controls color saturation'
    );
  });

  test('does not render tooltip when labelTooltip is not provided', () => {
    render(<Slider {...defaultProps} label="Brightness" />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
