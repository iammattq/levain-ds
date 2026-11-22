import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageWithLoadState } from '../ImageWithLoadState';

// Mock Next/Image
jest.mock('next/image', () => {
  return function MockNextImage({
    src,
    alt,
    fill,
    sizes,
    priority,
    className,
    onLoad,
    onError,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
  }) {
    return (
      <img
        src={src}
        alt={alt}
        data-fill={fill}
        data-sizes={sizes}
        data-priority={priority}
        className={className}
        onLoad={onLoad}
        onError={onError}
        data-testid="next-image"
      />
    );
  };
});

// Mock Loader
jest.mock('../Loader', () => ({
  Loader: ({ size, color }: { size: string; color: string }) => (
    <div data-testid="loader" data-size={size} data-color={color}>
      Loading...
    </div>
  ),
}));

describe('ImageWithLoadState', () => {
  describe('State Transitions', () => {
    test('empty state (no src) renders placeholder', () => {
      render(<ImageWithLoadState alt="Test image" />);

      // Should show placeholder icon, not loader or image
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
      expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
      // Should have placeholder SVG
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    test('loading state shows spinner', () => {
      render(<ImageWithLoadState src="/test.jpg" alt="Test image" />);

      // Before image loads, should show loader
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    test('error state shows error icon', () => {
      render(<ImageWithLoadState src="/test.jpg" alt="Test image" />);

      // Trigger error
      const image = screen.getByTestId('next-image');
      fireEvent.error(image);

      // Should show error icon (placeholder SVG)
      expect(document.querySelector('svg')).toBeInTheDocument();
      // Loader should be hidden
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });

    test('success state shows image with fade-in', () => {
      render(<ImageWithLoadState src="/test.jpg" alt="Test image" />);

      const image = screen.getByTestId('next-image');

      // Before load: opacity-0
      expect(image).toHaveClass('opacity-0');

      // Trigger load
      fireEvent.load(image);

      // After load: opacity-100
      expect(image).toHaveClass('opacity-100');
      // Loader should be hidden
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });

    test('fill={true} applies Next.js Image fill layout', () => {
      render(<ImageWithLoadState src="/test.jpg" alt="Test image" fill />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('data-fill', 'true');
    });

    test('aspectRatio prop applies container aspect ratio', () => {
      const { container } = render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          aspectRatio="16/9"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      // JSDOM doesn't support aspectRatio in computed styles, check style attribute
      expect(wrapper.style.aspectRatio).toBe('16/9');
    });

    test('className applies to image element', () => {
      render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          className="custom-image-class"
        />
      );

      const image = screen.getByTestId('next-image');
      expect(image).toHaveClass('custom-image-class');
    });

    test('containerClassName applies to wrapper', () => {
      const { container } = render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          containerClassName="custom-container-class"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-container-class');
    });
  });

  describe('Props and Edge Cases', () => {
    test('priority={true} passes to Next.js Image', () => {
      render(<ImageWithLoadState src="/test.jpg" alt="Test image" priority />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('data-priority', 'true');
    });

    test('sizes prop passes to Next.js Image', () => {
      const customSizes = '(max-width: 600px) 100vw, 50vw';
      render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          sizes={customSizes}
        />
      );

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('data-sizes', customSizes);
    });

    test('handles missing alt gracefully', () => {
      // alt is required, but component should handle empty string
      render(<ImageWithLoadState src="/test.jpg" alt="" />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', '');
    });

    test('rapid src changes reset state correctly', () => {
      const { rerender } = render(
        <ImageWithLoadState src="/first.jpg" alt="Test image" />
      );

      const firstImage = screen.getByTestId('next-image');
      fireEvent.load(firstImage);
      expect(firstImage).toHaveClass('opacity-100');

      // Change src
      rerender(<ImageWithLoadState src="/second.jpg" alt="Test image" />);

      const secondImage = screen.getByTestId('next-image');
      // Should reset to loading state (opacity-0)
      expect(secondImage).toHaveClass('opacity-0');
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    test('onLoad callback is called on successful load', () => {
      const handleLoad = jest.fn();
      render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          onLoad={handleLoad}
        />
      );

      const image = screen.getByTestId('next-image');
      fireEvent.load(image);

      expect(handleLoad).toHaveBeenCalledTimes(1);
    });

    test('onError callback is called on load failure', () => {
      const handleError = jest.fn();
      render(
        <ImageWithLoadState
          src="/test.jpg"
          alt="Test image"
          onError={handleError}
        />
      );

      const image = screen.getByTestId('next-image');
      fireEvent.error(image);

      expect(handleError).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL Validation', () => {
    test('validates absolute URLs', () => {
      render(
        <ImageWithLoadState src="https://example.com/image.jpg" alt="Test" />
      );
      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    test('validates relative URLs starting with /', () => {
      render(<ImageWithLoadState src="/images/test.jpg" alt="Test" />);
      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    test('validates data URLs', () => {
      render(
        <ImageWithLoadState src="data:image/png;base64,abc123" alt="Test" />
      );
      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    test('validates blob URLs', () => {
      render(
        <ImageWithLoadState src="blob:http://example.com/123" alt="Test" />
      );
      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    test('rejects invalid URLs and shows placeholder', () => {
      render(<ImageWithLoadState src="not-a-valid-url" alt="Test" />);
      expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('External Loading State', () => {
    test('isLoading={true} shows loader regardless of image state', () => {
      render(
        <ImageWithLoadState src="/test.jpg" alt="Test" isLoading={true} />
      );

      // Should show loader due to external override
      expect(screen.getByTestId('loader')).toBeInTheDocument();

      // Even after load, if isLoading is true externally, show loader
      const image = screen.getByTestId('next-image');
      fireEvent.load(image);
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    test('isLoading={false} hides loader even before image loads', () => {
      render(
        <ImageWithLoadState src="/test.jpg" alt="Test" isLoading={false} />
      );

      // External isLoading=false should override internal loading state
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
  });
});
