import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const switchInput = screen.getByRole('switch');
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
    const switchInput = screen.getByRole('switch');
    expect(switchInput).not.toBeChecked();

    // Rerender with checked=true
    rerender(<Switch {...defaultProps} checked={true} />);
    expect(switchInput).toBeChecked();
  });

  // Test onChange callback
  test('calls onChange when clicked', () => {
    const onChange = jest.fn();
    render(<Switch {...defaultProps} onChange={onChange} />);

    const switchInput = screen.getByRole('switch');
    fireEvent.click(switchInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  // Test disabled state
  test('disables the switch when disabled prop is true', () => {
    render(<Switch {...defaultProps} disabled={true} />);

    const switchInput = screen.getByRole('switch');
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

    const switchInput = screen.getByRole('switch');
    expect(switchInput).toHaveAttribute('id', 'test-switch');

    // Label should be connected to input via htmlFor
    const label = screen.getByText('Accessible Switch');
    expect(label.closest('label')).toHaveAttribute('for', 'test-switch');

    // Should have focus styles
    const switchTrack = switchInput.nextElementSibling;
    expect(switchTrack).toHaveClass('peer-focus-visible:ring-2');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 fixes (T35)
describe('Switch: form-input convention', () => {
  test('role="switch", named by its label (A3: it had no switch role)', () => {
    render(<Switch checked={false} onChange={() => {}} label="Wi-Fi" />);
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).not.toBeChecked();
  });

  test('aria-label names it when there is no visible label (A3: it took none)', () => {
    render(<Switch checked onChange={() => {}} aria-label="Notifications" />);
    expect(screen.getByRole('switch', { name: 'Notifications' })).toBeChecked();
  });

  test('an outside <label htmlFor> names it, as the board does', () => {
    render(
      <>
        <label htmlFor="n">Notifications</label>
        <Switch id="n" size="sm" checked={false} onChange={() => {}} />
      </>
    );
    expect(
      screen.getByRole('switch', { name: 'Notifications' })
    ).toBeInTheDocument();
  });

  test('value and change: onChange(checked), value first', () => {
    const onChange = jest.fn();
    render(<Switch checked onChange={onChange} aria-label="S" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test('controlled: stays as checked says until the parent changes it', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="S" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  test('uncontrolled: defaultChecked, then its own state; onChange still fires', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Switch defaultChecked aria-label="S" onChange={onChange} />
    );
    const sw = screen.getByRole('switch');
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    expect(sw).not.toBeChecked();
    expect(onChange).toHaveBeenCalledWith(false);
    expect(container.querySelector('div[class*="rounded-full"]')).toHaveClass(
      'bg-[var(--color-surface-card)]'
    );
  });

  test('keyboard: Space toggles (native checkbox)', async () => {
    const onChange = jest.fn();
    render(
      <Switch defaultChecked={false} onChange={onChange} aria-label="S" />
    );
    await userEvent.tab();
    expect(screen.getByRole('switch')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('ref: the native input', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Switch ref={ref} aria-label="S" />);
    expect(ref.current).toBe(screen.getByRole('switch'));
  });

  test('disabled: native disabled, no onChange', () => {
    const onChange = jest.fn();
    render(<Switch disabled onChange={onChange} aria-label="S" />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeDisabled();
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('id: optional, generated; the label still names it', () => {
    render(<Switch label="Dark" />);
    expect(screen.getByRole('switch', { name: 'Dark' }).id).toBeTruthy();
  });

  test('passthrough: name and data-* reach the input; className the root', () => {
    render(<Switch aria-label="S" name="dark" data-x="1" className="ml-2" />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('name', 'dark');
    expect(sw).toHaveAttribute('data-x', '1');
    expect(sw.closest('label')).toHaveClass('ml-2', 'inline-flex');
  });

  test('focus: the keyboard ring (focus-visible, border-focus)', () => {
    render(<Switch aria-label="S" />);
    expect(screen.getByRole('switch').nextElementSibling).toHaveClass(
      'peer-focus-visible:ring-2',
      'peer-focus-visible:ring-[var(--color-border-focus)]'
    );
  });
});
