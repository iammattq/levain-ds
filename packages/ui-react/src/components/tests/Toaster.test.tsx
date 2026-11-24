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

    // No class names of its own (T27): the toast-* classes were defined nowhere, so sonner's own styles always applied
    expect(mockToaster.getAttribute('data-options')).toBeNull();
  });
});
