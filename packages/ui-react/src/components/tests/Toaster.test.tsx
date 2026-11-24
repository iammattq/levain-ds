import React from 'react';
import { render } from '@testing-library/react';
import { Toaster } from '../Toaster';

// Mock sonner library
jest.mock('sonner', () => ({
  Toaster: jest.fn(({ position, toastOptions }) => (
    <div
      data-testid="mock-sonner-toaster"
      data-position={position}
      data-options={JSON.stringify(toastOptions)}
    >
      Sonner Toaster
    </div>
  )),
}));

describe('Toaster Component', () => {
  test('renders Sonner Toaster component with correct props', () => {
    const { getByTestId } = render(<Toaster />);

    const mockToaster = getByTestId('mock-sonner-toaster');

    // Check position
    expect(mockToaster).toHaveAttribute('data-position', 'bottom-center');

    // Check that toast options have correct class names
    const toastOptions = JSON.parse(
      mockToaster.getAttribute('data-options') || '{}'
    );

    expect(toastOptions).toHaveProperty('classNames');
    expect(toastOptions.classNames).toHaveProperty('toast', 'toast-base');
    expect(toastOptions.classNames).toHaveProperty('success', 'toast-success');
    expect(toastOptions.classNames).toHaveProperty('error', 'toast-error');
    expect(toastOptions.classNames).toHaveProperty('warning', 'toast-warning');
    expect(toastOptions.classNames).toHaveProperty('info', 'toast-info');
  });
});
