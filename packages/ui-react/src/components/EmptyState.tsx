import type { HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What is (not) here: "No tasks for you right now". `children` instead, for richer content; children win. */
  message?: ReactNode;
  children?: ReactNode;
  /** Something to do about it, under the message: a levain Button, a TextLink. */
  action?: ReactNode;
  /** A decorative glyph above the message (hidden from screen readers). */
  icon?: ReactNode;
  /** The box's least height: px when a number, else any CSS length. None by default; give one card's height to hold a card's place. */
  minHeight?: number | string;
}

/**
 * Where a list or region has nothing to show: a dashed 1px outline in the emphasis border colour, the card's corner,
 * no fill or shadow, the message muted and centred, an optional action under it. The Ringmaster board's empty
 * Your work card. Plain content, not a live region: pass `role="status"` only if its appearing should be announced.
 */
export function EmptyState({ message, children, action, icon, minHeight, className, style, ...rest }: EmptyStateProps) {
  return (
    <div
      data-empty-state=""
      {...rest}
      className={
        'flex flex-col items-center justify-center gap-xs p-md text-center' +
        ' rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-emphasis)]' +
        ' type-body-sm text-[var(--color-text-muted)]' +
        (className ? ` ${className}` : '')
      }
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight, ...style }}
    >
      {icon && (
        <span aria-hidden="true" data-empty-state-icon="" className="flex">
          {icon}
        </span>
      )}
      <div data-empty-state-message="">{children ?? message}</div>
      {action && <div data-empty-state-action="">{action}</div>}
    </div>
  );
}
