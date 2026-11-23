// Shared by ProgressRing and ProgressBar: the props both take, clamping, the tones' colours and the meter's ARIA.

export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';
export type ProgressTone = 'default' | 'caution' | 'danger';

export interface ProgressProps {
  /** The current amount, clamped to 0..max. */
  value: number;
  /** The full amount. Default 100. */
  max?: number;
  /** Default md. xs matches a status glyph (14px ring, 4px bar). */
  size?: ProgressSize;
  /** default draws in muted text; caution and danger use the action colours. */
  tone?: ProgressTone;
  /** Accessible name. */
  label?: string;
  /** How a screen reader reads the value, e.g. "372k of 500k". Defaults to the percentage. */
  'aria-valuetext'?: string;
  className?: string;
}

/**
 * Each tone's colour token (the fill and the bar's value text). The -fg action tokens flip per mode, so they read on
 * both light and dark surfaces.
 */
export const toneToken: Record<ProgressTone, string> = {
  default: 'text-muted',
  caution: 'caution-fg',
  danger: 'error-fg',
};
/** The same, as the text colour the fill draws in (currentColor). Literal so Tailwind sees each class. */
export const toneClass: Record<ProgressTone, string> = {
  default: 'text-[var(--color-text-muted)]',
  caution: 'text-[var(--color-caution-fg)]',
  danger: 'text-[var(--color-error-fg)]',
};

/** The track: faint, the same in every tone. */
export const trackToken = 'border-default';

/** value clamped to 0..max (max below 0 counts as 0; NaN as 0) and the filled fraction as a percentage. */
export function progress(value: number, max = 100) {
  const m = Number.isFinite(max) && max > 0 ? max : 0;
  const v = Number.isFinite(value) ? Math.min(Math.max(value, 0), m) : 0;
  return { value: v, max: m, pct: m === 0 ? 0 : (v / m) * 100 };
}

export function meterProps(p: { value: number; max: number; pct: number }, label?: string, valueText?: string) {
  return {
    role: 'meter' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': p.max,
    'aria-valuenow': p.value,
    'aria-valuetext': valueText ?? `${Math.round(p.pct)}%`,
  };
}
