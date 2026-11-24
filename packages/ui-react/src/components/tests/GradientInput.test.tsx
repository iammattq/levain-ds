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
