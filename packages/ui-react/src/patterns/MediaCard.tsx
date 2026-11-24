'use client';

import { Image } from '../provider/LevainProvider';
import { useState } from 'react';
import { Card } from '../components/Card';
import CardMedia from '../components/CardMedia';
import CardContent from '../components/CardContent';
import CardTitle from '../components/CardTitle';
import { Loader } from '../components/Loader';

export interface MediaCardProps {
  title: string;
  href: string;
  imageSrc?: string;
  subtitle?: string;
  aspectRatio?: string;
  className?: string;
  imageClassName?: string;
  onCardClick?: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  onImageLoad?: () => void;
}

export function MediaCard({
  title,
  href,
  imageSrc,
  subtitle,
  aspectRatio = 'aspect-[4/3]',
  className = '',
  imageClassName = '',
  onCardClick,
  isLoading: externalLoading,
  onImageLoad,
}: MediaCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Validate image URL - improved to handle relative URLs
  const isValidImageUrl = (url?: string) => {
    if (!url) return false;

    // Handle absolute URLs with typical protocols
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return true;
      } catch (e) {
        console.error('Invalid absolute image URL in MediaCard:', url, e);
        return false;
      }
    }

    // Handle relative URLs (starting with / or ./), data URLs, or blob URLs
    if (
      url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return true;
    }

    // Fall back to accepting the URL if it has typical image extensions
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif|svg)($|\?)/i.test(
      url
    );
    return hasImageExtension;
  };

  const validImageSrc = isValidImageUrl(imageSrc) ? imageSrc : undefined;

  // Loading state can be controlled externally or by internal image loading state
  const isLoading =
    externalLoading !== undefined
      ? externalLoading
      : validImageSrc
        ? !imageLoaded && !imageError
        : false;

  const handleImageLoad = () => {
    setImageLoaded(true);
    onImageLoad?.();
  };

  return (
    <Card href={href} className={className} onClick={onCardClick}>
      <CardMedia aspectRatio={aspectRatio}>
        {/* Loader - always shown when loading */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader color="var(--color-accent)" size="sm" />
          </div>
        )}

        {/* Image - always render if we have a valid source, but control visibility with CSS */}
        {validImageSrc && (
          <>
            {/* Fallback for image error */}
            {imageError && (
              <div className="absolute inset-0 z-5 flex items-center justify-center bg-[var(--color-surface-section)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-[var(--color-text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            <Image
              src={validImageSrc}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`z-1 object-cover transition-all duration-500 md:group-hover:scale-102 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${imageClassName}`}
              onLoad={handleImageLoad}
              onError={() => setImageError(true)}
              priority={true}
            />
          </>
        )}

        {/* Fallback empty state - only show if no valid image, not loading, and image hasn't loaded */}
        {!validImageSrc && !isLoading && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-section)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-[var(--color-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </CardMedia>

      <CardContent padding="md">
        <CardTitle title={title} subtitle={subtitle} />
      </CardContent>
    </Card>
  );
}
