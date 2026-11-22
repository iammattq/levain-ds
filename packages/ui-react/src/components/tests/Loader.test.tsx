import React from 'react';
import { render } from '@testing-library/react';
import { Loader } from '../Loader';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    div: jest
      .fn()
      .mockImplementation(({ className, style, children, ...props }) => (
        <div
          className={className}
          style={style}
          data-testid="motion-div"
          data-framer-animation-props={JSON.stringify(props)}
        >
          {children}
        </div>
      )),
  },
}));

describe('Loader Component', () => {
  // Test basic rendering
  test('renders correctly with three bouncing dots', () => {
    const { getAllByTestId } = render(<Loader />);

    // Check that we have 3 motion divs (dots)
    const dots = getAllByTestId('motion-div');
    expect(dots).toHaveLength(3);
  });

  // Test size variations
  test.each(['sm', 'md', 'lg'] as const)(
    'renders with correct size classes for %s size',
    (size) => {
      const { getAllByTestId } = render(<Loader size={size} />);

      const dots = getAllByTestId('motion-div');

      // Check for the correct size class on each dot
      const expectedClass =
        size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

      dots.forEach((dot) => {
        expect(dot.className).toContain(expectedClass);
      });
    }
  );

  // Test default size
  test('uses medium size by default', () => {
    const { getAllByTestId } = render(<Loader />);

    const dots = getAllByTestId('motion-div');

    // Default size should be md (w-3 h-3)
    dots.forEach((dot) => {
      expect(dot.className).toContain('w-3 h-3');
    });
  });

  // Test custom color
  test('applies custom color to dots', () => {
    const customColor = '#ff0000';
    const { getAllByTestId } = render(<Loader color={customColor} />);

    const dots = getAllByTestId('motion-div');

    // Check that each dot has the custom background color
    dots.forEach((dot) => {
      expect(dot).toHaveStyle({ backgroundColor: customColor });
    });
  });

  // Test default color
  test('uses default color when color prop is not provided', () => {
    const { getAllByTestId } = render(<Loader />);

    const dots = getAllByTestId('motion-div');

    // Default color should be var(--color-primary)
    dots.forEach((dot) => {
      expect(dot).toHaveStyle({ backgroundColor: 'var(--color-primary)' });
    });
  });

  // Test custom className
  test('applies custom className to container', () => {
    const customClass = 'custom-loader-class';
    const { container } = render(<Loader className={customClass} />);

    // The main container should have our custom class
    const loaderContainer = container.firstChild;
    expect(loaderContainer).toHaveClass(customClass);

    // Should also have the default classes
    expect(loaderContainer).toHaveClass('flex');
    expect(loaderContainer).toHaveClass('space-x-2');
  });

  // Test animation properties
  test('sets up animation correctly for each dot', () => {
    const { getAllByTestId } = render(<Loader />);

    const dots = getAllByTestId('motion-div');

    // Each dot should have animation and transition properties
    dots.forEach((dot, index) => {
      const animationProps = JSON.parse(
        dot.getAttribute('data-framer-animation-props') || '{}'
      );

      // Check animation property
      expect(animationProps.animate).toBeDefined();
      expect(animationProps.animate.y).toEqual(['0%', '-50%', '0%']);

      // Check transition property with allowance for JSON serialization issues
      expect(animationProps.transition).toBeDefined();
      expect(animationProps.transition.duration).toBe(0.8);
      // Infinity doesn't serialize to JSON properly, so we don't test for exact equality
      expect(animationProps.transition.ease).toBe('easeInOut');

      // Check that each dot has an increasing delay
      expect(animationProps.transition.delay).toBe(index * 0.2);
    });
  });
});
