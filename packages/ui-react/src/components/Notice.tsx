import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';

// T62: a quiet, persistent one-line message in a container, under a header: the Ringmaster board's "Offline,
// reconnecting…" and "Your idea wasn't sent: the network dropped" (its T173). Not a toast (no timer, no portal), not a
// banner across the page. The text wraps; the action and Dismiss sit at the end of the line when they fit, under the
// text when not.

export type NoticeTone = 'muted' | 'info' | 'caution' | 'error';

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  /** muted (default): the muted text on the subtle surface. info, caution, error: the status tokens' fg on their bg. */
  tone?: NoticeTone;
  /** The message. */
  children?: ReactNode;
  /** Something to do about it, at the end: a small ghost levain Button ("Retry"). Makes the Notice an alert. */
  action?: ReactNode;
  /** Shows a small ghost Dismiss button that calls this. Makes the Notice an alert. */
  onDismiss?: () => void;
  /** The Dismiss button's label. Default "Dismiss". */
  dismissLabel?: string;
  /** A decorative glyph before the message (hidden from screen readers). */
  icon?: ReactNode;
}

/** Literal per tone so Tailwind sees each class. Every tone's bg is under 3:1 against the page, so each has a border. */
const toneClass: Record<NoticeTone, string> = {
  muted:
    'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]',
  info:
    'bg-[var(--color-info-bg)] text-[var(--color-info-fg)] border-[color-mix(in_srgb,var(--color-info-fg)_30%,var(--color-info-bg))]',
  caution:
    'bg-[var(--color-caution-bg)] text-[var(--color-caution-fg)] border-[color-mix(in_srgb,var(--color-caution-fg)_30%,var(--color-caution-bg))]',
  error:
    'bg-[var(--color-error-bg)] text-[var(--color-error-fg)] border-[color-mix(in_srgb,var(--color-error-fg)_30%,var(--color-error-bg))]',
};

/** Each tone's text and background as token names, for the contrast tests. Kept beside toneClass so the two can't drift. */
export const noticeTokens: Record<NoticeTone, { fg: string; bg: string }> = {
  muted: { fg: 'text-muted', bg: 'surface-subtle' },
  info: { fg: 'info-fg', bg: 'info-bg' },
  caution: { fg: 'caution-fg', bg: 'caution-bg' },
  error: { fg: 'error-fg', bg: 'error-bg' },
};

/**
 * An inline status line: the tone's colours on a small rounded box, body-small text that wraps, an optional action and
 * Dismiss at the end. `role="status"` (polite) when it is only a message; `role="alert"` when it has an action or
 * Dismiss. Keep it mounted and change its children to announce a new message through the same region.
 */
export const Notice = forwardRef<HTMLDivElement, NoticeProps>(function Notice(
  { tone = 'muted', children, action, onDismiss, dismissLabel = 'Dismiss', icon, className, ...rest },
  ref,
) {
  const actionable = action != null || onDismiss != null;
  return (
    <div
      ref={ref}
      role={actionable ? 'alert' : 'status'}
      data-notice=""
      data-tone={tone}
      {...rest}
      className={cn(
        'flex flex-wrap items-center gap-x-sm gap-y-3xs rounded-[var(--radius-md)] border px-sm py-2xs type-body-sm',
        toneClass[tone],
        className,
      )}
    >
      <div data-notice-body="" className="flex min-w-0 flex-[1_1_12rem] items-start gap-2xs py-3xs">
        {icon && (
          <span aria-hidden="true" data-notice-icon="" className="flex shrink-0 self-center">
            {icon}
          </span>
        )}
        <div data-notice-message="" className="min-w-0">
          {children}
        </div>
      </div>
      {actionable && (
        <div data-notice-actions="" className="ml-auto flex shrink-0 items-center gap-3xs">
          {action}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {dismissLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default Notice;
