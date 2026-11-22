import { Image } from '../provider/LevainProvider';
import React from 'react';
import { cn } from '../utils/cn';

// Define size mapping
const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 84,
};

// Define the type for the size prop keys
type AvatarSize = keyof typeof sizeMap | 'custom';

export interface AvatarProps {
  /**
   * The source URL for the avatar image.
   */
  src: string;
  /**
   * Alt text for the avatar image, crucial for accessibility.
   */
  alt: string;
  /**
   * Predefined avatar size ('xs': 24px, 'sm': 32px, 'md': 48px, 'lg': 64px, 'xl': 84px) or 'custom' to use customSize.
   * @default 'lg'
   */
  size?: AvatarSize; // Use the defined type
  /**
   * The size in pixels when size prop is set to 'custom'.
   * @default 64
   */
  customSize?: number;
  /**
   * Optional className to apply to the outer wrapper div.
   */
  className?: string;
  /**
   * Optional className to apply directly to the image component (LevainProvider's imageComponent).
   */
  imageClassName?: string;
  /**
   * Whether to display the gradient border around the avatar.
   * @default true
   */
  showBorder?: boolean;
}

/**
 * Renders a circular avatar image, optionally with a decorative gradient border.
 */
export function Avatar({
  src,
  alt,
  size = 'lg', // Default to string 'lg'
  customSize = 64, // Default custom size
  className,
  imageClassName,
  showBorder = true,
}: AvatarProps) {
  // Determine the final pixel size
  const pixelSize =
    size === 'custom'
      ? customSize
      : (sizeMap[size as keyof typeof sizeMap] ?? sizeMap.lg); // Fallback to lg if invalid string

  const wrapperClasses = cn(
    'inline-block rounded-full shadow-[var(--elevation-1)]',
    showBorder &&
      'bg-radial-[at_25%_25%] from-[var(--color-base)] to-[var(--color-accent)] p-0.5',
    className
  );

  const imageClasses = cn('rounded-full object-cover', imageClassName);

  return (
    // Use calculated pixelSize for width/height
    <div
      className={wrapperClasses}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <div className="h-full w-full overflow-hidden rounded-full">
        <Image
          src={src}
          alt={alt}
          // Use calculated pixelSize
          width={pixelSize}
          height={pixelSize}
          className={imageClasses}
          // Add priority if this avatar is likely above the fold
          // priority={true}
        />
      </div>
    </div>
  );
}
