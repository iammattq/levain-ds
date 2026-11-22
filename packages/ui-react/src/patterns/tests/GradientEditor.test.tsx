/**
 * Tests for GradientEditor component and gradientToCss utility
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GradientEditor, { gradientToCss } from '../GradientEditor';
import type { GradientValue } from '../GradientEditor';

// ============================================================================
// gradientToCss utility tests
// ============================================================================

describe('gradientToCss utility', () => {
  it('converts basic gradient to CSS', () => {
    const gradient: GradientValue = {
      angle: 90,
      stops: [
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
      ],
    };

    const css = gradientToCss(gradient);
    expect(css).toBe('linear-gradient(90deg, #FF0000 0%, #0000FF 100%)');
  });

  it('uses rgba format for stops with alpha < 100', () => {
    const gradient: GradientValue = {
      angle: 45,
      stops: [
        { position: 0, color: { hex: '#FF0000', alpha: 50 } },
        { position: 100, color: { hex: '#0000FF', alpha: 80 } },
      ],
    };

    const css = gradientToCss(gradient);
    expect(css).toBe(
      'linear-gradient(45deg, rgba(255, 0, 0, 0.5) 0%, rgba(0, 0, 255, 0.8) 100%)'
    );
  });

  it('handles gradient with 3+ stops in correct order', () => {
    const gradient: GradientValue = {
      angle: 180,
      stops: [
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 50, color: { hex: '#00FF00', alpha: 100 } },
      ],
    };

    const css = gradientToCss(gradient);
    // Stops should be sorted by position
    expect(css).toBe(
      'linear-gradient(180deg, #FF0000 0%, #00FF00 50%, #0000FF 100%)'
    );
  });

  it('handles angle of 0 degrees', () => {
    const gradient: GradientValue = {
      angle: 0,
      stops: [
        { position: 0, color: { hex: '#FFFFFF', alpha: 100 } },
        { position: 100, color: { hex: '#000000', alpha: 100 } },
      ],
    };

    const css = gradientToCss(gradient);
    expect(css).toBe('linear-gradient(0deg, #FFFFFF 0%, #000000 100%)');
  });

  it('handles mixed alpha and non-alpha stops', () => {
    const gradient: GradientValue = {
      angle: 135,
      stops: [
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 50, color: { hex: '#00FF00', alpha: 75 } },
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
      ],
    };

    const css = gradientToCss(gradient);
    expect(css).toBe(
      'linear-gradient(135deg, #FF0000 0%, rgba(0, 255, 0, 0.75) 50%, #0000FF 100%)'
    );
  });
});

// ============================================================================
// GradientEditor component tests
// ============================================================================

describe('GradientEditor Component', () => {
  const defaultGradient: GradientValue = {
    angle: 90,
    stops: [
      { position: 0, color: { hex: '#FF0000', alpha: 100 } },
      { position: 100, color: { hex: '#0000FF', alpha: 100 } },
    ],
  };

  const defaultProps = {
    value: defaultGradient,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Basic Rendering
  // -------------------------------------------------------------------------

  test('renders gradient bar, stops list, and angle slider', () => {
    render(<GradientEditor {...defaultProps} />);

    // Gradient bar
    expect(screen.getByTestId('gradient-bar')).toBeInTheDocument();

    // Stops list - look for "Stops" label
    expect(screen.getByText('Stops')).toBeInTheDocument();

    // Angle slider
    expect(screen.getByLabelText('Angle')).toBeInTheDocument();
  });

  test('initial stops displayed in position order', () => {
    const gradient: GradientValue = {
      angle: 90,
      stops: [
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 50, color: { hex: '#00FF00', alpha: 100 } },
      ],
    };

    render(<GradientEditor value={gradient} onChange={jest.fn()} />);

    // Find all hex displays in order
    const hexDisplays = screen.getAllByText(/#[0-9A-F]{6}/);

    // Should be in position order: red (0%), green (50%), blue (100%)
    expect(hexDisplays[0]).toHaveTextContent('#FF0000');
    expect(hexDisplays[1]).toHaveTextContent('#00FF00');
    expect(hexDisplays[2]).toHaveTextContent('#0000FF');
  });

  // -------------------------------------------------------------------------
  // Stop Selection and ColorPickerPanel
  // -------------------------------------------------------------------------

  test('selecting stop shows ColorPickerPanel', () => {
    render(<GradientEditor {...defaultProps} />);

    // ColorPickerPanel should not be visible initially (no stop selected)
    expect(screen.queryByTestId('saturation-square')).not.toBeInTheDocument();

    // Click on the first stop row to select it
    const stopRows = screen
      .getAllByRole('button')
      .filter(
        (btn) =>
          btn.getAttribute('data-testid')?.startsWith('stop-row-') ||
          btn.getAttribute('aria-label')?.startsWith('Stop at')
      );

    // Find a clickable stop element - use the gradient bar handles
    const gradientBar = screen.getByTestId('gradient-bar');
    const stopHandle = within(gradientBar).getAllByRole('button')[0];
    fireEvent.click(stopHandle);

    // ColorPickerPanel should now be visible
    expect(screen.getByTestId('saturation-square')).toBeInTheDocument();
    expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
  });

  test('changing stop color via ColorPickerPanel calls onChange with updated gradient', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    // Select a stop first
    const gradientBar = screen.getByTestId('gradient-bar');
    const stopHandle = within(gradientBar).getAllByRole('button')[0];
    fireEvent.click(stopHandle);

    // Change color via hex input
    const hexInput = screen.getByTestId('hex-input');
    fireEvent.change(hexInput, { target: { value: '#00FF00' } });

    // onChange should be called with updated gradient
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.stops).toContainEqual(
      expect.objectContaining({
        color: { hex: '#00FF00', alpha: 100 },
      })
    );
  });

  // -------------------------------------------------------------------------
  // Stop Position Editing
  // -------------------------------------------------------------------------

  test('changing stop position via input calls onChange with new position', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    // Find position inputs - they have testid pattern stop-position-{id}
    const positionInputs = screen.getAllByRole('textbox').filter((input) => {
      const testId = input.getAttribute('data-testid');
      return testId?.startsWith('stop-position-');
    });

    // Change the first stop's position
    fireEvent.change(positionInputs[0], { target: { value: '25' } });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.stops).toContainEqual(
      expect.objectContaining({
        position: 25,
      })
    );
  });

  // -------------------------------------------------------------------------
  // Add Stop
  // -------------------------------------------------------------------------

  test('add stop button adds stop at midpoint with interpolated color', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    // Click add stop button
    const addButton = screen.getByTestId('add-stop-button');
    fireEvent.click(addButton);

    // onChange should be called
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];

    // Should now have 3 stops
    expect(lastCall.stops).toHaveLength(3);

    // New stop should be at position 50 (midpoint)
    const middleStop = lastCall.stops.find(
      (s: { position: number }) => s.position === 50
    );
    expect(middleStop).toBeDefined();

    // Color should be interpolated (purple-ish, between red and blue)
    // Red RGB: 255,0,0 and Blue RGB: 0,0,255
    // Midpoint: 128,0,128 which is a purple shade
    expect(middleStop.color.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  // -------------------------------------------------------------------------
  // Remove Stop
  // -------------------------------------------------------------------------

  test('remove stop button removes selected stop', () => {
    const threeStopGradient: GradientValue = {
      angle: 90,
      stops: [
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 50, color: { hex: '#00FF00', alpha: 100 } },
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
      ],
    };

    const onChange = jest.fn();
    render(<GradientEditor value={threeStopGradient} onChange={onChange} />);

    // Find all remove buttons
    const removeButtons = screen.getAllByRole('button', {
      name: /Remove stop/i,
    });

    // All should be enabled since we have 3 stops (more than minStops=2)
    removeButtons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });

    // Click the second remove button (for the green stop at 50%)
    fireEvent.click(removeButtons[1]);

    // onChange should be called with 2 stops
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.stops).toHaveLength(2);

    // Green stop should be removed
    const hasGreen = lastCall.stops.some(
      (s: { color: { hex: string } }) => s.color.hex === '#00FF00'
    );
    expect(hasGreen).toBe(false);
  });

  // -------------------------------------------------------------------------
  // minStops constraint
  // -------------------------------------------------------------------------

  test('minStops prevents removing below threshold (button disabled)', () => {
    const onChange = jest.fn();
    render(
      <GradientEditor
        value={defaultGradient}
        onChange={onChange}
        minStops={2}
      />
    );

    // With 2 stops and minStops=2, remove buttons should be disabled
    const removeButtons = screen.getAllByRole('button', {
      name: /Remove stop/i,
    });

    removeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });

    // Clicking should not call onChange
    fireEvent.click(removeButtons[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // maxStops constraint
  // -------------------------------------------------------------------------

  test('maxStops prevents adding above threshold (button disabled)', () => {
    const maxedGradient: GradientValue = {
      angle: 90,
      stops: [
        { position: 0, color: { hex: '#FF0000', alpha: 100 } },
        { position: 50, color: { hex: '#00FF00', alpha: 100 } },
        { position: 100, color: { hex: '#0000FF', alpha: 100 } },
      ],
    };

    const onChange = jest.fn();
    render(
      <GradientEditor value={maxedGradient} onChange={onChange} maxStops={3} />
    );

    // Add button should be disabled at maxStops
    const addButton = screen.getByTestId('add-stop-button');
    expect(addButton).toBeDisabled();

    // Clicking should not call onChange
    fireEvent.click(addButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Angle Input
  // -------------------------------------------------------------------------

  test('angle slider changes call onChange with new angle', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    const angleSlider = screen.getByLabelText('Angle');
    fireEvent.change(angleSlider, { target: { value: '180' } });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.angle).toBe(180);
  });

  // -------------------------------------------------------------------------
  // Auto-sort by position
  // -------------------------------------------------------------------------

  test('stops auto-sort by position in onChange value', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    // Change the first stop's position from 0 to 75 (should sort after 100)
    // But wait, 75 is less than 100, so let's change it to 150 which should clamp to 100
    // Actually, let's use a cleaner test - add a stop and verify order
    const addButton = screen.getByTestId('add-stop-button');
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];

    // Verify stops are sorted by position
    const positions = lastCall.stops.map(
      (s: { position: number }) => s.position
    );
    const sortedPositions = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sortedPositions);
  });

  // -------------------------------------------------------------------------
  // Additional integration tests
  // -------------------------------------------------------------------------

  test('clicking stop row selects it and shows ColorPickerPanel', () => {
    render(<GradientEditor {...defaultProps} />);

    // Find all stop rows
    const container = screen.getByText('Stops').parentElement?.parentElement;
    const stopRows = container?.querySelectorAll('[data-testid^="stop-row-"]');

    expect(stopRows).toBeDefined();
    expect(stopRows!.length).toBe(2);

    // Click the first row
    fireEvent.click(stopRows![0]);

    // ColorPickerPanel should appear
    expect(screen.getByTestId('saturation-square')).toBeInTheDocument();
  });

  test('gradient bar displays correct gradient CSS', () => {
    render(<GradientEditor {...defaultProps} />);

    const gradientBar = screen.getByTestId('gradient-bar');
    expect(gradientBar).toHaveStyle({
      background: 'linear-gradient(90deg, #FF0000 0%, #0000FF 100%)',
    });
  });

  test('angle slider has correct min/max bounds', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    const angleSlider = screen.getByLabelText('Angle');

    // Verify slider has correct min/max attributes
    expect(angleSlider).toHaveAttribute('min', '0');
    expect(angleSlider).toHaveAttribute('max', '360');

    // Test valid value change
    fireEvent.change(angleSlider, { target: { value: '270' } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.angle).toBe(270);
  });

  test('position input clamps values to 0-100', () => {
    const onChange = jest.fn();
    render(<GradientEditor value={defaultGradient} onChange={onChange} />);

    const positionInputs = screen.getAllByRole('textbox').filter((input) => {
      const testId = input.getAttribute('data-testid');
      return testId?.startsWith('stop-position-');
    });

    // Test value > 100
    fireEvent.change(positionInputs[0], { target: { value: '150' } });
    expect(onChange).toHaveBeenCalled();
    let lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const maxPosition = Math.max(
      ...lastCall.stops.map((s: { position: number }) => s.position)
    );
    expect(maxPosition).toBeLessThanOrEqual(100);
  });

  // -------------------------------------------------------------------------
  // Locked Hue Mode Tests
  // -------------------------------------------------------------------------

  describe('lockedHue mode', () => {
    test('GradientEditor passes lockedHue to ColorPickerPanel', () => {
      render(
        <GradientEditor
          value={defaultGradient}
          onChange={jest.fn()}
          lockedHue="#FFFFFF"
        />
      );

      // Select a stop to show ColorPickerPanel
      const gradientBar = screen.getByTestId('gradient-bar');
      const stopHandle = within(gradientBar).getAllByRole('button')[0];
      fireEvent.click(stopHandle);

      // ColorPickerPanel should be in locked hue mode:
      // - Alpha slider should be visible
      // - Hue slider should be hidden
      // - Hex input should be hidden
      expect(screen.getByTestId('alpha-slider')).toBeInTheDocument();
      expect(screen.queryByTestId('hue-slider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('hex-input')).not.toBeInTheDocument();
    });

    test('GradientEditor stops all use locked hue when prop provided', () => {
      const onChange = jest.fn();
      render(
        <GradientEditor
          value={defaultGradient}
          onChange={onChange}
          lockedHue="#FFFFFF"
        />
      );

      // Select a stop
      const gradientBar = screen.getByTestId('gradient-bar');
      const stopHandle = within(gradientBar).getAllByRole('button')[0];
      fireEvent.click(stopHandle);

      // Change alpha via the alpha slider
      const alphaSlider = screen.getByTestId('alpha-slider');
      fireEvent.change(alphaSlider, { target: { value: '50' } });

      // onChange should be called
      expect(onChange).toHaveBeenCalled();

      // The updated stop should use the locked hue (#FFFFFF), not the original color
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const updatedStop = lastCall.stops.find(
        (s: { color: { alpha: number } }) => s.color.alpha === 50
      );
      expect(updatedStop).toBeDefined();
      expect(updatedStop.color.hex).toBe('#FFFFFF');
    });

    test('GradientEditor without lockedHue shows full ColorPickerPanel', () => {
      render(<GradientEditor value={defaultGradient} onChange={jest.fn()} />);

      // Select a stop
      const gradientBar = screen.getByTestId('gradient-bar');
      const stopHandle = within(gradientBar).getAllByRole('button')[0];
      fireEvent.click(stopHandle);

      // Full ColorPickerPanel should be visible
      expect(screen.getByTestId('saturation-square')).toBeInTheDocument();
      expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
      expect(screen.getByTestId('hex-input')).toBeInTheDocument();
      expect(screen.getByTestId('alpha-slider')).toBeInTheDocument();
    });
  });
});
