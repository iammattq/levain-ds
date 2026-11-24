import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

// T8: two layout primitives, so a vertical or wrapping-row arrangement isn't hand-written from Tailwind each time.
// Stack: children in a column. Cluster: children in a row that wraps. Both space their children with a gap from the
// spacing scale (--spacing-2xs ... --spacing-xl), never margins, so a hidden or conditional child leaves no hole.

/** A step on the spacing scale: 2xs 8px, xs 12px, sm 16px, md 24px, lg 32px, xl 48px. */
export type Space = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Literal per step so Tailwind sees each class. */
export const gapClass: Record<Space, string> = {
  '2xs': 'gap-2xs',
  xs: 'gap-xs',
  sm: 'gap-sm',
  md: 'gap-md',
  lg: 'gap-lg',
  xl: 'gap-xl',
};

type LayoutElement = 'div' | 'section' | 'ul' | 'ol' | 'nav' | 'header' | 'footer' | 'span';

interface LayoutProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** The element (default div); ul/ol for a list, whose children are then the caller's li. */
  as?: LayoutElement;
  className?: string;
}

export interface StackProps extends LayoutProps {
  /** Space between children (default md, 24px). */
  gap?: Space;
}

/** Children one above the other, `gap` apart. They stretch to the stack's width. */
export function Stack({ as = 'div', gap = 'md', className, children, ...rest }: StackProps) {
  const El = as as ElementType;
  return (
    <El data-stack="" className={cn('flex flex-col', gapClass[gap], className)} {...rest}>
      {children}
    </El>
  );
}

export type ClusterAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
export type ClusterJustify = 'start' | 'center' | 'end' | 'between';

const alignClass: Record<ClusterAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};
const justifyClass: Record<ClusterJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export interface ClusterProps extends LayoutProps {
  /** Space between children, across and between rows (default sm, 16px). */
  gap?: Space;
  /** Cross-axis alignment within a row (default center). */
  align?: ClusterAlign;
  /** Main-axis distribution (default start). */
  justify?: ClusterJustify;
}

/** Children side by side, wrapping onto new rows when they run out of width, `gap` apart both ways. */
export function Cluster({ as = 'div', gap = 'sm', align = 'center', justify = 'start', className, children, ...rest }: ClusterProps) {
  const El = as as ElementType;
  return (
    <El data-cluster="" className={cn('flex flex-wrap', gapClass[gap], alignClass[align], justifyClass[justify], className)} {...rest}>
      {children}
    </El>
  );
}
