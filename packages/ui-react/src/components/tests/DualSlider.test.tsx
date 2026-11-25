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

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 items (T54)
describe('DualSlider: form-input convention', () => {
  const ranges = () => screen.getAllByRole('slider') as HTMLInputElement[];

  test('value and change: value=[min,max], onChange([min,max]) whichever end moved', () => {
    const onChange = jest.fn();
    render(<DualSlider label="Price" min={0} max={100} value={[20, 80]} onChange={onChange} />);
    fireEvent.change(ranges()[0], { target: { value: '30' } });
    expect(onChange).toHaveBeenLastCalledWith([30, 80]);
    fireEvent.change(ranges()[1], { target: { value: '90' } });
    expect(onChange).toHaveBeenLastCalledWith([20, 90]);
  });

  test('controlled: shows only what value says', () => {
    render(<DualSlider label="Price" min={0} max={100} value={[20, 80]} onChange={() => {}} />);
    fireEvent.change(ranges()[0], { target: { value: '30' } });
    expect(ranges()[0].value).toBe('20');
  });

  test('uncontrolled: defaultValue (else [min, max]), then its own state', () => {
    const onChange = jest.fn();
    const { unmount } = render(
      <DualSlider label="Price" min={0} max={100} defaultValue={[10, 60]} onChange={onChange} />
    );
    expect(ranges().map((r) => r.value)).toEqual(['10', '60']);
    fireEvent.change(ranges()[1], { target: { value: '70' } });
    expect(ranges()[1].value).toBe('70');
    expect(onChange).toHaveBeenCalledWith([10, 70]);
    unmount();
    render(<DualSlider label="Price" min={5} max={50} />);
    expect(ranges().map((r) => r.value)).toEqual(['5', '50']);
  });

  test('deprecated minValue/maxValue/onMinChange/onMaxChange still work, alongside onChange', () => {
    const onMinChange = jest.fn();
    const onMaxChange = jest.fn();
    const onChange = jest.fn();
    render(
      <DualSlider min={0} max={100} minValue={25} maxValue={75}
        onMinChange={onMinChange} onMaxChange={onMaxChange} onChange={onChange} />
    );
    fireEvent.change(ranges()[0], { target: { value: '30' } });
    expect(onMinChange).toHaveBeenCalledWith(30);
    expect(onMaxChange).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith([30, 75]);
    expect(ranges()[0].value).toBe('25'); // still controlled by the old pair
  });

  test('each range is named (A3): by its caption, inside a group named by the label', () => {
    render(<DualSlider label="Price" min={0} max={100} defaultValue={[20, 80]} />);
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Min' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Max' })).toBeInTheDocument();
    render(<DualSlider min={0} max={100} minLabel="From" maxLabel="To" aria-label="Years" />);
    expect(screen.getByRole('group', { name: 'Years' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'From' })).toBeInTheDocument();
  });

  test('disabled (A3): both ranges natively disabled, nothing fires', () => {
    const onChange = jest.fn();
    const onMinChange = jest.fn();
    render(<DualSlider label="Price" min={0} max={100} defaultValue={[20, 80]} disabled onChange={onChange} onMinChange={onMinChange} />);
    ranges().forEach((r) => expect(r).toBeDisabled());
    fireEvent.change(ranges()[0], { target: { value: '30' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(onMinChange).not.toHaveBeenCalled();
  });

  test('size: sm and md (default)', () => {
    const { rerender } = render(<DualSlider label="Price" min={0} max={100} />);
    expect(ranges()[0]).toHaveClass('h-2');
    expect(screen.getByText('Price')).toHaveClass('type-label');
    rerender(<DualSlider label="Price" size="sm" min={0} max={100} />);
    expect(ranges()[0]).toHaveClass('h-1.5');
    expect(screen.getByText('Price')).toHaveClass('type-label-sm');
  });

  test('ref, id and passthrough go to the group; the ranges take ids from it', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<DualSlider ref={ref} id="price" data-testid="dual" label="Price" min={0} max={100} />);
    const group = screen.getByRole('group');
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute('id', 'price');
    expect(group).toHaveAttribute('data-testid', 'dual');
    expect(ranges()[0]).toHaveAttribute('id', 'price-min');
    expect(ranges()[1]).toHaveAttribute('id', 'price-max');
  });

  test('id falls back to useId: two DualSliders keep their own names', () => {
    render(<><DualSlider label="A" min={0} max={1} /><DualSlider label="B" min={0} max={1} /></>);
    expect(screen.getAllByRole('slider', { name: 'Min' })).toHaveLength(2);
    const ids = screen.getAllByRole('slider').map((r) => r.id);
    expect(new Set(ids).size).toBe(4);
  });

  test('className is merged with cn: the app class wins', () => {
    render(<DualSlider label="Price" min={0} max={100} className="mb-0" />);
    const group = screen.getByRole('group');
    expect(group).toHaveClass('mb-0');
    expect(group).not.toHaveClass('mb-4');
  });

  test('keyboard ring: focus-visible in --color-border-focus with an offset', () => {
    render(<DualSlider label="Price" min={0} max={100} />);
    expect(ranges()[0].className).toContain('focus-visible:ring-[var(--color-border-focus)]');
    expect(ranges()[0].className).toContain('focus-visible:ring-offset-2');
  });
});
