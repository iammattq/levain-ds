'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '../components/Button';

export interface ToolAppShellProps {
  /** Title displayed in the header */
  title: string;
  /** Content to render inside the shell */
  children: React.ReactNode;
  /** Optional ID for aria-labelledby (defaults to generated ID) */
  titleId?: string;
  /** Optional actions to render in the header (between title and close button) */
  headerActions?: React.ReactNode;
  /** Hide header actions and close button with fade animation */
  hideHeaderActions?: boolean;
}

/**
 * ToolAppShell - Fullscreen overlay shell for design-system tool pages
 *
 * Replaces PageTemplate for design-system tools, providing:
 * - Fullscreen with m-4 inset and gradient border
 * - Focus trap (Tab/Shift+Tab cycling)
 * - Escape key to close with focus restoration
 * - Mobile message for screens < 1024px
 */
export function ToolAppShell({
  title,
  children,
  titleId: customTitleId,
  headerActions,
  hideHeaderActions = false,
}: ToolAppShellProps) {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId =
    customTitleId ||
    `tool-shell-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

  // Check if view transitions are supported - disable framer-motion if so
  const [supportsViewTransitions, setSupportsViewTransitions] = useState(false);
  useEffect(() => {
    setSupportsViewTransitions('startViewTransition' in document);
  }, []);

  // Store the previously focused element on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the shell on mount
    shellRef.current?.focus();

    return () => {
      // Restore focus on unmount
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleClose = useCallback(() => {
    const navigate = () => {
      // Check if we have navigation history
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/design-system');
      }
    };

    // Helper to cleanup transition state
    const cleanup = () => {
      document.documentElement.classList.remove('tool-closing');
      const style = document.getElementById('tool-transition-origin');
      if (style) style.remove();
    };

    // Check for reduced motion preference (guard against environments without matchMedia)
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Wrap in view transition if supported and user doesn't prefer reduced motion
    if (supportsViewTransitions && !prefersReducedMotion) {
      // Get stored card position for transform-origin
      const storedOrigin = sessionStorage.getItem('tool-origin');
      if (storedOrigin) {
        try {
          const { x, y } = JSON.parse(storedOrigin);
          const style = document.createElement('style');
          style.id = 'tool-transition-origin';
          style.textContent = `
            ::view-transition-old(root) {
              transform-origin: ${x}px ${y}px !important;
            }
          `;
          document.head.appendChild(style);
        } catch {
          // Invalid JSON in sessionStorage, ignore
        }
        sessionStorage.removeItem('tool-origin');
      }

      document.documentElement.classList.add('tool-closing');

      // Type assertion for startViewTransition
      const transition = (
        document as {
          startViewTransition?: (cb: () => void) => { finished: Promise<void> };
        }
      ).startViewTransition!(navigate);

      transition.finished.then(cleanup).catch(cleanup); // Cleanup even on error/abort
    } else {
      navigate();
    }
  }, [router, supportsViewTransitions]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Focus trap
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Get all focusable elements within the shell
      const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusableElements =
        shell.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-50 m-4 flex flex-col overflow-hidden rounded-lg outline-none"
      style={{
        background: `
          linear-gradient(var(--color-surface-section), var(--color-surface-section)) padding-box,
          linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end)) border-box
        `,
        border: '1px solid transparent',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      {/* Mobile message - shown on screens < 1024px */}
      <div className="flex h-full flex-col items-center justify-center p-8 text-center lg:hidden">
        <p className="type-body text-[var(--color-text-muted)]">
          This tool works best on larger screens.
        </p>
        <Button onClick={handleClose} variant="outline" className="mt-4">
          Back to Design System
        </Button>
      </div>

      {/* Desktop content - hidden on screens < 1024px */}
      <div className="hidden h-full flex-col lg:flex">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-3">
          <h1
            id={titleId}
            className="type-heading-4 text-[var(--color-text-emphasis)]"
          >
            {title}
          </h1>
          <div
            className="flex items-center gap-2 transition-opacity duration-150"
            style={{
              opacity: hideHeaderActions ? 0 : 1,
              pointerEvents: hideHeaderActions ? 'none' : 'auto',
            }}
          >
            {headerActions}
            {headerActions && <div className="w-2" />}
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Content area - min-h-0 enables flex children to shrink below content size, relative for nested overlays */}
        <div className="scrollbar-thin relative min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
