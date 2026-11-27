'use client';

import { Link } from '../provider/LevainProvider';
import React from 'react';
import { cn } from '../utils/cn';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import AsciiHeader from '../patterns/AsciiHeader';
import { Button } from '../components/Button';

export interface AdminPageTemplateProps {
  /** Title for the page */
  title: string;
  /** Main content for the page */
  children: React.ReactNode;
  /** Custom CSS classes applied to the main wrapper */
  className?: string;
  /** Optional back link URL */
  backLink?: string;
  /** Optional back link title for accessibility */
  backLinkTitle?: string;
  /** Optional callback for back button (alternative to backLink) */
  onBackClick?: () => void;
  /** Actions to display in the header (buttons, etc.) */
  actions?: React.ReactNode;
  /** Status indicator to display next to the title (e.g., Tag component) */
  status?: React.ReactNode;
  /** Use ASCII art header instead of regular heading */
  asciiTitle?: string;
  /** Loading state - shows spinner instead of content */
  loading?: boolean;
  /** Error state - shows error message instead of content */
  error?: string | null;
  /** Custom loading content */
  loadingContent?: React.ReactNode;
  /** Custom error content */
  errorContent?: React.ReactNode;
}

/**
 * Admin page template with condensed header layout.
 * Title and back button on left, status and actions on right.
 * Designed for functional admin interfaces with minimal spacing.
 */
export const AdminPageTemplate: React.FC<AdminPageTemplateProps> = ({
  title,
  children,
  className = '',
  backLink,
  backLinkTitle = 'Go back',
  onBackClick,
  actions,
  status,
  asciiTitle,
  loading = false,
  error = null,
  loadingContent,
  errorContent,
}) => {
  // Shared back button styles
  const backButtonClasses =
    'mr-3 flex h-9 w-9 min-w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-section)] from-[var(--color-base)] to-[var(--color-accent)] transition-colors duration-300 hover:bg-linear-to-br';

  // Render back button
  const renderBackButton = () => {
    if (backLink) {
      return (
        <Link
          href={backLink}
          aria-label={backLinkTitle}
          className={backButtonClasses}
        >
          <ArrowLeft className="h-4 w-4 text-[var(--color-text-default)]" />
        </Link>
      );
    }
    if (onBackClick) {
      return (
        <button
          type="button"
          onClick={onBackClick}
          aria-label={backLinkTitle}
          className={backButtonClasses}
        >
          <ArrowLeft className="h-4 w-4 text-[var(--color-text-default)]" />
        </button>
      );
    }
    return null;
  };

  const hasBackNavigation = backLink || onBackClick;

  // Render title (ASCII or regular)
  const renderTitle = () => {
    if (asciiTitle) {
      return (
        <AsciiHeader text={asciiTitle} size="md" colorVariant="secondary" />
      );
    }
    return (
      <h1 className="type-heading-2 text-[var(--color-text-default)]">
        {title}
      </h1>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <main className={cn('w-full px-4 py-4 sm:px-6 md:px-9', className)}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            {hasBackNavigation && renderBackButton()}
            {renderTitle()}
          </div>
        </div>
        {loadingContent || (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
          </div>
        )}
      </main>
    );
  }

  // Render error state
  if (error) {
    return (
      <main className={cn('w-full px-4 py-4 sm:px-6 md:px-9', className)}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            {hasBackNavigation && renderBackButton()}
            {renderTitle()}
          </div>
        </div>
        {errorContent || (
          <div className="rounded-lg bg-[var(--color-surface-section)] p-12 text-center">
            <XCircle className="mx-auto h-12 w-12 text-[var(--color-error)]" />
            <p className="type-body mt-4 text-[var(--color-text-muted)]">
              {error}
            </p>
            {hasBackNavigation && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={onBackClick}
              >
                Go Back
              </Button>
            )}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={cn('w-full px-4 py-4 sm:px-6 md:px-9', className)}>
      {/* Header row: title left, status + actions right */}
      <div className="mb-6 flex items-start justify-between gap-4">
        {/* Left side: back button + title + status */}
        <div className="flex items-center gap-3">
          {hasBackNavigation && renderBackButton()}
          {renderTitle()}
          {status && <div className="flex-shrink-0">{status}</div>}
        </div>

        {/* Right side: actions */}
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </main>
  );
};

export default AdminPageTemplate;
