import { cn } from '../utils/cn';

// T7: the number beside a column heading or on a tab, as the Ringmaster board draws it. Plain is a faint number on the
// parent's baseline; filled is the small solid pill (the Completed tab's next release). Caution turns either to the
// caution colour, for a count with something in it waiting on you.

export type CountBadgeVariant = 'plain' | 'filled';
export type CountBadgeTone = 'default' | 'caution';

export interface CountBadgeProps {
  count: number;
  /** plain (default): a faint number beside a heading. filled: a small solid pill. */
  variant?: CountBadgeVariant;
  /** caution: the caution colour (on filled, the fill). */
  tone?: CountBadgeTone;
  /** Accessible name, e.g. "3 waiting on you". Without it the number is read as it is. */
  label?: string;
  className?: string;
}

const base = 'tabular-nums';
const variantClass: Record<CountBadgeVariant, string> = {
  plain: 'inline font-normal',
  filled: 'inline-flex h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full px-[0.375rem] text-[11px] leading-none font-semibold',
};
/** Literal per variant and tone so Tailwind sees each class. */
const toneClass: Record<CountBadgeVariant, Record<CountBadgeTone, string>> = {
  plain: {
    default: 'text-[var(--color-text-faint)]',
    caution: 'text-[var(--color-caution-fg)]',
  },
  filled: {
    default: 'bg-[var(--color-text-default)] text-[var(--color-surface-canvas)]',
    caution: 'bg-[var(--color-caution-fg)] text-[var(--color-surface-canvas)]',
  },
};

/**
 * Each variant and tone's colours as token names (text, and the fill on filled), for the contrast tests. Kept beside
 * toneClass so the two can't drift: the test reads both.
 */
export const countBadgeTokens: Record<CountBadgeVariant, Record<CountBadgeTone, { fg: string; bg?: string }>> = {
  plain: { default: { fg: 'text-faint' }, caution: { fg: 'caution-fg' } },
  filled: {
    default: { fg: 'surface-canvas', bg: 'text-default' },
    caution: { fg: 'surface-canvas', bg: 'caution-fg' },
  },
};

export function CountBadge({ count, variant = 'plain', tone = 'default', label, className }: CountBadgeProps) {
  return (
    <span data-count-badge="" className={cn(base, variantClass[variant], toneClass[variant][tone], className)}>
      {label ? (
        <>
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        count
      )}
    </span>
  );
}

export default CountBadge;
