import { ReactNode } from 'react';
import { cn } from '../utils/cn';

// Define layout options (can be shared or defined locally)
type SectionLayout =
  'single-column' | 'two-column-equal' | 'two-column-sidebar-right';

// Inset per size, on the shared spacing scale. Values are unchanged from the
// Tailwind numeric equivalents they replace — 2xs=8px, sm=16px, md=24px,
// lg=32px, xl=48px.
const paddingSizes = {
  none: '',
  sm: 'p-2xs md:p-sm',
  md: 'p-sm md:p-lg',
  lg: 'p-md md:p-xl',
};

// Column gap, matched to the desktop inset.
//
// NOTE: gap == inset sits exactly on the internal-lte-external boundary — the
// children are as far from each other as from the section edge, which makes
// the grouping read as ambiguous. Dropping each gap one step would fix it, but
// that changes the look of every Section in every app, so it is deliberately
// left as-is pending a decision rather than changed in passing.
const gapSizes = {
  none: 'gap-0',
  sm: 'gap-sm', // Matches p-sm
  md: 'gap-lg', // Matches p-lg
  lg: 'gap-xl', // Matches p-xl
};

export interface SectionProps {
  children: ReactNode;
  className?: string;
  /** Inner padding size. Also determines the gap between columns in grid layouts. */
  padding?: keyof typeof paddingSizes;
  /** Layout structure for the content area */
  layout?: SectionLayout;
  /** Whether the top corners should be rounded. Defaults to true. */
  roundedTop?: boolean;
}

/**
 * A styled section container for grouping content, with layout options.
 */
export function Section({
  children,
  className = '',
  padding = 'md',
  layout = 'single-column',
  roundedTop = true,
}: SectionProps) {
  const paddingClass = paddingSizes[padding];
  const gapClass = gapSizes[padding]; // Get gap corresponding to padding

  // Determine layout-specific classes
  let layoutSpecificClasses = 'flex flex-col'; // Default for single-column
  if (layout === 'two-column-equal') {
    // Stacks on mobile (grid-cols-1), splits 50/50 on md+
    layoutSpecificClasses = `grid grid-cols-1 md:grid-cols-2 ${gapClass}`;
  } else if (layout === 'two-column-sidebar-right') {
    // Stacks on mobile (grid-cols-1), splits ~70/30 (8/4) on lg+
    layoutSpecificClasses = `grid grid-cols-1 lg:grid-cols-12 ${gapClass}`;
  }

  return (
    // Outer div can be used for margin, etc. via className prop
    <div className={cn(className)}>
      {/* Inner div handles background, padding, rounded corners, and layout */}
      <div
        className={cn(
          'h-full overflow-hidden rounded-b-lg bg-[var(--color-surface-section)] text-[var(--color-text-default)]', // Base styles
          roundedTop && 'rounded-t-lg', // Conditionally add top rounding
          paddingClass, // Inner padding around the content/grid
          layoutSpecificClasses // Layout structure (grid/flex + gap)
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Section;
