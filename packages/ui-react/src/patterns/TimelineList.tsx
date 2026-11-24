import React, { type ReactNode } from 'react';
import { cn } from '../utils/cn';

/**
 * A general timeline (T9): dated entries as an ordered list, each with the subway-stop marker (a dot, and a line down
 * to the next entry). No heading: the caller puts any heading above it. Dates are strings the caller formats.
 * The career `Timeline` is built on this.
 */
export interface TimelineEntryData {
  /** React key; defaults to `${date}-${title}`. */
  key?: string;
  date: string;
  title: string;
  body?: ReactNode;
  /** Fills the dot and pulses it: the entry that is now. */
  current?: boolean;
}

interface EntryRowProps {
  date: string;
  title: string;
  body?: ReactNode;
  current?: boolean;
  /** The last entry has no line under its dot. */
  isLast?: boolean;
  className?: string;
}

/** The dot and the line under it. */
function Marker({ current, isLast }: { current: boolean; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      <div
        data-timeline-dot=""
        data-current={current ? '' : undefined}
        className={cn(
          'mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 border-[var(--color-primary)]',
          current ? 'animate-pulse bg-[var(--color-primary)]' : 'bg-[var(--color-surface-canvas)]'
        )}
      />
      {!isLast && <div data-timeline-line="" className="mt-1 w-0.5 flex-1 bg-[var(--color-primary)]" />}
    </div>
  );
}

/**
 * One entry's row: marker, then title over date, then the body. As an `li` inside TimelineList; as a `div` for the
 * career TimelineItem, which callers may render on its own.
 */
export function EntryRow({ as: Tag, date, title, body, current = false, isLast = false, className }: EntryRowProps & { as: 'li' | 'div' }) {
  return (
    <Tag className={cn('flex gap-4', className)}>
      <Marker current={current} isLast={isLast} />
      <div className="flex flex-col pb-2">
        <span className="type-label text-[var(--color-text-muted)]">{title}</span>
        <span className="type-caption-compact leading-4 text-[var(--color-text-disabled)]">{date}</span>
        {body != null && <div className="type-body-sm mt-1 text-[var(--color-text-muted)]">{body}</div>}
      </div>
    </Tag>
  );
}

/** One entry of a TimelineList. */
export function TimelineEntry(props: EntryRowProps) {
  return <EntryRow as="li" {...props} />;
}

interface TimelineListProps {
  entries: TimelineEntryData[];
  className?: string;
}

/** Dated entries, in the order given, as an ordered list. */
export function TimelineList({ entries, className }: TimelineListProps) {
  return (
    <ol className={cn('m-0 list-none p-0', className)}>
      {entries.map((e, i) => (
        <TimelineEntry
          key={e.key ?? `${e.date}-${e.title}`}
          date={e.date}
          title={e.title}
          body={e.body}
          current={e.current}
          isLast={i === entries.length - 1}
        />
      ))}
    </ol>
  );
}

export default TimelineList;
