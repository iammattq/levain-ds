'use client';

import { ReactNode } from 'react';
import { cn } from '../utils/cn';

// Define padding sizes (kept here for now, consider moving to a shared location)
const paddingSizes = {
  none: '',
  sm: 'p-2 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-12',
};

export interface CardContentProps {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof paddingSizes;
}

export default function CardContent({
  children,
  className = '',
  padding = 'md',
}: CardContentProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 bg-[var(--color-surface-card)] transition-all duration-300 group-hover:bg-[var(--color-surface-section)]',
        paddingSizes[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
