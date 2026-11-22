'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader } from './Loader';
import { cn } from '../utils/cn';

export interface ImageWithLoadStateProps {
  /** Image source URL */
  src?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Use Next.js Image fill layout */
  fill?: boolean;
  /** Responsive sizes attribute */
  sizes?: string;
  /** Priority loading (above the fold) */
  priority?: boolean;
  /** Additional classes for the image element */
  className?: string;
  /** Additional classes for the container wrapper */
  containerClassName?: string;
  /** Aspect ratio for the container (e.g., "4/3", "16/9") */
  aspectRatio?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** External loading state override */
  isLoading?: boolean;
}

/**
 * ImageWithLoadState - Reusable image component with loading states
 *
 * States:
 * - Empty: No src provided, shows placeholder icon
 * - Loading: Image is loading, shows spinner
 * - Error: Image failed to load, shows error icon
 * - Success: Image loaded, shows with fade-in animation
 *
 * This component extracts the canonical image loading pattern used across
 * cards (MediaCard, JournalCard, GalleryCard) into a reusable component.
 */
export function ImageWithLoadState({
  src,
  alt,
  fill = true,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  className = '',
  containerClassName = '',
  aspectRatio,
  onLoad,
  onError,
  isLoading: externalLoading,
}: ImageWithLoadStateProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const prevSrcRef = useRef(src);

  // Reset state when src changes
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      setImageLoaded(false);
      setImageError(false);
      prevSrcRef.current = src;
    }
  }, [src]);

  // Validate image URL
  const isValidImageUrl = (url?: string): boolean => {
    if (!url) return false;

    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }

    // Handle relative URLs, data URLs, or blob URLs
    if (
      url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return true;
    }

    // Accept URLs with typical image extensions
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif|svg)($|\?)/i.test(
      url
    );
    return hasImageExtension;
  };

  const validSrc = isValidImageUrl(src) ? src : undefined;

  // Loading state: external override takes precedence
  const isLoading =
    externalLoading !== undefined
      ? externalLoading
      : validSrc
        ? !imageLoaded && !imageError
        : false;

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Placeholder/error icon
  const PlaceholderIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-12 w-12 text-[var(--color-text-muted)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );

  // Build container style
  const containerStyle = aspectRatio ? { aspectRatio } : undefined;

  return (
    <div
      className={cn('relative w-full overflow-hidden', containerClassName)}
      style={containerStyle}
    >
      {/* Loading state: show spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader color="var(--color-accent)" size="sm" />
        </div>
      )}

      {/* Image with fade-in on load */}
      {validSrc && !imageError && (
        <Image
          src={validSrc}
          alt={alt}
          fill={fill}
          sizes={sizes}
          priority={priority}
          className={cn(
            'object-cover transition-opacity duration-500',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Error state: show error icon */}
      {validSrc && imageError && (
        <div className="absolute inset-0 z-5 flex items-center justify-center bg-[var(--color-surface-section)]">
          <PlaceholderIcon />
        </div>
      )}

      {/* Empty state: no src provided */}
      {!validSrc && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-section)]">
          <PlaceholderIcon />
        </div>
      )}
    </div>
  );
}
