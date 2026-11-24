import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorPickerPanel from '../ColorPickerPanel';

describe('ColorPickerPanel Component', () => {
  const defaultProps = {
    value: { hex: '#FF5500', alpha: 100 },
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic rendering
  test('renders saturation square, hue slider, alpha slider, and hex input', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    expect(screen.getByTestId('saturation-square')).toBeInTheDocument();
    expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
    expect(screen.getByTestId('alpha-slider')).toBeInTheDocument();
    expect(screen.getByTestId('hex-input')).toBeInTheDocument();
    expect(screen.getByTestId('alpha-input')).toBeInTheDocument();
  });

  // Test initial value in hex input
  test('initial value displayed in hex input matches prop', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement;
    expect(hexInput.value).toBe('#FF5500');
  });

  // Test onChange when hex input changes
  test('changing hex input calls onChange with new color', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const hexInput = screen.getByTestId('hex-input');
    fireEvent.change(hexInput, { target: { value: '#00FF00' } });

    expect(onChange).toHaveBeenCalledWith({ hex: '#00FF00', alpha: 100 });
  });

  // Test validation error on invalid hex
  test('invalid hex shows validation error when input touched', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    const hexInput = screen.getByTestId('hex-input');

    // Type invalid hex
    fireEvent.change(hexInput, { target: { value: '#GGGGGG' } });
    // Error should not show yet (not touched)
    expect(screen.queryByTestId('hex-error')).not.toBeInTheDocument();

    // Blur to mark as touched
    fireEvent.blur(hexInput);

    // Now error should be visible
    expect(screen.getByTestId('hex-error')).toBeInTheDocument();
    expect(screen.getByTestId('hex-error')).toHaveTextContent(
      'Invalid hex color'
    );
  });

  // Test hue slider change
  test('hue slider change updates color (onChange called with new hue)', () => {
    const onChange = jest.fn();
    render(
      <ColorPickerPanel
        value={{ hex: '#FF0000', alpha: 100 }}
        onChange={onChange}
      />
    );

    const hueSlider = screen.getByTestId('hue-slider');
    fireEvent.change(hueSlider, { target: { value: '120' } });

    expect(onChange).toHaveBeenCalled();
    // Hue 120 is green - the exact hex depends on current saturation/value
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(callArg.alpha).toBe(100);
  });

  // Test alpha slider change
  test('alpha slider change updates alpha (onChange called with new alpha)', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const alphaSlider = screen.getByTestId('alpha-slider');
    fireEvent.change(alphaSlider, { target: { value: '50' } });

    expect(onChange).toHaveBeenCalledWith({ hex: '#FF5500', alpha: 50 });
  });

  // Test hideAlpha prop
  test('hideAlpha prop hides alpha slider and alpha input', () => {
    render(<ColorPickerPanel {...defaultProps} hideAlpha />);

    expect(screen.queryByTestId('alpha-slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alpha-input')).not.toBeInTheDocument();
    // But saturation, hue, and hex should still be there
    expect(screen.getByTestId('saturation-square')).toBeInTheDocument();
    expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
    expect(screen.getByTestId('hex-input')).toBeInTheDocument();
  });

  // Test hex input auto-prepends #
  test('hex input without hash autocorrects (prepends #)', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement;
    fireEvent.change(hexInput, { target: { value: 'FF0000' } });

    // Input should now have # prepended
    expect(hexInput.value).toBe('#FF0000');
    expect(onChange).toHaveBeenCalledWith({ hex: '#FF0000', alpha: 100 });
  });

  // Test hex input normalizes to uppercase
  test('hex input normalizes to uppercase', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement;
    fireEvent.change(hexInput, { target: { value: '#ff5500' } });

    expect(hexInput.value).toBe('#FF5500');
    expect(onChange).toHaveBeenCalledWith({ hex: '#FF5500', alpha: 100 });
  });

  // Test alpha input change
  test('alpha input accepts percentage values', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const alphaInput = screen.getByTestId('alpha-input');
    fireEvent.change(alphaInput, { target: { value: '75' } });

    expect(onChange).toHaveBeenCalledWith({ hex: '#FF5500', alpha: 75 });
  });

  // Test alpha input clamps values
  test('alpha input clamps values to 0-100', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const alphaInput = screen.getByTestId('alpha-input');

    // Test value > 100
    fireEvent.change(alphaInput, { target: { value: '150' } });
    expect(onChange).toHaveBeenCalledWith({ hex: '#FF5500', alpha: 100 });

    onChange.mockClear();

    // Test value < 0
    fireEvent.change(alphaInput, { target: { value: '-10' } });
    expect(onChange).toHaveBeenCalledWith({ hex: '#FF5500', alpha: 0 });
  });

  // Test saturation square has correct structure
  test('saturation square has indicator at correct position', () => {
    // Red (#FF0000) at full saturation and value
    render(
      <ColorPickerPanel
        value={{ hex: '#FF0000', alpha: 100 }}
        onChange={jest.fn()}
      />
    );

    const indicator = screen.getByTestId('saturation-indicator');
    expect(indicator).toBeInTheDocument();
    // Red at s=100, v=100 should be at right-top (100%, 0%)
    expect(indicator).toHaveStyle({ left: '100%', top: '0%' });
  });

  // Test saturation square click
  test('clicking saturation square updates color', () => {
    const onChange = jest.fn();
    render(<ColorPickerPanel {...defaultProps} onChange={onChange} />);

    const saturationSquare = screen.getByTestId('saturation-square');

    // Mock getBoundingClientRect
    const mockRect = {
      left: 0,
      top: 0,
      width: 200,
      height: 160,
      right: 200,
      bottom: 160,
      x: 0,
      y: 0,
      toJSON: () => {},
    };
    jest
      .spyOn(saturationSquare, 'getBoundingClientRect')
      .mockReturnValue(mockRect);

    // Click at center (100, 80) -> s=50, v=50
    fireEvent.mouseDown(saturationSquare, { clientX: 100, clientY: 80 });

    expect(onChange).toHaveBeenCalled();
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(callArg.alpha).toBe(100);
  });

  // Test external value changes update internal state
  test('external value changes update hex input', () => {
    const { rerender } = render(
      <ColorPickerPanel
        value={{ hex: '#FF0000', alpha: 100 }}
        onChange={jest.fn()}
      />
    );

    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement;
    expect(hexInput.value).toBe('#FF0000');

    // Change external value
    rerender(
      <ColorPickerPanel
        value={{ hex: '#00FF00', alpha: 100 }}
        onChange={jest.fn()}
      />
    );

    expect(hexInput.value).toBe('#00FF00');
  });

  // Test hue slider has rainbow gradient
  test('hue slider has rainbow gradient background', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    const hueSlider = screen.getByTestId('hue-slider');
    expect(hueSlider).toHaveStyle({
      background:
        'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    });
  });

  // Test alpha slider has checkered background
  test('alpha slider track has checkered background for transparency', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    const alphaTrack = screen.getByTestId('alpha-slider-track');
    expect(alphaTrack).toBeInTheDocument();
    // Track element exists with style attribute (checkered pattern applied via inline style)
    expect(alphaTrack).toHaveAttribute('style');
  });

  // Test valid hex clears error
  test('entering valid hex after invalid clears error', () => {
    render(<ColorPickerPanel {...defaultProps} />);

    const hexInput = screen.getByTestId('hex-input');

    // Enter invalid hex and blur
    fireEvent.change(hexInput, { target: { value: '#GGGGGG' } });
    fireEvent.blur(hexInput);
    expect(screen.getByTestId('hex-error')).toBeInTheDocument();

    // Enter valid hex
    fireEvent.change(hexInput, { target: { value: '#FF0000' } });
    expect(screen.queryByTestId('hex-error')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Locked Hue Mode Tests
  // -------------------------------------------------------------------------

  describe('lockedHue mode', () => {
    test('lockedHue hides saturation square', () => {
      render(<ColorPickerPanel {...defaultProps} lockedHue="#FFFFFF" />);

      expect(screen.queryByTestId('saturation-square')).not.toBeInTheDocument();
    });

    test('lockedHue hides hue slider', () => {
      render(<ColorPickerPanel {...defaultProps} lockedHue="#FFFFFF" />);

      expect(screen.queryByTestId('hue-slider')).not.toBeInTheDocument();
    });

    test('lockedHue hides hex input', () => {
      render(<ColorPickerPanel {...defaultProps} lockedHue="#FFFFFF" />);

      expect(screen.queryByTestId('hex-input')).not.toBeInTheDocument();
    });

    test('lockedHue shows only alpha controls', () => {
      render(<ColorPickerPanel {...defaultProps} lockedHue="#FFFFFF" />);

      // Alpha slider and input should be visible
      expect(screen.getByTestId('alpha-slider')).toBeInTheDocument();
      expect(screen.getByTestId('alpha-input')).toBeInTheDocument();

      // Color controls should be hidden
      expect(screen.queryByTestId('saturation-square')).not.toBeInTheDocument();
      expect(screen.queryByTestId('hue-slider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('hex-input')).not.toBeInTheDocument();
    });

    test('lockedHue onChange uses locked hue with varied alpha', () => {
      const onChange = jest.fn();
      render(
        <ColorPickerPanel
          value={{ hex: '#FF0000', alpha: 100 }}
          onChange={onChange}
          lockedHue="#FFFFFF"
        />
      );

      // Change alpha via slider
      const alphaSlider = screen.getByTestId('alpha-slider');
      fireEvent.change(alphaSlider, { target: { value: '50' } });

      // Should call onChange with the locked hue (#FFFFFF), not the value.hex (#FF0000)
      expect(onChange).toHaveBeenCalledWith({ hex: '#FFFFFF', alpha: 50 });
    });

    test('lockedHue alpha input uses locked hue', () => {
      const onChange = jest.fn();
      render(
        <ColorPickerPanel
          value={{ hex: '#FF0000', alpha: 100 }}
          onChange={onChange}
          lockedHue="#00FF00"
        />
      );

      // Change alpha via input
      const alphaInput = screen.getByTestId('alpha-input');
      fireEvent.change(alphaInput, { target: { value: '75' } });

      // Should call onChange with the locked hue (#00FF00)
      expect(onChange).toHaveBeenCalledWith({ hex: '#00FF00', alpha: 75 });
    });

    test('lockedHue alpha input is full width when hex input hidden', () => {
      render(<ColorPickerPanel {...defaultProps} lockedHue="#FFFFFF" />);

      const alphaInputContainer = screen
        .getByTestId('alpha-input')
        .closest('div')?.parentElement;
      expect(alphaInputContainer).toHaveClass('flex-1');
    });
  });

  // D14: two panels on one page keep their own labels
  test('two panels on one page have unique ids and each label names its own control', () => {
    const { container } = render(
      <>
        <ColorPickerPanel {...defaultProps} />
        <ColorPickerPanel {...defaultProps} />
      </>
    );
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hues = screen.getAllByLabelText('Hue');
    expect(hues).toHaveLength(2);
    expect(hues[0]).not.toBe(hues[1]);
    expect(screen.getAllByLabelText('Hex')).toHaveLength(2);
    expect(screen.getAllByLabelText('Opacity')).toHaveLength(2);
    expect(screen.getAllByLabelText('Alpha')).toHaveLength(2);
  });

  test('the hex error is described by its own panel', () => {
    render(
      <>
        <ColorPickerPanel {...defaultProps} />
        <ColorPickerPanel {...defaultProps} />
      </>
    );
    const second = screen.getAllByTestId('hex-input')[1];
    fireEvent.change(second, { target: { value: '#GGGGGG' } });
    fireEvent.blur(second);
    const error = screen.getByTestId('hex-error');
    expect(second.getAttribute('aria-describedby')).toBe(error.id);
  });
});
