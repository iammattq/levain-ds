import React from 'react';
import { render } from '@testing-library/react';
import { LinkedinIcon } from '../icons';

describe('Icon Components', () => {
  // Test LinkedinIcon rendering and properties
  describe('LinkedinIcon', () => {
    test('renders correctly with default props', () => {
      const { container } = render(<LinkedinIcon />);

      const iconElement = container.querySelector('svg');
      expect(iconElement).toBeInTheDocument();

      // Check default size
      expect(iconElement).toHaveAttribute('width', '16');
      expect(iconElement).toHaveAttribute('height', '16');

      // Check default class
      expect(iconElement).toHaveAttribute('class');
      const classAttribute = iconElement?.getAttribute('class') || '';
      expect(classAttribute).toContain('fill-[var(--color-text-default)]');
    });

    test('applies custom size when provided', () => {
      const { container } = render(<LinkedinIcon size={24} />);

      const iconElement = container.querySelector('svg');
      expect(iconElement).toHaveAttribute('width', '24');
      expect(iconElement).toHaveAttribute('height', '24');
    });

    test('applies custom className when provided', () => {
      const { container } = render(<LinkedinIcon className="text-red-500" />);

      const iconElement = container.querySelector('svg');
      expect(iconElement).toHaveAttribute('class');
      const classAttribute = iconElement?.getAttribute('class') || '';

      expect(classAttribute).toContain('text-red-500');
      expect(classAttribute).toContain('fill-[var(--color-text-default)]');
    });

    test('renders with correct viewBox and structure', () => {
      const { container } = render(<LinkedinIcon />);

      const iconElement = container.querySelector('svg');
      expect(iconElement).toHaveAttribute('viewBox', '0 0 24 24');
      expect(iconElement).toHaveAttribute(
        'xmlns',
        'http://www.w3.org/2000/svg'
      );

      // Should have path elements
      const pathElements = container.querySelectorAll('path');
      expect(pathElements.length).toBeGreaterThan(0);
    });
  });
});
