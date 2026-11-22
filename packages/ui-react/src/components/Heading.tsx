import React from 'react';
import { cn } from '../utils/cn';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditableText } from './EditableText';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
type HeadingAlignment = 'left' | 'center' | 'right';

export interface HeadingProps {
  level: HeadingLevel;
  children: React.ReactNode;
  className?: string;
  align?: HeadingAlignment;
  backLink?: string; // Optional back link URL
  backLinkTitle?: string; // Optional back link title for accessibility
  onBackClick?: () => void; // Optional callback for back button (alternative to backLink)
  showBar?: boolean; // Add showBar prop
  inverted?: boolean; // Add inverted prop
  editable?: boolean; // Add editable prop
  onEditSave?: (value: string) => void; // Callback when editable heading is saved
  noSpacing?: boolean; // Remove default margins/padding for fine-tuning
  /**
   * Small text above the heading — a section label, a category, a kicker.
   * Adds nothing to the component when omitted.
   */
  eyebrow?: React.ReactNode;
  /**
   * Small text below the heading — a date, a byline, a count. Sits on the
   * heading's own spine rather than the accent bar's edge, and takes over the
   * heading's bottom margin so the pair reads as one block.
   * Adds nothing to the component when omitted.
   */
  caption?: React.ReactNode;
}

export default function Heading({
  level,
  children,
  className,
  align = 'left',
  backLink,
  backLinkTitle = 'Go back',
  onBackClick,
  showBar = true, // Default showBar to true
  inverted = false, // Add inverted prop with default
  editable = false, // Default editable to false
  onEditSave, // Function to call when edited content is saved
  noSpacing = false, // Default noSpacing to false
  eyebrow,
  caption,
}: HeadingProps) {
  // Define alignment classes
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  };

  // Semantic typography utilities (.type-heading-N) handle:
  // - Responsive font sizes (mobile → desktop at md breakpoint)
  // - Font weight, line-height, and letter-spacing
  const typeClasses = {
    h1: 'type-heading-1',
    h2: 'type-heading-2',
    h3: 'type-heading-3',
    h4: 'type-heading-4',
  };

  // The default spacing is kept in three parts rather than one string so an
  // eyebrow or a caption can take over the margin on its side: the small text
  // sits tight against the heading, and the block as a whole keeps the same
  // outer spacing it would have had on its own.
  const topMargin = {
    h1: 'mt-2 md:mt-0',
    h2: 'mt-2 md:mt-0',
    h3: 'mt-2 md:mt-0',
    h4: 'mt-0',
  };

  const bottomMargin = {
    h1: 'mb-4 md:mb-12',
    h2: 'mb-4 md:mb-8',
    h3: 'mb-4 md:mb-6',
    h4: 'mb-1 md:mb-2',
  };

  // Clears the accent bar. Anything meant to line up with the words rather
  // than the bar's edge needs the same inset — which is why the eyebrow and
  // caption take it too.
  const barInset = 'pl-7';

  const verticalPadding = {
    h1: 'py-3',
    h2: 'py-3',
    h3: 'py-2',
    h4: 'py-0',
  };

  /**
   * With an eyebrow or a caption the bar spans the whole block rather than
   * the heading alone.
   *
   * The bar is what marks the heading out, and the small text is part of the
   * heading — a bar that stops at the h1 puts the caption outside the thing
   * it belongs to and leaves it reading as the first line of the body copy.
   * Spanning the group is what makes the three read as one.
   */
  const barSpansGroup = Boolean(eyebrow || caption);

  /**
   * Which element owns the block's spacing moves with the bar.
   *
   * On its own the heading is the block, and carries all of it. In a group
   * the wrapper is the block: it takes the margins and the vertical padding,
   * so the padding sits inside the bar and reads the same above the heading
   * as below the caption, and the parts inside are spaced only against each
   * other.
   */
  const groupSpacing = cn(
    topMargin[level],
    bottomMargin[level],
    verticalPadding[level]
  );

  const headingSpacing = noSpacing
    ? ''
    : barSpansGroup
      ? cn(barInset, caption && 'mb-3xs')
      : cn(
          topMargin[level],
          bottomMargin[level],
          barInset,
          verticalPadding[level]
        );

  // Define accent bar width based on level
  const accentBarWidth = {
    h1: 'w-2',
    h2: 'w-1.5',
    h3: 'w-1',
    h4: 'w-0.5',
  };

  // Combine classes for the heading
  // Note: Color class must come AFTER typography utility to override in tailwind-merge
  const headingClasses = cn(
    'relative',
    typeClasses[level],
    headingSpacing,
    alignmentClasses[align],
    !showBar && !noSpacing && 'pl-0', // Override padding when bar is hidden (only if spacing is enabled)
    // Conditionally set text color based on inverted prop (last to ensure override)
    inverted
      ? 'text-[var(--color-text-inverted)]'
      : 'text-[var(--color-text-default)]'
  );

  // Dynamically create the heading element based on level
  const HeadingTag = level;

  // Handle editable text save
  const handleEditSave = (value: string) => {
    if (onEditSave) {
      onEditSave(value);
    }
  };

  // Check if editable is enabled without a save handler
  if (editable && !onEditSave) {
    console.warn(
      'Heading: editable prop is true but onEditSave is not provided. The heading will be editable but changes will not be saved.'
    );
  }

  // Extract the heading content as string if possible
  const headingContent = typeof children === 'string' ? children : '';

  // Render the heading content
  const renderHeadingContent = () => {
    if (editable && typeof children === 'string') {
      return (
        <EditableText
          value={headingContent}
          onSave={handleEditSave}
          showEditIcon={true}
          className={cn(
            'inline-block',
            inverted
              ? 'text-[var(--color-text-inverted)]'
              : 'text-[var(--color-text-default)]'
          )}
          inputClassName="bg-transparent"
          placeholder="Enter heading text..."
        />
      );
    }
    return children;
  };

  // Shared back button styles
  const backButtonClasses =
    'mr-4 flex h-[40px] w-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-section)] from-[var(--color-base)] to-[var(--color-accent)] transition-colors duration-500 hover:bg-linear-to-br';

  // Render back button (Link for backLink, button for onBackClick)
  const renderBackButton = () => {
    if (backLink) {
      return (
        <Link
          href={backLink}
          aria-label={backLinkTitle}
          className={backButtonClasses}
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-default)]" />
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
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-default)]" />
        </button>
      );
    }
    return null;
  };

  // Eyebrow and caption share everything but which margin they carry: the
  // heading's inset so they sit on its spine, its alignment, and a muted
  // caption face so neither competes with the heading itself.
  const sideTextClasses = (ownMargin: string) =>
    cn(
      'type-caption',
      !noSpacing && barInset,
      !showBar && !noSpacing && 'pl-0',
      alignmentClasses[align],
      ownMargin,
      inverted
        ? 'text-[var(--color-text-inverted)]'
        : 'text-[var(--color-text-muted)]'
    );

  const hasBackNavigation = backLink || onBackClick;

  const bar = showBar ? (
    <span
      className={cn(
        'absolute top-0 bottom-0 left-0 rounded-r-xs',
        accentBarWidth[level],
        'bg-linear-to-br from-[var(--color-base)] to-[var(--color-accent)]'
      )}
      aria-hidden="true"
    />
  ) : null;

  return (
    <div
      className={cn(
        barSpansGroup && cn('relative', !noSpacing && groupSpacing),
        className
      )}
    >
      {barSpansGroup && bar}

      {eyebrow && (
        <div className={sideTextClasses(noSpacing ? '' : 'mb-3xs')}>
          {eyebrow}
        </div>
      )}

      {hasBackNavigation ? (
        <div className="flex items-center">
          <HeadingTag className={cn(headingClasses, 'flex items-center')}>
            {renderBackButton()}
            <span className="flex">{renderHeadingContent()}</span>
            {!barSpansGroup && bar}
          </HeadingTag>
        </div>
      ) : (
        <HeadingTag className={headingClasses}>
          {renderHeadingContent()}
          {!barSpansGroup && bar}
        </HeadingTag>
      )}

      {caption && <div className={sideTextClasses('')}>{caption}</div>}
    </div>
  );
}
