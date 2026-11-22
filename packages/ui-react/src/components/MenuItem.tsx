'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { LucideProps } from 'lucide-react';
import { cn } from '../utils/cn';

export type MenuItemRadius = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'full';

/**
 * Written out rather than interpolated.
 *
 * Tailwind finds candidates by scanning source text, so a template literal
 * like `rounded-[var(--radius-${radius})]` is never a candidate and generates
 * no rule. Three of the six values appeared to work only because those exact
 * strings happened to exist in unrelated files; the other three rendered
 * square.
 */
const RADIUS_CLASS: Record<MenuItemRadius, string> = {
  none: 'rounded-[var(--radius-none)]',
  xs: 'rounded-[var(--radius-xs)]',
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-[var(--radius-full)]',
};

export interface MenuItemProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'onClick'
> {
  /** The text content of the menu item. */
  children: React.ReactNode;
  /** Optional icon component (e.g., from lucide-react) to display on the left. */
  LeftIcon?: React.ElementType<LucideProps>;
  /** Optional icon component (e.g., from lucide-react) to display on the right. */
  RightIcon?: React.ElementType<LucideProps>;
  /**
   * Optional content slot on the right (e.g., action buttons). Click events are
   * isolated from MenuItem's onClick.
   *
   * Passing this keeps the item a `<div>` even with an `onClick`, since the
   * slot usually holds buttons of its own and a button cannot contain a button.
   */
  rightContent?: React.ReactNode;
  /** Whether the menu item is currently active/selected. */
  isActive?: boolean;
  /** If provided, renders the item as an internal Next.js Link. */
  href?: string;
  /**
   * Text step for the row, which icons follow unless `iconSize` overrides it.
   *
   * sm/md/lg map to label-sm, label and body. `xl` maps to heading-4, for a
   * menu that is the primary navigation of a view rather than a list of
   * secondary actions.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Corner radius, as a token step.
   *
   * Per the nested-radius rule, a row's radius is its container's radius minus
   * the inset between them — a menu on `--radius-xl` (12px) padded by
   * `--space-2xs` (8px) wants `sm` (4px). Equal radii on a parent and child
   * make the corner gap wider than the gap along the sides.
   */
  radius?: MenuItemRadius;
  /**
   * Icon scale, if it should not follow `size`.
   *
   * Text and icons do not always want the same step: body-sized rows with
   * 24px icons read as icon-led, when the icon is only an affordance. Defaults
   * to `size`.
   */
  iconSize?: 'sm' | 'md' | 'lg';
  /**
   * Stroke weight for the icons, passed through to lucide. Lucide defaults to
   * 2; a lighter value suits menus whose other rules are hairlines.
   */
  iconStrokeWidth?: number;
  /** Additional classes for the container element */
  className?: string;
  /** Handler for click events if not using href */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * A row in a menu, dropdown or sidebar.
 *
 * The rendered element follows what the item actually does, so that keyboard
 * and assistive-technology behaviour comes from the platform rather than from
 * added ARIA:
 *
 * - `href` renders an anchor via next/link
 * - `onClick` renders a real `<button>`
 * - neither (or `rightContent`, which usually contains its own buttons)
 *   renders a plain `<div>`
 *
 * Whichever element it lands on carries the styling, including the focus ring.
 * An earlier version wrapped a styled `<div>` in a bare `<a>`, which put focus
 * on the anchor while the `focus-visible` ring sat on the div — so link items
 * were focusable with no visible indicator at all.
 */
const MenuItem = forwardRef<HTMLElement, MenuItemProps>(
  (
    {
      children,
      LeftIcon,
      RightIcon,
      rightContent,
      isActive = false,
      href,
      size = 'sm',
      radius = 'md',
      iconSize: iconSizeProp,
      iconStrokeWidth,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    // xl shares lg's icon box: the text grows, but an affordance that grew
    // with it would start to lead the row.
    const iconScale = iconSizeProp ?? (size === 'xl' ? 'lg' : size);
    const iconSize = {
      'h-4 w-4': iconScale === 'sm',
      'h-5 w-5': iconScale === 'md',
      'h-6 w-6': iconScale === 'lg',
    };

    const classes = cn(
      'flex w-full items-center justify-between gap-2xs px-xs py-2xs transition-colors',
      'min-h-[2.25rem]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
      RADIUS_CLASS[radius],
      {
        'type-label-sm': size === 'sm',
        'type-label': size === 'md',
        'type-body': size === 'lg',
        'type-heading-4': size === 'xl',
      },
      // Hover recedes toward the canvas rather than climbing the ramp: menus
      // sit on `surface-section`, and dropping a rung reads as the row being
      // pressed into the surface. It must not be the surface the menu itself
      // is drawn on — hover previously used `surface-section`, the same token
      // as its own container, so it painted the background and vanished.
      isActive
        ? 'bg-[var(--color-primary)] text-[var(--color-text-inverted)]'
        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-canvas)] hover:text-[var(--color-text-default)]',
      href || onClick ? 'cursor-pointer' : 'cursor-default',
      className
    );

    const inner = (
      <>
        {/* min-w-0 so a long label can truncate rather than push the right-hand
            content out of the row.

            The icon-to-label gap is a token step rather than a raw utility,
            and one step up from the 8px it used to sit at — at the reading
            steps the two ran together. */}
        <span className="gap-xs flex min-w-0 items-center">
          {LeftIcon && (
            <span
              className={cn('flex items-center justify-center', iconSize)}
              aria-hidden="true"
            >
              <LeftIcon
                className={cn('shrink-0', iconSize)}
                strokeWidth={iconStrokeWidth}
              />
            </span>
          )}
          {/* No `leading-none` here: `truncate` brings `overflow: hidden`, and a
              line box of exactly 1em is shorter than the glyphs' ink, so
              descenders get sliced. Harmless at label sizes, obvious at
              heading steps. The type token carries its own line height. */}
          <span className="flex min-w-0 items-center">
            <span className="truncate">{children}</span>
          </span>
        </span>

        {RightIcon && (
          <span
            className={cn('flex items-center justify-center', iconSize)}
            aria-hidden="true"
          >
            <RightIcon
              className={cn(
                'shrink-0',
                iconSize,
                isActive
                  ? 'text-[var(--color-text-inverted)]'
                  : 'text-[var(--color-text-muted)]'
              )}
              strokeWidth={iconStrokeWidth}
            />
          </span>
        )}

        {rightContent && (
          <span
            className={cn(
              'flex items-center',
              isActive
                ? 'text-[var(--color-text-inverted)]'
                : 'text-[var(--color-text-muted)]'
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {rightContent}
          </span>
        )}
      </>
    );

    if (href) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          aria-current={isActive ? 'page' : undefined}
          onClick={onClick}
          {...props}
        >
          {inner}
        </Link>
      );
    }

    // A button is only safe when the row holds no interactive slot of its own.
    if (onClick && !rightContent) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={classes}
          onClick={onClick}
          {...props}
        >
          {inner}
        </button>
      );
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={classes}
        onClick={onClick}
        {...props}
      >
        {inner}
      </div>
    );
  }
);

MenuItem.displayName = 'MenuItem';

export { MenuItem };
export default MenuItem;
