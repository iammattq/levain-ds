'use client';

import { ReactNode } from 'react';

export interface CardMediaProps {
  children: ReactNode;
  aspectRatio?: string;
  className?: string;
}

export default function CardMedia({
  children,
  aspectRatio = 'aspect-[4/3]',
  className = '',
}: CardMediaProps) {
  // If aspectRatio is 'h-full', use flex-1 to fill available space
  const isFullHeight = aspectRatio === 'h-full';
  const heightClass = isFullHeight ? 'flex-1 min-h-0' : aspectRatio;

  return (
    <div
      className={`relative ${heightClass} w-full overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
