import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DualSlider from '../DualSlider';

describe('DualSlider Component', () => {
  // Define common props for testing
  const defaultProps = {
    minValue: 25,
    maxValue: 75,
    min: 0,
    max: 100,
    onMinChange: jest.fn(),
    onMaxChange: jest.fn(),
  };

  // Test basic rendering
  test('renders correctly with two range inputs', () => {
    render(<DualSlider {...defaultProps} />);

    // Should have two range inputs
    const sliderInputs = screen.getAllByRole('slider');
    expect(sliderInputs).toHaveLength(2);

    // First slider for minimum value
    expect(sliderInputs[0]).toHaveAttribute('type', 'range');
    expect(sliderInputs[0]).toHaveAttribute('min', '0');
    expect(sliderInputs[0]).toHaveAttribute('max', '75'); // Limited by maxValue
    expect(sliderInputs[0]).toHaveValue('25'); // minValue

    // Second slider for maximum value
    expect(sliderInputs[1]).toHaveAttribute('type', 'range');
    expect(sliderInputs[1]).toHaveAttribute('min', '25'); // Limited by minValue
    expect(sliderInputs[1]).toHaveAttribute('max', '100');
    expect(sliderInputs[1]).toHaveValue('75'); // maxValue
  });

  // Test label rendering
  test('renders with label when provided', () => {
    const label = 'Price Range';
    render(<DualSlider {...defaultProps} label={label} />);

    const labelElement = screen.getByText(label);
    expect(labelElement).toBeInTheDocument();
  });

  // Test value display
  test('renders formatted value when showValue is true (default)', () => {
    render(<DualSlider {...defaultProps} />);

    // Default formatter shows "min - max"
    const valueElement = screen.getByText('25 - 75');
    expect(valueElement).toBeInTheDocument();
  });

  // Test hiding value display
  test('does not render value when showValue is false', () => {
    render(<DualSlider {...defaultProps} showValue={false} />);

    expect(screen.queryByText('25 - 75')).not.toBeInTheDocument();
  });

  // Test value formatter
  test('formats value using custom valueFormatter', () => {
    render(
      <DualSlider
        {...defaultProps}
        valueFormatter={(min, max) => `$${min} to $${max}`}
      />
    );

    const valueElement = screen.getByText('$25 to $75');
    expect(valueElement).toBeInTheDocument();
  });

  // Test min and max labels
  test('renders default min and max labels', () => {
    render(<DualSlider {...defaultProps} />);

    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  // Test custom min and max labels
  test('renders custom min and max labels when provided', () => {
    render(<DualSlider {...defaultProps} minLabel="From" maxLabel="To" />);

    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  // Test onChange callbacks
  test('calls onMinChange when min slider value changes', () => {
    const onMinChange = jest.fn();
    render(<DualSlider {...defaultProps} onMinChange={onMinChange} />);

    const minSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(minSlider, { target: { value: '30' } });

    expect(onMinChange).toHaveBeenCalledTimes(1);
    expect(onMinChange).toHaveBeenCalledWith(30);
  });

  test('calls onMaxChange when max slider value changes', () => {
    const onMaxChange = jest.fn();
    render(<DualSlider {...defaultProps} onMaxChange={onMaxChange} />);

    const maxSlider = screen.getAllByRole('slider')[1];
    fireEvent.change(maxSlider, { target: { value: '80' } });

    expect(onMaxChange).toHaveBeenCalledTimes(1);
    expect(onMaxChange).toHaveBeenCalledWith(80);
  });

  // Test step property
  test('sets step attribute correctly on both sliders', () => {
    render(<DualSlider {...defaultProps} step={0.5} />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('step', '0.5');
    expect(sliders[1]).toHaveAttribute('step', '0.5');
  });

  // Test custom class names
  test('applies custom class names to elements', () => {
    const { container } = render(
      <DualSlider
        {...defaultProps}
        label="Custom Classes"
        className="custom-container"
        labelClassName="custom-label"
        valueClassName="custom-value"
        sliderClassName="custom-slider"
      />
    );

    // Container has custom class
    const dualSliderContainer = container.firstChild;
    expect(dualSliderContainer).toHaveClass('custom-container');

    // Label has custom class
    const labelElement = screen.getByText('Custom Classes');
    expect(labelElement).toHaveClass('custom-label');

    // Value has custom class
    const valueElement = screen.getByText('25 - 75');
    expect(valueElement).toHaveClass('custom-value');

    // Both sliders have custom class
    const sliderInputs = screen.getAllByRole('slider');
    expect(sliderInputs[0]).toHaveClass('custom-slider');
    expect(sliderInputs[1]).toHaveClass('custom-slider');
  });

  // Test absence of label and value elements when both are not provided/disabled
  test('does not render label section when label is not provided and showValue is false', () => {
    const { container } = render(
      <DualSlider {...defaultProps} label={undefined} showValue={false} />
    );

    // There should be no div with flex class (the label/value row)
    const flexElement = container.querySelector('.flex');
    expect(flexElement).not.toBeInTheDocument();

    // Should still render the sliders
    const sliderInputs = screen.getAllByRole('slider');
    expect(sliderInputs).toHaveLength(2);
  });
});
