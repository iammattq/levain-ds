'use client';

import React, { useState, useEffect } from 'react';
import Heading from '../components/Heading';
import AsciiHeader from '../patterns/AsciiHeader';
import { cn } from '../utils/cn';

// Default wrapper that just renders children
const DefaultWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

// Define layout options
type PageLayout =
  | 'single-column'
  | 'two-column-equal'
  | 'two-column-sidebar-right'
  | 'two-column-sidebar-left';

// ASCII header text options (must match AsciiHeader component)
type AsciiTitleOption =
  | 'Matt Quinn'
  | 'Work'
  | 'Photos'
  | 'Journal'
  | 'Dashboard'
  | 'Admin'
  | 'Sign In'
  | 'Design System';
type AsciiColorVariant = 'gradient' | 'secondary';

export interface PageTemplateProps {
  /** Title for the page, rendered as an H1 */
  title: string;
  /** Main content for the page (or the first column in two-column-equal) */
  children: React.ReactNode;
  /** Content for the sidebar (only used when layout is 'two-column-sidebar-right' or 'two-column-sidebar-left') */
  sidebar?: React.ReactNode;
  /** Content for the second column (only used when layout is 'two-column-equal') */
  secondColumn?: React.ReactNode; // Optional: Added for clarity in two-column-equal
  /** Whether to constrain the page width */
  maxWidth?: boolean;
  /** Custom CSS classes to apply to the page wrapper */
  className?: string;
  /** Optional back link URL */
  backLink?: string;
  /** Optional back link title for accessibility */
  backLinkTitle?: string;
  /** Optional callback for back button (alternative to backLink, e.g. for router.back()) */
  onBackClick?: () => void;
  /** Layout structure for the content area. */
  layout?: PageLayout;
  /** Number of columns (1-5) for the sidebar in sidebar layouts. Defaults to 4. */
  sidebarColumns?: 1 | 2 | 3 | 4 | 5; // Use literal type for validation
  /** Use ASCII art header instead of regular heading */
  asciiTitle?: AsciiTitleOption;
  /** Color variant for ASCII header (defaults to 'secondary' for sub-pages) */
  asciiColorVariant?: AsciiColorVariant;
  /** Hide the title (useful when title is rendered inside content, e.g. bento grids) */
  hideTitle?: boolean;
  /** Remove padding on mobile for full-viewport content (e.g. photo galleries) */
  fullViewportMobile?: boolean;
  /** Show/hide the decorative accent bar on the heading */
  showBar?: boolean;
  /** Reduce spacing between title and content */
  compactTitle?: boolean;
  /** Optional wrapper component (e.g., for page transitions) */
  Wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Standard page template for front-end (non-admin) pages.
 * Handles different layouts including sidebars with configurable width.
 */
export const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  children, // Represents main content in sidebar layouts, first column in equal layout
  sidebar,
  secondColumn, // Added prop
  maxWidth = true,
  className = '',
  backLink,
  backLinkTitle,
  onBackClick,
  layout = 'single-column',
  sidebarColumns = 4, // Default sidebar width to 4 columns
  asciiTitle,
  asciiColorVariant = 'secondary',
  hideTitle = false,
  fullViewportMobile = false,
  showBar = true,
  compactTitle = false,
  Wrapper = DefaultWrapper,
}) => {
  const [isReady, setIsReady] = useState(false);

  // Wait for any theme application to complete before showing content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null; // Return nothing until ready to prevent flash of unstyled content
  }

  // Sanitize sidebarColumns (though the type helps) and calculate main columns
  const validSidebarColumns = Math.max(1, Math.min(5, sidebarColumns || 4)) as
    1 | 2 | 3 | 4 | 5;
  const mainColumns = 12 - validSidebarColumns;

  // Dynamic Tailwind classes for sidebar layouts
  // Note: Tailwind needs full class names, cannot construct them dynamically with variables like `lg:col-span-${validSidebarColumns}`
  // We need to map the numbers to the actual classes.
  const sidebarColClasses: { [key in 1 | 2 | 3 | 4 | 5]: string } = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
  };
  const mainColClasses: { [key in 7 | 8 | 9 | 10 | 11]: string } = {
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
  };

  const sidebarColClass = sidebarColClasses[validSidebarColumns];
  // Cast mainColumns to the correct type for the lookup
  const mainColClass = mainColClasses[mainColumns as 7 | 8 | 9 | 10 | 11];

  // Base classes for the main container
  // Note: No top padding on mobile since desktop nav is hidden on mobile
  // lg:px-9 was 36px — off the scale entirely. It snaps down to lg (32px);
  // the 4px it loses is below the threshold at which a page inset reads as
  // having changed.
  const mainClasses = cn(
    fullViewportMobile
      ? 'p-0 md:px-md md:py-lg lg:px-lg'
      : 'p-0 pb-lg sm:px-md md:py-lg lg:px-lg',
    maxWidth ? 'max-w-[var(--container-page)] mx-auto' : 'w-full',
    className
  );

  // Helper to render the title heading
  const renderHeading = (headingClassName: string = 'px-lg md:px-0') => {
    if (hideTitle) {
      return null;
    }
    if (asciiTitle) {
      return (
        <div className={cn('mb-sm md:mb-lg', headingClassName)}>
          <AsciiHeader
            text={asciiTitle}
            size="md"
            colorVariant={asciiColorVariant}
          />
        </div>
      );
    }
    return (
      <Heading
        level="h1"
        align="left"
        className={cn(
          headingClassName,
          compactTitle && '[&>h1]:mb-2xs [&>h1]:md:mb-sm'
        )}
        backLink={backLink}
        backLinkTitle={backLinkTitle}
        onBackClick={onBackClick}
        showBar={showBar}
      >
        {title}
      </Heading>
    );
  };

  // Render based on layout
  const renderContent = () => {
    switch (layout) {
      case 'two-column-sidebar-left':
        if (!sidebar) {
          console.warn(
            "PageTemplate: 'sidebar' prop is required for 'two-column-sidebar-left' layout."
          );
          // Fallback to single column maybe? Or render empty sidebar? For now, render layout but with empty sidebar.
        }
        return (
          <>
            <div className="mt-2xs gap-lg md:mt-md grid grid-cols-1 lg:grid-cols-12">
              {/* Sidebar Column - Dynamic width */}
              <aside className={sidebarColClass}>{sidebar}</aside>
              {/* Main Content Column - Dynamic width */}
              <div className={mainColClass}>
                {renderHeading('')} {/* Heading inside main column */}
                <div className="mt-md">{children}</div>{' '}
                {/* Main content below heading */}
              </div>
            </div>
          </>
        );
      case 'two-column-sidebar-right':
        if (!sidebar) {
          console.warn(
            "PageTemplate: 'sidebar' prop is required for 'two-column-sidebar-right' layout."
          );
        }
        return (
          <>
            <div className="mt-md gap-lg grid grid-cols-1 lg:grid-cols-12">
              {/* Main Content Column - Dynamic width */}
              <div className={mainColClass}>
                {renderHeading('')} {/* Heading inside main column */}
                <div className="mt-md">{children}</div>{' '}
                {/* Main content below heading */}
              </div>
              {/* Sidebar Column - Dynamic width */}
              <aside className={sidebarColClass}>{sidebar}</aside>
            </div>
          </>
        );
      case 'two-column-equal':
        if (!secondColumn) {
          console.warn(
            "PageTemplate: 'secondColumn' prop is recommended for 'two-column-equal' layout for content in the second column."
          );
        }
        return (
          <>
            {renderHeading()} {/* Heading above the grid */}
            <div className="mt-md gap-lg grid grid-cols-1 md:grid-cols-2">
              <div>{children}</div> {/* First column */}
              <div>{secondColumn}</div> {/* Second column */}
            </div>
          </>
        );
      case 'single-column':
      default:
        return (
          <>
            {renderHeading()} {/* Heading above content */}
            <div
              className={cn(
                fullViewportMobile ? 'md:mt-md' : 'mt-md',
                compactTitle && 'mt-2xs'
              )}
            >
              {children}
            </div>
          </>
        );
    }
  };

  return (
    <Wrapper>
      <main className={mainClasses}>{renderContent()}</main>
    </Wrapper>
  );
};

export default PageTemplate;
