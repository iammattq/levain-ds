'use client';

import { ease } from '@levain/tokens';
import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type SkeletonShape = 'line' | 'block' | 'circle';

export interface SkeletonProps extends Omit<
    HTMLAttributes<HTMLDivElement>,
    // framer-motion's own meanings of these clash with the DOM's; a placeholder needs neither
    'children' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  > {
  /**
   * line: a text line (4 px corner; 1em tall, full width unless set). block: a box (8 px corner; full width, the
   * height is yours: `height` or an aspect class). circle: an avatar (round; 2.5rem unless set, height follows width).
   */
  shape?: SkeletonShape;
  /** A number is px; a string is any CSS length. */
  width?: number | string;
  /** A number is px; a string is any CSS length. */
  height?: number | string;
}

const RADIUS: Record<SkeletonShape, string> = {
  line: 'rounded-[var(--radius-sm)]',
  block: 'rounded-[var(--radius-lg)]',
  circle: 'rounded-[var(--radius-full)]',
};

const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v);

function size(shape: SkeletonShape, width?: number | string, height?: number | string): CSSProperties {
  if (shape === 'circle') {
    const w = len(width) ?? '2.5rem';
    return { width: w, height: len(height) ?? w, flexShrink: 0 };
  }
  return { width: len(width) ?? '100%', height: len(height) ?? (shape === 'line' ? '1em' : undefined) };
}

/**
 * A placeholder shape while content loads: a block on the section surface that pulses softly (still under Reduce
 * Motion). Hidden from screen readers; wrap the shapes in a SkeletonGroup to say "Loading".
 */
export function Skeleton({ shape = 'block', width, height, className, style, ...rest }: SkeletonProps) {
  const reduce = useReducedMotion();
  const props = {
    ...rest,
    'aria-hidden': true,
    'data-skeleton': shape,
    className: `bg-[var(--color-surface-section)] ${RADIUS[shape]}${className ? ` ${className}` : ''}`,
    style: { ...size(shape, width, height), ...style },
  };
  if (reduce) return <div {...props} />;
  return (
    <motion.div
      {...props}
      animate={{ opacity: [1, 0.5, 1] }}
      // motion: continuous indicator, exempt from the size scale (assembly.json, motion-from-tokens); 2 s is the
      // portfolio explorer's pulse
      transition={{ duration: 2, ease: [...ease.springOut], repeat: Infinity }}
    />
  );
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** What is loading, read by screen readers in place of the shapes. */
  label?: string;
  children: ReactNode;
}

/**
 * The loading region: lays out its shapes (className) and gives screen readers one polite status line, `label`,
 * where the shapes say nothing. Replace it with the content when it arrives.
 */
export function SkeletonGroup({ label = 'Loading', children, ...rest }: SkeletonGroupProps) {
  return (
    <div {...rest}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  );
}
