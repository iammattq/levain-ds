import type { ReactNode } from 'react';
import { CountBadge } from '../components/CountBadge';
import { cn } from '../utils/cn';

/**
 * Column (T8): a titled column of cards, ported from the Ringmaster board's desktop column (board/src/ly1/Board.tsx,
 * `Column`, and board.css's .column and .col-head).
 *
 * A rounded surface a step off the page: in dark the section surface; in light the hairline token (border-subtle),
 * since every levain light surface is lighter than the page and there is no sunken surface token yet (GAPS). Its
 * corners are the cards' radius plus 4 px.
 *
 * Header, 32 px: an optional glyph, the title (an h2), the count (a number becomes a plain CountBadge), optional marks,
 * and an action pushed to the right. Body: the children 24 px apart.
 *
 * `scroll`: the column fills the height its parent gives it and the body scrolls inside it; the header stays put. The
 * caller gives the height (a fixed height, or a flex or grid parent with a bounded height). Without `scroll` the column
 * is as tall as its cards and the page scrolls it.
 *
 * In the scrolling body the cards keep their height (they don't shrink to fit).
 *
 * Drag and drop is the caller's: put a SortableList in the children.
 */
export interface ColumnProps {
  /** The column's name: its h2, and the section's accessible name. */
  title: string;
  /** The number of cards. A number renders a plain CountBadge; pass your own element (a caution CountBadge, say) for another look. */
  count?: number | ReactNode;
  /** A glyph before the title, decorative (give it aria-hidden). */
  icon?: ReactNode;
  /** Anything after the count: small marks or tags. */
  marks?: ReactNode;
  /** A control at the header's right end. */
  action?: ReactNode;
  /** The body scrolls inside the height the caller gives; the header stays put. */
  scroll?: boolean;
  children?: ReactNode;
  /** On the column (the section). */
  className?: string;
}

export function Column({ title, count, icon, marks, action, scroll, children, className }: ColumnProps) {
  return (
    <section
      aria-label={title}
      data-column=""
      data-scroll={scroll || undefined}
      className={cn(
        'flex min-w-0 flex-col rounded-[calc(var(--radius-lg)+0.25rem)] pt-2xs text-[var(--color-text-default)]',
        'bg-[var(--color-border-subtle)] dark:bg-[var(--color-surface-section)]',
        scroll && 'h-full min-h-0 overflow-hidden',
        className,
      )}
    >
      <header data-column-head="" className="mx-xs flex h-8 shrink-0 items-center gap-2xs px-md text-sm/[1.5] font-medium">
        {icon}
        <h2 className="m-0 text-sm/[1.5] font-medium">{title}</h2>
        {typeof count === 'number' ? <CountBadge count={count} /> : count}
        {marks}
        {action && <span className="ml-auto flex items-center">{action}</span>}
      </header>
      <div
        data-column-body=""
        className={cn('flex flex-col gap-md px-xs pb-xs pt-[calc(var(--spacing-3xs)+4px)]', scroll && 'min-h-0 flex-1 overflow-y-auto overscroll-contain *:shrink-0')}
      >
        {children}
      </div>
    </section>
  );
}

export default Column;
