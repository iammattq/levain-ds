import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MediaCard } from '../MediaCard';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const image = (() => {
  return function NextImage({
    src,
    alt,
    onLoad,
    onError,
    className,
    fill,
    priority,
    ...props
  }: {
    src: string;
    alt: string;
    onLoad?: () => void;
    onError?: () => void;
    className?: string;
    fill?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  }) {
    // Convert boolean attributes to strings to avoid DOM warnings
    const domProps = {
      ...props,
      fill: fill ? 'true' : undefined,
      priority: priority ? 'true' : undefined,
    };

    return (
      // This is a mock for testing only
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        className={className}
        data-testid="next-image"
        data-fill={fill ? 'true' : undefined}
        data-priority={priority ? 'true' : undefined}
        {...domProps}
      />
    );
  };
})();
  return { ...actual, Image: image.default ?? image };
});

// Mock Next/Image

// Mock design system components
jest.mock('../../components/Card', () => ({
  Card: ({
    children,
    href,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      <a href={href} data-testid="card-link">
        {children}
      </a>
    </div>
  ),
}));
jest.mock('../../components/CardMedia', () => ({
  __esModule: true,
  default: ({
    children,
    aspectRatio,
  }: {
    children: React.ReactNode;
    aspectRatio?: string;
  }) => (
    <div data-testid="card-media" data-aspect-ratio={aspectRatio}>
      {children}
    </div>
  ),
}));
jest.mock('../../components/CardContent', () => ({
  __esModule: true,
  default: ({
    children,
    padding,
  }: {
    children: React.ReactNode;
    padding?: string;
  }) => (
    <div data-testid="card-content" data-padding={padding}>
      {children}
    </div>
  ),
}));
jest.mock('../../components/CardTitle', () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="card-title">
      <h3 data-testid="title">{title}</h3>
      {subtitle && <div data-testid="subtitle">{subtitle}</div>}
    </div>
  ),
}));
jest.mock('../../components/Loader', () => ({
  Loader: ({ color, size }: { color?: string; size?: string }) => (
    <div data-testid="loader" data-color={color} data-size={size}>
      Loading...
    </div>
  ),
}));

describe('MediaCard Pattern', () => {
  const defaultProps = {
    title: 'Test Card',
    href: '/test-link',
    imageSrc: 'https://example.com/image.jpg',
  };

  test('renders the card with correct title and link', () => {
    render(<MediaCard {...defaultProps} />);

    expect(screen.getByTestId('title')).toHaveTextContent('Test Card');
    expect(screen.getByTestId('card-link')).toHaveAttribute(
      'href',
      '/test-link'
    );
  });

  test('renders the subtitle when provided', () => {
    render(<MediaCard {...defaultProps} subtitle="Test subtitle" />);

    expect(screen.getByTestId('subtitle')).toHaveTextContent('Test subtitle');
  });

  test('applies custom aspect ratio correctly', () => {
    render(<MediaCard {...defaultProps} aspectRatio="aspect-square" />);

    expect(screen.getByTestId('card-media')).toHaveAttribute(
      'data-aspect-ratio',
      'aspect-square'
    );
  });

  test('applies custom className correctly', () => {
    render(<MediaCard {...defaultProps} className="custom-class" />);

    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  test('applies custom imageClassName correctly', () => {
    render(<MediaCard {...defaultProps} imageClassName="custom-image-class" />);

    const image = screen.getByTestId('next-image');
    expect(image.className).toContain('custom-image-class');
  });

  test('calls onCardClick handler when card is clicked', () => {
    const onCardClick = jest.fn();
    render(<MediaCard {...defaultProps} onCardClick={onCardClick} />);

    fireEvent.click(screen.getByTestId('card'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  test('calls onImageLoad when image loads', () => {
    const onImageLoad = jest.fn();
    render(<MediaCard {...defaultProps} onImageLoad={onImageLoad} />);

    const image = screen.getByTestId('next-image');
    fireEvent.load(image);

    expect(onImageLoad).toHaveBeenCalledTimes(1);
  });

  test('shows loader when in loading state', () => {
    render(<MediaCard {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  test('validates image URL and rejects invalid ones', () => {
    // Test with invalid URL
    render(
      <MediaCard title="Test Card" href="/test-link" imageSrc="invalid-url" />
    );

    // Since URL validation would fail, we shouldn't see an image
    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
  });

  test('shows fallback UI when no valid image is provided', () => {
    render(<MediaCard title="Test Card" href="/test-link" />);

    // We should see the fallback SVG container
    const fallbackDiv = screen.getByTestId('card-media').querySelector('div');
    expect(fallbackDiv).toBeInTheDocument();
  });

  test('handles image load error and shows fallback', () => {
    render(<MediaCard {...defaultProps} />);

    const image = screen.getByTestId('next-image');
    fireEvent.error(image);

    // After error, we should see the error fallback
    const errorSvg = screen.getByTestId('card-media').querySelector('svg');
    expect(errorSvg).toBeInTheDocument();
  });

  test('accepts relative URLs for images', () => {
    render(
      <MediaCard
        title="Test Card"
        href="/test-link"
        imageSrc="/images/test.jpg"
      />
    );

    // Should render the image with the relative URL
    const image = screen.getByTestId('next-image');
    expect(image).toHaveAttribute('src', '/images/test.jpg');
  });
});
