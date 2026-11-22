'use client';

import { useState } from 'react';
import type { ReactNode, MouseEvent, CSSProperties } from 'react';
import Link from 'next/link';
import { cn } from '../utils/cn';

export interface CardProps {
  href?: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

// Base styles for the card container (div)
const cardContainerBaseStyles =
  'card rounded-lg overflow-hidden flex flex-col [--card-surface:linear-gradient(150deg,var(--color-surface-23),var(--color-surface-21))] dark:[--card-surface:linear-gradient(150deg,var(--color-surface-6),var(--color-surface-3))]';

const baseSurfaceStyle: CSSProperties = {
  background: 'var(--card-surface)',
};

// Resting + pressed styles for the link variant. Driven by React state so
// the transition has concrete start/end values on the same property — using
// CSS :hover with Tailwind classes was snapping instead of easing.
const pressTransition = 'transform 150ms ease-out, box-shadow 150ms ease-out';

const cardLinkStyles = 'block';

/**
 * @deprecated Use SurfaceCard instead.
 *
 * SurfaceCard provides gradient presets, configurable shadows, and selection states.
 * Migrate to SurfaceCard with `preset="flat"` for similar appearance.
 *
 * @example
 * // Before:
 * <Card href="/page">Content</Card>
 *
 * // After:
 * <SurfaceCard preset="flat" href="/page">Content</SurfaceCard>
 */
export function Card({ href, children, className = '', onClick }: CardProps) {
  const [hovered, setHovered] = useState(false);

  // If href is provided, render the Link variant with the press hover effect
  if (href) {
    return (
      <Link
        href={href}
        className={cn(cardLinkStyles, className)}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={cn(cardContainerBaseStyles, 'h-full')}
          style={{
            ...baseSurfaceStyle,
            boxShadow: hovered ? 'none' : 'var(--elevation-2)',
            transform: hovered ? 'translateY(1px)' : 'translateY(0)',
            transition: pressTransition,
          }}
        >
          {children}
        </div>
      </Link>
    );
  }

  // Static div variant (no hover effect)
  return (
    <div
      className={cn(
        cardContainerBaseStyles,
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        ...baseSurfaceStyle,
        boxShadow: 'var(--elevation-2)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
