import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GradientInput from '../GradientInput';

class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// the editor itself isn't under test here
jest.mock('../../patterns/GradientEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="gradient-editor" />,
  gradientToCss: () => 'linear-gradient(90deg, #000, #fff)',
}));

const value = {
  angle: 90,
  stops: [
    { id: 'a', color: '#000000', alpha: 100, position: 0 },
    { id: 'b', color: '#FFFFFF', alpha: 100, position: 100 },
  ],
};

// D13: the picker opened near the left edge stays on screen
describe('GradientInput: where the picker opens (D13)', () => {
  const openAt = (triggerLeft: number) => {
    const rect = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ left: triggerLeft, right: triggerLeft + 32, top: 100, bottom: 132, width: 32, height: 32, x: triggerLeft, y: 100, toJSON() {} } as DOMRect);
    const width = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(280);
    render(<GradientInput id="g" label="Fill" value={value as never} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Fill gradient' }));
    const dialog = screen.getByRole('dialog');
    rect.mockRestore();
    width.mockRestore();
    return dialog;
  };

  test('to the left of a swatch with room on its left', () => {
    expect(openAt(600).style.left).toBe('312px');
  });

  test('to the right of a swatch near the left edge, on screen', () => {
    const dialog = openAt(20);
    expect(dialog.style.left).toBe('60px');
    expect(dialog.style.right).toBe('');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T54). The mocked editor offers
// one change: angle 45.
describe('GradientInput: form-input convention', () => {
  const EditorMock = jest.requireMock('../../patterns/GradientEditor') as { default: jest.Mock | unknown };
  beforeAll(() => {
    EditorMock.default = ({ value: v, onChange }: { value: typeof value; onChange: (g: typeof value) => void }) => (
      <div data-testid="gradient-editor">
        <span data-testid="angle">{v.angle}</span>
        <button type="button" onClick={() => onChange({ ...v, angle: 45 })}>
          Turn
        </button>
      </div>
    );
  });
  const open = (name = 'Edit Fill gradient') => fireEvent.click(screen.getByRole('button', { name }));

  test('value and change: onChange(gradient), value first', () => {
    const onChange = jest.fn();
    render(<GradientInput label="Fill" value={value as never} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
    expect(onChange).toHaveBeenCalledWith({ ...value, angle: 45 });
  });

  test('controlled: shows only what value says', () => {
    render(<GradientInput label="Fill" value={value as never} onChange={() => {}} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
    expect(screen.getByTestId('angle')).toHaveTextContent('90');
    expect(screen.getByText('90°, 2 stops')).toBeInTheDocument();
  });

  test('uncontrolled: defaultValue (else black to white at 90°), then its own state; onChange still fires', () => {
    const onChange = jest.fn();
    const { unmount } = render(<GradientInput label="Fill" defaultValue={value as never} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
    expect(screen.getByText('45°, 2 stops')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
    unmount();
    render(<GradientInput label="Fill" />);
    expect(screen.getByText('90°, 2 stops')).toBeInTheDocument();
  });

  test("errors (Q-touched): the app's error shows at once; touched={false} holds it; none while disabled", () => {
    const { rerender } = render(<GradientInput id="g" label="Fill" value={value as never} error="Too dark" helperText="Two stops" />);
    expect(screen.getByText('Too dark')).toHaveAttribute('id', 'g-error');
    expect(screen.getByRole('button', { name: 'Edit Fill gradient' })).toHaveAttribute('aria-describedby', 'g-error');
    expect(screen.queryByText('Two stops')).not.toBeInTheDocument();
    rerender(<GradientInput id="g" label="Fill" value={value as never} error="Too dark" helperText="Two stops" touched={false} />);
    expect(screen.queryByText('Too dark')).not.toBeInTheDocument();
    rerender(<GradientInput id="g" label="Fill" value={value as never} error="Too dark" helperText="Two stops" disabled />);
    expect(screen.queryByText('Too dark')).not.toBeInTheDocument();
    expect(screen.getByText('Two stops')).toBeInTheDocument();
  });

  test('size: the scale names, compact a deprecated alias for xs', () => {
    const chip = () => screen.getByRole('button', { name: 'Edit Fill gradient' }).className;
    const { rerender } = render(<GradientInput label="Fill" value={value as never} size="lg" />);
    const lg = chip();
    rerender(<GradientInput label="Fill" value={value as never} compact />);
    const xs = chip();
    rerender(<GradientInput label="Fill" value={value as never} size="xs" />);
    expect(chip()).toBe(xs);
    expect(xs).not.toBe(lg);
  });

  test('ref, id and passthrough on the chip, its focusable root', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const onFocus = jest.fn();
    render(<GradientInput ref={ref} id="g" label="Fill" value={value as never} data-x="1" onFocus={onFocus} aria-describedby="note" helperText="Hint" />);
    const chip = screen.getByRole('button', { name: 'Edit Fill gradient' });
    expect(ref.current).toBe(chip);
    expect(chip).toHaveAttribute('id', 'g');
    expect(chip).toHaveAttribute('data-x', '1');
    expect(chip).toHaveAttribute('aria-describedby', 'note g-helper');
    fireEvent.focus(chip);
    expect(onFocus).toHaveBeenCalled();
  });

  test('id optional with a useId fallback; label optional, aria-label reaches the chip', () => {
    render(<GradientInput aria-label="Background" value={value as never} />);
    const chip = screen.getByRole('button', { name: 'Background' });
    expect(chip.id).not.toBe('');
  });

  test('disabled: native disabled on the chip; no editor opens', () => {
    render(<GradientInput label="Fill" value={value as never} disabled />);
    const chip = screen.getByRole('button', { name: 'Edit Fill gradient' });
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    fireEvent.click(screen.getByText('90°, 2 stops'));
    expect(screen.queryByTestId('gradient-editor')).not.toBeInTheDocument();
  });

  test('className on the root with cn; the chip has the keyboard ring', () => {
    const { container } = render(<GradientInput label="Fill" value={value as never} className="w-40" />);
    expect(container.firstChild).toHaveClass('w-40');
    const chip = screen.getByRole('button', { name: 'Edit Fill gradient' });
    expect(chip.className).toContain('focus-visible:ring-[var(--color-border-focus)]');
    expect(chip.className).toContain('focus-visible:ring-offset-[var(--color-surface-canvas)]');
  });
});
