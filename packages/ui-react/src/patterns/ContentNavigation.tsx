'use client';

import { Link } from '../provider/LevainProvider';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ContentItem {
  title: string;
  slug: string;
}

interface ContentNavigationProps {
  previous: ContentItem | null;
  next: ContentItem | null;
  basePath: string; // e.g., '/journal' or '/work'
  backLinkText?: string; // Optional text for back link
  mobilePosition?: 'top' | 'bottom'; // Control mobile navigation position
  displayMode?: 'all' | 'desktop-only' | 'mobile-only'; // Control which parts are displayed
  delayMs?: number; // Delay in milliseconds before showing navigation
  truncateLength?: number; // Maximum length of title before truncation with ellipsis
}

// Helper function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number | undefined): string => {
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
};

export default function ContentNavigation({
  previous,
  next,
  basePath,
  backLinkText,
  mobilePosition = 'bottom',
  displayMode = 'all',
  delayMs = 600, // Default delay of 600ms to allow page transition to complete
  truncateLength,
}: ContentNavigationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    // Wait for page transition to complete before showing navigation
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);

      // Set animation state after a small delay to ensure the CSS transition works
      const animationTimer = setTimeout(() => {
        setHasAnimated(true);
      }, 50);

      return () => clearTimeout(animationTimer);
    }, delayMs);

    return () => clearTimeout(visibilityTimer);
  }, [delayMs]);

  if (!isVisible) return null;

  return (
    <>
      {/* Desktop sticky navigation (fixed to sides) - always visible */}
      {(displayMode === 'all' || displayMode === 'desktop-only') && (
        <div className="hidden lg:block">
          {/* Previous entry - left side */}
          {previous && (
            <Link
              href={`${basePath}/${previous.slug}`}
              onClick={scrollToTop}
              className={`group fixed top-1/2 left-8 z-40 flex -translate-y-1/2 items-center ${hasAnimated ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
              aria-label={`Previous: ${previous.title}`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-card)] shadow-2xl transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-text-on-accent)]">
                <ChevronLeft className="h-5 w-5" />
              </div>
              <span className="type-label ml-3 flex h-11 -translate-x-2 items-center rounded-full bg-[var(--color-accent)] px-4 font-bold text-[var(--color-text-on-accent)] opacity-0 shadow-2xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                {truncateText(previous.title, truncateLength)}
              </span>
            </Link>
          )}

          {/* Next entry - right side */}
          {next && (
            <Link
              href={`${basePath}/${next.slug}`}
              onClick={scrollToTop}
              className={`group fixed top-1/2 right-8 z-40 flex -translate-y-1/2 items-center ${hasAnimated ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
              aria-label={`Next: ${next.title}`}
            >
              <span className="type-label mr-3 flex h-11 translate-x-2 items-center rounded-full bg-[var(--color-accent)] px-4 font-bold text-[var(--color-text-on-accent)] opacity-0 shadow-2xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                {truncateText(next.title, truncateLength)}
              </span>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-card)] shadow-2xl transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-text-on-accent)]">
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Mobile and tablet navigation (bottom of page by default) */}
      {(displayMode === 'all' || displayMode === 'mobile-only') && (
        <div
          className={`lg:hidden ${mobilePosition === 'bottom' ? 'mt-16' : ''} ${hasAnimated ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        >
          <div className="flex flex-row items-start justify-between gap-4 md:items-start">
            {previous ? (
              <Link
                href={`${basePath}/${previous.slug}`}
                onClick={scrollToTop}
                className="group flex flex-col gap-4"
              >
                <div className="mr-3 h-12 w-12 rounded-full bg-[var(--color-surface-section)] p-3 transition-colors group-hover:bg-[var(--color-accent)]">
                  <ChevronLeft className="h-6 w-6" />
                </div>
                <span className="type-label-sm max-w-[80px] overflow-hidden text-ellipsis">
                  {truncateText(previous.title, truncateLength || 30)}
                </span>
              </Link>
            ) : (
              <div className="w-12"></div>
            )}

            {next ? (
              <Link
                href={`${basePath}/${next.slug}`}
                onClick={scrollToTop}
                className="group flex flex-col items-end justify-end gap-4"
              >
                <div className="h-12 w-12 rounded-full bg-[var(--color-surface-section)] p-3 transition-colors group-hover:bg-[var(--color-accent)]">
                  <ChevronRight className="h-6 w-6" />
                </div>
                <span className="type-label-sm max-w-[80px] overflow-hidden text-right text-ellipsis">
                  {truncateText(next.title, truncateLength || 30)}
                </span>
              </Link>
            ) : (
              <div className="w-12"></div>
            )}
          </div>

          {/* Optional Back link */}
          {backLinkText && (
            <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-8">
              <Link
                href={basePath}
                onClick={scrollToTop}
                className="inline-flex items-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {truncateText(backLinkText, truncateLength)}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
