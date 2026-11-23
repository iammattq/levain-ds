import { cn } from '../utils/cn';
import { useSharedNow } from '../utils/sharedClock';
import { formatSpan } from '../utils/time';

export interface RelativeTimeProps {
  /** The moment shown: a Date, an ISO string or ms since the epoch. An unparseable one renders nothing. */
  at: Date | string | number;
  /**
   * Seconds after which the time reads late: the caution colour and `data-state="late"`. No other change of look. Past
   * 90 s the clock ticks once a minute, so the change can land up to a minute after the threshold.
   */
  warnAfter?: number;
  className?: string;
}

const toMs = (at: Date | string | number) => (at instanceof Date ? at.getTime() : typeof at === 'number' ? at : Date.parse(at));

/**
 * How long ago `at` was, in the board's format ("45s", "12m", "3h 20m", "2d"), live. Just the span: the caller writes
 * the words around it ("Asked {time} ago"). A future time reads "0s". Renders a `<time>` carrying the moment as its
 * `dateTime`, with the full date and time as its title. Every instance on the page shares one clock (see sharedClock).
 * The text changes in place; nothing animates.
 */
export function RelativeTime({ at, warnAfter, className }: RelativeTimeProps) {
  const ms = toMs(at);
  const valid = Number.isFinite(ms);
  const now = useSharedNow(valid ? ms : Number.NaN);
  if (!valid) return null;
  const age = (now - ms) / 1000;
  const late = warnAfter != null && age > warnAfter;
  const date = new Date(ms);
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}
      data-state={late ? 'late' : undefined}
      className={cn(late && 'text-[var(--color-caution-fg)]', className)}
    >
      {formatSpan(age)}
    </time>
  );
}
