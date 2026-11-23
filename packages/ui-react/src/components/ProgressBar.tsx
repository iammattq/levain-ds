import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { meterProps, progress, toneClass, type ProgressProps, type ProgressSize } from './progress';

export interface ProgressBarProps extends ProgressProps {
  /**
   * Shown beside the bar in tabular numerals, e.g. "372k of 500k". A string also becomes the meter's valuetext unless
   * `aria-valuetext` is given; the visible copy is hidden from assistive tech, which reads the meter instead.
   */
  valueLabel?: ReactNode;
}

/** Track height and the value text's type style, per size. xs is the board's 4px context bar. */
export const barSizes: Record<ProgressSize, { track: string; text: string; gap: string }> = {
  xs: { track: 'h-1', text: 'type-caption', gap: 'gap-2' },
  sm: { track: 'h-1.5', text: 'type-caption', gap: 'gap-2' },
  md: { track: 'h-2', text: 'type-body-sm', gap: 'gap-3' },
  lg: { track: 'h-3', text: 'type-body', gap: 'gap-3' },
};

/** A horizontal fill over a faint track, with optional value text beside it. Grows to fill its row. */
export function ProgressBar({
  value,
  max,
  size = 'md',
  tone = 'default',
  label,
  'aria-valuetext': valueText,
  valueLabel,
  className,
}: ProgressBarProps) {
  const p = progress(value, max);
  const s = barSizes[size];
  const text = valueText ?? (typeof valueLabel === 'string' ? valueLabel : undefined);
  return (
    <span
      data-size={size}
      data-tone={tone}
      className={cn('flex min-w-0 items-center', s.gap, toneClass[tone], className)}
    >
      <span
        data-part="track"
        className={cn('relative min-w-12 flex-auto overflow-hidden rounded-full bg-[var(--color-border-default)]', s.track)}
        {...meterProps(p, label, text)}
      >
        <span
          data-part="fill"
          className="absolute inset-y-0 left-0 rounded-[inherit] bg-current"
          // the motion tokens drop to 0ms under reduced motion
          style={{ width: `${p.pct}%`, transition: 'width var(--duration-travel) var(--ease-out)' }}
        />
      </span>
      {valueLabel != null && (
        <span data-part="value" aria-hidden className={cn('flex-none tabular-nums', s.text)}>
          {valueLabel}
        </span>
      )}
    </span>
  );
}
